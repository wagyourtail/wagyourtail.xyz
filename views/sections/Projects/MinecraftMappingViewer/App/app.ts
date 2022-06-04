import * as jsz from "jszip";
import { JSZipObject } from "jszip";

export = 0;

declare const JSZip: jsz;

declare const versionSelect: HTMLSelectElement;
declare const showSnapshots: HTMLInputElement;
declare const searchInput: HTMLInputElement;
declare const loadingProfiler: HTMLParagraphElement;
declare const mojangConfirmPrompt: HTMLDivElement;
declare const loading: HTMLElement;
declare const results: HTMLElement;
declare const mojangMappingCheck: HTMLInputElement;
declare const srgMappingCheck: HTMLInputElement;
declare const mcpMappingCheck: HTMLInputElement;
declare const yarnIntermediaryMappingCheck: HTMLInputElement;
declare const yarnMappingCheck: HTMLInputElement;
declare const hashedMojmapCheck: HTMLInputElement;
declare const quiltMappingCheck: HTMLInputElement;
declare const spigotMappingCheck: HTMLInputElement;
declare const yarnVersionSelect: HTMLSelectElement;
declare const mcpVersionSelect: HTMLSelectElement;
declare const quiltVersionSelect: HTMLSelectElement;
declare const searchType: HTMLSelectElement;
declare const classTableHead: HTMLTableElement;
declare const methodTableHead: HTMLTableElement;
declare const fieldTableHead: HTMLTableElement;
declare const paramsTableHead: HTMLTableElement;
declare const classes: HTMLTableElement;
declare const method: HTMLTableElement;
declare const fields: HTMLTableElement;
declare const params: HTMLTableElement;
declare const ClassTable: HTMLTableElement;
declare const MethodTable: HTMLTableElement;
declare const ParamsTable: HTMLTableElement;
declare const FieldTable: HTMLTableElement;
declare const versionData: HTMLParagraphElement;
declare const commentHolder: HTMLDivElement;
declare const parchmentVersionSelect: HTMLSelectElement;
declare const parchmentMappingCheck: HTMLInputElement;
declare const mojangSignatureCheck: HTMLInputElement;
declare const srgSignatureCheck: HTMLInputElement;
declare const mcpSignatureCheck: HTMLInputElement;
declare const yarnIntermediarySignatureCheck: HTMLInputElement;
declare const yarnSignatureCheck: HTMLInputElement;
declare const hashedMojmapSignatureCheck: HTMLInputElement;
declare const quiltSignatureCheck: HTMLInputElement;
declare const spigotSignatureCheck: HTMLInputElement;
declare const settingsBtn: HTMLDivElement;
declare const closeSettings: HTMLDivElement;
declare const settings: HTMLDivElement;
declare const mojangConfirm: HTMLDivElement;
declare const mojangDeny: HTMLDivElement;
declare const searchButton: HTMLDivElement;
declare const resultsTable: HTMLDivElement;
declare const importPop: HTMLDivElement;
declare const exportPop: HTMLDivElement;
declare const importBtn: HTMLDivElement;
declare const exportBtn: HTMLDivElement;
declare const topbar: HTMLDivElement;
declare const confirmImport: HTMLDivElement;
declare const confirmExportTiny: HTMLDivElement;
declare const closeImport: HTMLDivElement;
declare const closeExport: HTMLDivElement;
declare const yarnImport: HTMLInputElement;
declare const mojmapImport: HTMLInputElement;
declare const intermediaryImport: HTMLInputElement;
declare const parchmentImport: HTMLInputElement;
declare const srgImport: HTMLInputElement;
declare const mcpImport: HTMLInputElement;
declare const hashedImport: HTMLInputElement;
declare const quiltImport: HTMLInputElement;
declare const spigotImport: HTMLInputElement;
declare const customMappingImportFile: HTMLInputElement;
declare const exportFrom: HTMLSelectElement;
declare const exportToClass: HTMLSelectElement;
declare const exportToContent: HTMLSelectElement;
declare const exportToMeta: HTMLSelectElement;
declare const exportFromName: HTMLInputElement;
declare const exportToName: HTMLInputElement;
declare const fallbackToOBF: HTMLInputElement;


let confirmMojang: boolean = false;

let worker = new Worker("./worker.js");

worker.onmessage = async (e) => {
    const { data } = e;
    console.debug("s2c", data.type);
    switch (data.type) {
        case "profiler":
            profiler(data.message);
            break;
        case "profilerDel":
            profilerDel(data.message);
            break;
        case "manifests":
            onManifests(data.manifests);
            break;
        case "noManifests":
            await onNoManifests(data.manifests);
            break;
        case "mojmapLoaded":
            await onMojmapLoaded();
            break;
        case "loadedMappings":
            await onLoadedMappingsUpdate(data.mappings);
            break;
        case "searchResults":
            await onSearchResults(data.results, data.enabled, data.value);
            break;
        case "export":
            onExportedMappings(data.results);
            break;
        case "importMappingsDone":
            await onImportMappingsDone(data.target);
            break;
        case "classData":
            await onClassData(data.classData, data.methods, data.fields, data.enabledMappings);
            break;
        default:
            console.error("C Unknown message type: " + data.type);
    }
}


type ReleaseVersion = `${number}.${number}` | `${number}.${number}.${number}`;
type Snapshot = `${number}w${number}${"a"|"b"|"c"|"d"|"e"}` | `${ReleaseVersion}-pre${number}` | `${ReleaseVersion}-rc${number}`;
type MCVersionSlug =  ReleaseVersion | Snapshot;

enum MappingTypes {
    OBF,
    MOJMAP, PARCHMENT,
    SRG, MCP,
    INTERMEDIARY, YARN,
    HASHED, QUILT,
    SPIGOT
}

interface Manifests {
    mcManifest: Manifests.MCVersionManifest
    yarnManifest: Manifests.YarnVersionManifest
    mcpManifest: Manifests.MCPVersionManifest
    parchmentNoManifest: Manifests.ParchmentNoManifest
    hashedMojmapManifest: Manifests.HashedMojmapManifest
    quiltManifest: Manifests.QuiltManifest
    spigotNoManifest: Manifests.SpigotNoManifest
}

namespace Manifests {
    export interface ParchmentNoManifest {
        [mcversion: string]: string[]
    }

    export type HashedMojmapManifest = Set<string>;

    export interface QuiltManifest {
        [mcversion: string]: number[]
    }

    export interface MCVersionManifest {
        latest: {
            release: ReleaseVersion,
            snapshot: Snapshot
        },
        versions: {
            id: MCVersionSlug,
            type: "release" | "snapshot",
            url: string,
            time: string,
            releaseTime: string
        }[]
    }

    export interface YarnVersionManifest {
        [mcversion: string]: number[]
    }

    export interface MCPVersionManifest {
        [mcversion: string]: {
            snapshot: number[],
            stable?: number[]
        } | undefined
    }

    export interface SpigotNoManifest {
        [mcversion: string]: string | null
    }
}

let manifests: Manifests;

function profiler(text: string) {
    const cont = document.createElement("div")
    cont.innerHTML = text;
    loadingProfiler.appendChild(cont);
}

function profilerDel(text: string) {
    // @ts-ignore
    for (const child of loadingProfiler.children) {
        if (child.innerHTML == text) {
            loadingProfiler.removeChild(child);
            break;
        }
    }
}

function onManifests(manifestData: Manifests) {
    // MC VERSIONS
    manifests = manifestData;
    //add versions to drop-down
    for (const version of manifests.mcManifest.versions) {
        const option = document.createElement("option");
        option.value = option.innerHTML = version.id;
        if (version.type === "snapshot") {
            option.classList.add("MCSnapshot");
            if (!showSnapshots.checked) {
                option.setAttribute("hidden", "");
            }
        } else {
            option.classList.add("MCRelease");
        }
        versionSelect.appendChild(option);
    }

    //set default from localStorage if exists
    const prev = localStorage.getItem("versionSelect.value");
    if (prev && Array.from(versionSelect.options).map(e => e.value).includes(prev)) {
        versionSelect.value = prev;
    } else {
        localStorage.setItem("versionSelect.value", versionSelect.value);
    }

    const rawParams = window.location.search?.substring(1);
    if (rawParams) {
        const params = new Map(<[string, string][]>window.location.search.substring(1).split("&").map(e => e.split("=", 2)));
        if (params.has("mapping")) {
            for (const map of params.get("mapping")?.split(",") ?? []) {
                switch (map.trim()) {
                    case MappingTypes[MappingTypes.SRG]:
                        srgMappingCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.MCP]:
                        mcpMappingCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.MOJMAP]:
                        mojangMappingCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.INTERMEDIARY]:
                        yarnIntermediaryMappingCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.YARN]:
                        yarnMappingCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.HASHED]:
                        hashedMojmapCheck.checked = true;
                        break;
                    case MappingTypes[MappingTypes.QUILT]:
                        quiltMappingCheck.checked = true;
                        break;
                }
            }
        }
        if (params.has("search")) {
            searchInput.value = <string>params.get("search");
        }
        if (params.has("version")) {
            versionSelect.value = <string>params.get("version");
        }
    }

    sendVersion(<MCVersionSlug>versionSelect.value);
}

async function onNoManifests(manifestData: Manifests) {
    manifests = manifestData;

    await updateAvailableVersionsDropdown(<MCVersionSlug>versionSelect.value);

    const mcversion = <MCVersionSlug>versionSelect.value;
    versionData.innerHTML = mcversion + ": " + (await getEnabledMappings(mcversion)).map(e => {
        if (e == MappingTypes.PARCHMENT) {
            return `${MappingTypes[e]} (${parchmentVersionSelect.value})`;
        }
        if (e == MappingTypes.MCP) {
            return `${MappingTypes[e]} (${mcpVersionSelect.value})`;
        }
        if (e == MappingTypes.YARN) {
            return `${MappingTypes[e]} (build.${yarnVersionSelect.value})`;
        }
        if (e == MappingTypes.QUILT) {
            return `${MappingTypes[e]} (build.${quiltVersionSelect.value})`;
        }
        return MappingTypes[e];
    }).join(" | ");

    await sendEnabled();
}

async function updateAvailableVersionsDropdown(mcversion: MCVersionSlug) {
    //MCP
    mcpVersionSelect.innerHTML = "";
    for (const version of manifests.mcpManifest[mcversion]?.stable ?? []) {
        const option = document.createElement("option");
        option.innerHTML = option.value = `stable-${version}`;
        mcpVersionSelect.appendChild(option);
    }

    for (const version of manifests.mcpManifest[mcversion]?.snapshot ?? []) {
        const option = document.createElement("option");
        option.innerHTML = option.value = `snapshot-${version}`;
        mcpVersionSelect.appendChild(option);
    }
    const mcpOption = document.createElement("option");
    mcpOption.setAttribute("hidden", "");
    mcpOption.innerHTML = mcpOption.value = "CUSTOM";
    mcpVersionSelect.appendChild(mcpOption);

    //YARN
    yarnVersionSelect.innerHTML = "";

    for (const version of manifests.yarnManifest[mcversion]?.reverse() ?? []) {
        const option = document.createElement("option");
        option.value = version.toString();
        option.innerHTML = `build.${version}`;
        yarnVersionSelect.appendChild(option);
    }
    const yarnOption = document.createElement("option");
    yarnOption.setAttribute("hidden", "");
    yarnOption.innerHTML = yarnOption.value = "CUSTOM";
    yarnVersionSelect.appendChild(yarnOption);

    //PARCHMENT
    parchmentVersionSelect.innerHTML = "";
    for (const version of manifests.parchmentNoManifest[mcversion]?.sort().reverse() ?? []) {
        const option = document.createElement("option");
        option.value = version;
        option.innerHTML = version;
        parchmentVersionSelect.appendChild(option);
    }
    const parchmentOption = document.createElement("option");
    parchmentOption.setAttribute("hidden", "");
    parchmentOption.innerHTML = parchmentOption.value = "CUSTOM";
    parchmentVersionSelect.appendChild(parchmentOption);

    // QUILT
    quiltVersionSelect.innerHTML = "";
    for (const version of manifests.quiltManifest[mcversion]?.reverse() ?? []) {
        const option = document.createElement("option");
        option.value = version.toString();
        option.innerHTML = `build.${version}`;
        quiltVersionSelect.appendChild(option);
    }
    const quiltOption = document.createElement("option");
    quiltOption.setAttribute("hidden", "");
    quiltOption.innerHTML = quiltOption.value = "CUSTOM";
    quiltVersionSelect.appendChild(quiltOption);
}

function selectVersion(version: MCVersionSlug) {
    //TODO
}


//show user data shit
function setLoading(bool: boolean) {
    return new Promise<void>((res, rej) => {
        profiler("Page Rendering");
        if (bool) {
            // @ts-ignore
            loading.style.display = null;
            results.style.visibility = "hidden";
        } else {
            loading.style.display = "none";
            results.style.visibility = "visible";
        }
        setTimeout(() => {
            profilerDel("Page Rendering");
            res();
        }, 0);
    });
}

function mcVersionCompare(a: MCVersionSlug, b: MCVersionSlug) {
    if (a === b) return 0;
    for (const e of manifests.mcManifest.versions) {
        if (e.id === a) return 1;
        if (e.id === b) return -1;
    }
    throw Error("MC version not in list.");
}

async function getEnabledMappings(mcVersion: MCVersionSlug): Promise<MappingTypes[]> {
    const checked: MappingTypes[] = [];

    if (mcVersionCompare(mcVersion, "1.14.4") != -1) {
        mojangMappingCheck.disabled = false;
        if (mojangMappingCheck.checked) {
            checked.push(MappingTypes.MOJMAP);
        }
    } else {
        mojangMappingCheck.disabled = true;
    }

    if (manifests.parchmentNoManifest[mcVersion]?.length) {
        parchmentMappingCheck.disabled = false;
        // @ts-ignore
        parchmentVersionSelect.style.visibility = null;
        if (parchmentMappingCheck.checked) {
            checked.push(MappingTypes.PARCHMENT);
        }
    } else {
        parchmentMappingCheck.disabled = true;
        parchmentVersionSelect.style.visibility = "hidden";
    }

    if (mcVersion in manifests.yarnManifest) {
        yarnIntermediaryMappingCheck.disabled = false;
        if (yarnIntermediaryMappingCheck.checked) {
            checked.push(MappingTypes.INTERMEDIARY);
        }
    } else {
        yarnIntermediaryMappingCheck.disabled = true;
    }

    if (mcVersion in manifests.yarnManifest && manifests.yarnManifest[mcVersion].length) {
        yarnMappingCheck.disabled = false;
        // @ts-ignore
        yarnVersionSelect.style.visibility = null;
        if (yarnMappingCheck.checked) {
            checked.push(MappingTypes.YARN);
        }
    } else {
        yarnMappingCheck.disabled = true;
        yarnVersionSelect.style.visibility = "hidden";
    }

    if (mcVersion in manifests.mcpManifest) {
        srgMappingCheck.disabled = false;
        if (srgMappingCheck.checked) {
            checked.push(MappingTypes.SRG);
        }
    } else {
        srgMappingCheck.disabled = true;
    }

    if (manifests.mcpManifest[mcVersion]) {
        mcpMappingCheck.disabled = false;
        // @ts-ignore
        mcpVersionSelect.style.visibility = null;
        if (mcpMappingCheck.checked) {
            checked.push(MappingTypes.MCP);
        }
    } else {
        mcpMappingCheck.disabled = true;
        mcpVersionSelect.style.visibility = "hidden";
    }

    if (manifests.hashedMojmapManifest.has(mcVersion)) {
        hashedMojmapCheck.disabled = false;
        if (hashedMojmapCheck.checked) {
            checked.push(MappingTypes.HASHED);
        }
    } else {
        hashedMojmapCheck.disabled = true;
    }

    if (mcVersion in manifests.quiltManifest) {
        quiltMappingCheck.disabled = false;
        // @ts-ignore
        quiltVersionSelect.style.visibility = null;
        if (quiltMappingCheck.checked) {
            checked.push(MappingTypes.QUILT);
        }
    } else {
        quiltMappingCheck.disabled = true;
        quiltVersionSelect.style.visibility = "hidden";
    }

    if (manifests.spigotNoManifest[mcVersion]) {
        spigotMappingCheck.disabled = false;
        if (spigotMappingCheck.checked) {
            checked.push(MappingTypes.SPIGOT);
        }
    } else {
        spigotMappingCheck.disabled = true;
    }
    return checked;
}

enum SearchType {
    KEYWORD, CLASS, METHOD, FIELD
}

async function setTopbars(enabled: MappingTypes[]) {
    profiler("Updating Table Headers");

    //class
    {
        classTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        classTableHead.appendChild(obf);

        if (enabled.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            classTableHead.appendChild(mojang);
        }

        if (enabled.includes(MappingTypes.SRG) || enabled.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("th");
            const text = [];
            if (enabled.includes(MappingTypes.SRG))
                text.push("SRG");
            if (enabled.includes(MappingTypes.MCP))
                text.push("MCP");
            mcp.innerHTML = text.join("/");
            classTableHead.appendChild(mcp);
        }

        if (enabled.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            classTableHead.appendChild(yarnIntermediary);
        }

        if (enabled.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
            classTableHead.appendChild(yarn);
        }

        if (enabled.includes(MappingTypes.HASHED)) {
            const hashed = document.createElement("th");
            hashed.innerHTML = "Hashed Mojmap";
            classTableHead.appendChild(hashed);
        }

        if (enabled.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("th");
            quilt.innerHTML = "Quilt";
            classTableHead.appendChild(quilt);
        }

        if (enabled.includes(MappingTypes.SPIGOT)) {
            const spigot = document.createElement("th");
            spigot.innerHTML = "Spigot";
            classTableHead.appendChild(spigot);
        }
    }

    //method
    {
        methodTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        methodTableHead.appendChild(obf);

        if (enabled.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            methodTableHead.appendChild(mojang);
        }


        if (enabled.includes(MappingTypes.SRG)) {
            const srg = document.createElement("th");
            srg.innerHTML = "SRG";
            methodTableHead.appendChild(srg);
        }

        if (enabled.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            methodTableHead.appendChild(mcp);
        }

        if (enabled.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            methodTableHead.appendChild(yarnIntermediary);
        }

        if (enabled.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
            methodTableHead.appendChild(yarn);
        }

        if (enabled.includes(MappingTypes.HASHED)) {
            const hashed = document.createElement("th");
            hashed.innerHTML = "Hashed Mojmap";
            methodTableHead.appendChild(hashed);
        }

        if (enabled.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("th");
            quilt.innerHTML = "Quilt";
            methodTableHead.appendChild(quilt);
        }

        if (enabled.includes(MappingTypes.SPIGOT)) {
            const spigot = document.createElement("th");
            spigot.innerHTML = "Spigot";
            methodTableHead.appendChild(spigot);
        }
    }

    //field
    {
        fieldTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        fieldTableHead.appendChild(obf);

        if (enabled.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            fieldTableHead.appendChild(mojang);
        }


        if (enabled.includes(MappingTypes.SRG)) {
            const srg = document.createElement("th");
            srg.innerHTML = "SRG";
            fieldTableHead.appendChild(srg);
        }

        if (enabled.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            fieldTableHead.appendChild(mcp);
        }

        if (enabled.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            fieldTableHead.appendChild(yarnIntermediary);
        }

        if (enabled.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
            fieldTableHead.appendChild(yarn);
        }

        if (enabled.includes(MappingTypes.HASHED)) {
            const hashed = document.createElement("th");
            hashed.innerHTML = "Hashed Mojmap";
            fieldTableHead.appendChild(hashed);
        }

        if (enabled.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("th");
            quilt.innerHTML = "Quilt";
            fieldTableHead.appendChild(quilt);
        }

        if (enabled.includes(MappingTypes.SPIGOT)) {
            const spigot = document.createElement("th");
            spigot.innerHTML = "Spigot";
            fieldTableHead.appendChild(spigot);
        }
    }

    //params
    {
        paramsTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "#";
        paramsTableHead.appendChild(obf);

        if (enabled.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            paramsTableHead.appendChild(mcp);
        }

        if (enabled.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
            paramsTableHead.appendChild(yarn);
        }

        if (enabled.includes(MappingTypes.PARCHMENT)) {
            const parchment = document.createElement("th");
            parchment.innerHTML = "Parchment";
            paramsTableHead.appendChild(parchment);
        }

        if (enabled.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("th");
            quilt.innerHTML = "Quilt";
            paramsTableHead.appendChild(quilt);
        }
    }

    buildResize(classes);
    buildResize(method);
    buildResize(params);
    buildResize(fields);

    profilerDel("Updating Table Headers");
}

function buildResize(table: HTMLTableElement) {
    // Query all headers
    const cols = table.querySelectorAll('th');

    // Loop over them
    Array.from(cols).forEach((col) => {
        // Create a resizer element
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');

        // Set the height
        resizer.style.height = `${table.offsetHeight}px`;

        // Add a resizer element to the column
        col.appendChild(resizer);

        // Will be implemented in the next section
        createResizableColumn(col, resizer);
    });
}

function createResizableColumn(col: HTMLTableHeaderCellElement, resizer: HTMLDivElement) {
    // Track the current position of mouse
    let x = 0;
    let w = 0;

    const mouseDownHandler = function(e: MouseEvent) {
        // Get the current mouse position
        x = e.clientX;

        // Calculate the current width of column
        const styles = window.getComputedStyle(col);
        w = parseInt(styles.width, 10);

        // Attach listeners for document's events
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = (e: MouseEvent) => {
        // Determine how far the mouse has been moved
        const dx = e.clientX - x;

        // Update the width of column
        col.style.width = `${w + dx}px`;
    };

    // When user releases the mouse, remove the existing event listeners
    const mouseUpHandler = function() {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
}

async function search(value: string, type: SearchType) {
    setLoading(true);
    const enabledMappings = await getEnabledMappings(<MCVersionSlug>versionSelect.value);
    setTopbars(enabledMappings);

    //clear all tables
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    window.history.replaceState({}, '', `${window.location.href.split('?')[0]}?version=${versionSelect.value}&mapping=${enabledMappings.map(e => MappingTypes[e]).join(",")}&search=${value}`);

    sendSearch(value, type);
}

async function sendSearch(value: string, type: SearchType) {
    worker.postMessage({ type: "search", value: value, sType: type });
}


async function sendVersion(mcversion: MCVersionSlug) {
    const version = <MCVersionSlug>versionSelect.value;
    worker.postMessage({ type: "version", version: version });
}

async function sendEnabled() {
    const enabled = await getEnabledMappings(<MCVersionSlug>versionSelect.value);
    const mcpVersion = mcpVersionSelect.value;
    const yarnVersion = yarnVersionSelect.value;
    const parchmentVersion = parchmentVersionSelect.value;
    const quiltVersion = quiltVersionSelect.value;
worker.postMessage({ type: "enabled", enabled: enabled, mcpVersion: mcpVersion, yarnVersion: yarnVersion, parchmentVersion: parchmentVersion, quiltVersion: quiltVersion });
}

interface ClassMappings {
    readonly mcversion: MCVersionSlug;
    readonly loadedMappings: Set<MappingTypes>;

    readonly classes: Map<string, ClassData>;
    readonly srgFields: Map<string, FieldData[]>;
    readonly srgMethods: Map<string, MethodData[]>;

    loadedMCPVersion: null | [string, string];
    loadedYarnVersion: null | string;
}
interface AbstractData {
    readonly classMappings: ClassMappings;
    readonly obfName: string;
    readonly mappings: Map<MappingTypes, string>;
    readonly comments: Map<MappingTypes, string>;
}

interface ClassItem extends AbstractData {
}

interface MethodData extends ClassItem {
    readonly params: Map<MappingTypes, Map<number, string>>;

}

interface FieldData extends ClassItem {

}

interface ClassData extends AbstractData {
    fields: Map<string, FieldData>;
    methods: Map<string, MethodData>;
}

async function onSearchResults(classes: ClassData[], enabledMappings: MappingTypes[], searchValue: string) {
    for (const clz of classes) {
        await addClass(clz, enabledMappings, searchValue);
    }
    setLoading(false);
}

let selectedClass: HTMLTableRowElement | null = null;

async function addClass(classData: ClassData, enabledMappings: MappingTypes[], searchValue: string) {
    const row = document.createElement("tr");
    const obf = document.createElement("td");
    obf.innerHTML = classData.obfName;

    row.classList.add("ClassRow");
    row.appendChild(obf);

    if (enabledMappings.includes(MappingTypes.MOJMAP)) {
        const mojang = document.createElement("td");
        mojang.innerHTML = classData.mappings.get(MappingTypes.MOJMAP) ?? "-";

        row.appendChild(mojang);
    }

    if (enabledMappings.includes(MappingTypes.SRG) || enabledMappings.includes(MappingTypes.MCP)) {
        const mcp = document.createElement("td");
        mcp.innerHTML = classData.mappings.get(MappingTypes.SRG) ?? "-";

        row.appendChild(mcp);
    }

    if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
        const yarnIntermediary = document.createElement("td");
        yarnIntermediary.innerHTML = classData.mappings.get(MappingTypes.INTERMEDIARY) ?? "-";
        row.appendChild(yarnIntermediary);
    }

    if (enabledMappings.includes(MappingTypes.YARN)) {
        const yarn = document.createElement("td");
        yarn.innerHTML = classData.mappings.get(MappingTypes.YARN) ?? "-";
        row.appendChild(yarn);
    }

    if (enabledMappings.includes(MappingTypes.HASHED)) {
        const hashed = document.createElement("td");
        hashed.innerHTML = classData.mappings.get(MappingTypes.HASHED) ?? "-";
        row.appendChild(hashed);
    }

    if (enabledMappings.includes(MappingTypes.QUILT)) {
        const quilt = document.createElement("td");
        quilt.innerHTML = classData.mappings.get(MappingTypes.QUILT) ?? "-";
        row.appendChild(quilt);
    }

    if (enabledMappings.includes(MappingTypes.SPIGOT)) {
        const spigot = document.createElement("td");
        spigot.innerHTML = classData.mappings.get(MappingTypes.SPIGOT) ?? "-";
        row.appendChild(spigot);
    }

    row.onclick = () => {
        if (selectedClass) selectedClass.classList.remove("selectedClass");
        row.classList.add("selectedClass");
        selectedClass = row;
        sendRequestClassData(classData.obfName, enabledMappings);
        loadComment(classData);
    };

    ClassTable.appendChild(row);
}

function sendRequestClassData(className: string, enabledMappings: MappingTypes[]) {
    const sigChecks = [];
    if (mojangSignatureCheck.checked) sigChecks.push(MappingTypes.MOJMAP);
    if (srgSignatureCheck.checked) sigChecks.push(MappingTypes.SRG);
    if (yarnSignatureCheck.checked) sigChecks.push(MappingTypes.YARN);
    if (hashedMojmapSignatureCheck.checked) sigChecks.push(MappingTypes.HASHED);
    if (quiltSignatureCheck.checked) sigChecks.push(MappingTypes.QUILT);
    if (spigotSignatureCheck.checked) sigChecks.push(MappingTypes.SPIGOT);
    if (yarnIntermediarySignatureCheck.checked) sigChecks.push(MappingTypes.INTERMEDIARY);
    if (mcpSignatureCheck.checked) sigChecks.push(MappingTypes.MCP);
    worker.postMessage({ type: "requestClassData", className: className, enabledMappings: enabledMappings, sigChecks: sigChecks, fallback: fallbackToOBF.checked });
}

//class method + field display stuff
function onClassData(classData: ClassData, methods: string[][], fields: string[][], enabledMappings: MappingTypes[]) {
    selectedMethod = null;
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    for (const method of methods) {
        const methodName = method.shift();
        if (!methodName) continue;

        const tr = document.createElement("tr");
        tr.classList.add("MethodRow");
        for (const m of method) {
            const td = document.createElement("td");
            td.innerHTML = m;
            tr.appendChild(td);
        }
        MethodTable.appendChild(tr);
        tr.onclick = () => {
            if (selectedMethod) selectedMethod.classList.remove("selectedMethod");
            tr.classList.add("selectedMethod");
            selectedMethod = tr;
            const methodData = classData.methods.get(methodName);
            if (methodData) {
                loadMethod(methodData, enabledMappings);
                loadComment(methodData);
            }
        }
    }

    if (searchInput.value != "") {
        //@ts-ignore
        for (const child: HTMLElement of MethodTable.children) {
            if (child.innerText.toLowerCase().includes(searchInput.value)) {
                child.offsetParent?.scrollTo(0, child.offsetTop-(child.offsetHeight));
                child.click();
                break;
            }
        }
    }

    for (const field of fields) {
        const fieldName = field.shift();
        if (!fieldName) continue;

        const tr = document.createElement("tr");
        tr.classList.add("FieldRow");
        for (const f of field) {
            const td = document.createElement("td");
            td.innerHTML = f;
            tr.appendChild(td);
        }
        FieldTable.appendChild(tr);
        tr.onclick = () => {
            const fieldData = classData.fields.get(fieldName);
            if (fieldData) {
                loadComment(fieldData);
            }
        }
    }
}

function loadMethod(methodData: MethodData, enabledMappings: MappingTypes[]) {
    ParamsTable.innerHTML = "";

    const params = new Set<number>();

    if (enabledMappings.includes(MappingTypes.YARN)) {
        for (const key of methodData.params.get(MappingTypes.YARN)?.keys() ?? []) {
            params.add(key);
        }
    }

    if (enabledMappings.includes(MappingTypes.MCP)) {
        for (const key of methodData.params.get(MappingTypes.MCP)?.keys() ?? []) {
            params.add(key);
        }
    }

    if (enabledMappings.includes(MappingTypes.PARCHMENT)) {
        for (const key of methodData.params.get(MappingTypes.PARCHMENT)?.keys() ?? []) {
            params.add(key);
        }
    }

    if (enabledMappings.includes(MappingTypes.QUILT)) {
        for (const key of methodData.params.get(MappingTypes.QUILT)?.keys() ?? []) {
            params.add(key);
        }
    }

    for (const param of params.keys()) {
        const row = document.createElement("tr");
        const num = document.createElement("td");
        num.innerHTML = param.toString();
        row.appendChild(num);

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("td");
            mcp.innerHTML = methodData.params.get(MappingTypes.MCP)?.get(param) ?? "-";
            row.appendChild(mcp);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("td");
            yarn.innerHTML = methodData.params.get(MappingTypes.YARN)?.get(param) ?? "-";
            row.appendChild(yarn);
        }

        if (enabledMappings.includes(MappingTypes.PARCHMENT)) {
            const parchment = document.createElement("td");
            parchment.innerHTML = methodData.params.get(MappingTypes.PARCHMENT)?.get(param) ?? "-";
            row.appendChild(parchment);
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            const parchment = document.createElement("td");
            parchment.innerHTML = methodData.params.get(MappingTypes.QUILT)?.get(param) ?? "-";
            row.appendChild(parchment);
        }


        ParamsTable.appendChild(row);
    }
}

async function loadComment(data: AbstractData) {
    commentHolder.innerHTML = "";
    for (const [mapping, comment] of data.comments.entries()) {
        if (!(await getEnabledMappings(data.classMappings.mcversion)).includes(mapping)) return;
        const header = document.createElement("h4");
        header.innerHTML = MappingTypes[mapping];
        commentHolder.appendChild(header);
        const content = document.createElement("p");
        content.innerHTML = comment;
        commentHolder.appendChild(content);
    }
}

async function onMojmapLoaded() {
    if (!confirmMojang && mojangMappingCheck.checked) {
        // @ts-ignore
        mojangConfirmPrompt.style.display = null;
        results.style.visibility = "hidden";
    } else {
        mojangConfirmPrompt.style.display = "none";
        results.style.visibility = "visible";
    }
}

enum MappingFileTypes {
    SRG, TINY, TSRG, TSRG2, MCP, PROGUARD, PARCHMENT, CSRG
}

enum SRGVersion {
    SRG, TSRG, TSRG2
}

async function importMappings() {
    const file = customMappingImportFile.files?.[0];
    if (file == null) {
        alert("No file selected");
        return;
    }
    let contents: string | {file(path: string): JSZipObject | null};
    let mappingType: MappingFileTypes;
    if (file.name.endsWith(".jar") || file.name.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        let zf;
        if (zf = zip.file("mappings/mappings.tiny") ?? zip.file("hashed/mappings.tiny")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.TINY;
        } else if (zf = zip.file("joined.srg")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.SRG;
        } else if (zf = zip.file("config/joined.tsrg")) {
            contents = await zf.async("string");
            mappingType = (<string>contents).startsWith("tsrg2") ? MappingFileTypes.TSRG2 : MappingFileTypes.TSRG;
        } else if (zf = zip.file("parchment.json")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.PARCHMENT;
        } else if (zf = zip.file("fields.csv")) {
            contents = zip;
            mappingType = MappingFileTypes.MCP;
        } else if (zf = zip.file("info.json")) {
            contents = zip;
            mappingType = MappingFileTypes.CSRG;
        } else {
            alert("Unknown mapping type in jar or zip, try submitting directly?");;
            return;
        }
    } else {
        if (file.name.endsWith(".tiny")) {
            contents = await file.text();
            mappingType = MappingFileTypes.TINY;
        } else if (file.name.endsWith(".tsrg")) {
            contents = await file.text();
            mappingType = contents.startsWith("tsrg2") ? MappingFileTypes.TSRG2 : MappingFileTypes.TSRG;
        } else if (file.name.endsWith(".srg")) {
            contents = await file.text();
            mappingType = MappingFileTypes.SRG;
        } else if (file.name.endsWith(".json")) {
            contents = await file.text();
            mappingType = MappingFileTypes.PARCHMENT;
        } else if (file.name.endsWith(".txt") || file.name.endsWith(".pro")) {
            contents = await file.text();
            mappingType = MappingFileTypes.PROGUARD;
        } else if (file.name.endsWith(".json")) {
            contents = await file.text();
            mappingType = MappingFileTypes.PARCHMENT;
        } else {
            alert("Unknown mapping type, if you think this is an error contact @Wagyourtail.");
            return;
        }
    }

    let target: MappingTypes;
    if (intermediaryImport.checked) {
        target = MappingTypes.INTERMEDIARY;
    } else if (yarnImport.checked) {
        target = MappingTypes.YARN;
    } else if (mojmapImport.checked) {
        target = MappingTypes.MOJMAP;
    } else if (parchmentImport.checked) {
        target = MappingTypes.PARCHMENT;
    } else if (mcpImport.checked) {
        target = MappingTypes.MCP;
    } else if (srgImport.checked) {
        target = MappingTypes.SRG;
    } else if (hashedImport.checked) {
        target = MappingTypes.HASHED;
    } else if (quiltImport.checked) {
        target = MappingTypes.QUILT;
    } else if (spigotImport.checked) {
        target = MappingTypes.SPIGOT;
    } else {
        alert("No mapping type selected");
        return;
    }
    sendImportMappings(target, mappingType, contents);
    importPop.style.display = "none";
}

async function onImportMappingsDone(typeLoaded: MappingTypes) {
    switch (typeLoaded) {
        case MappingTypes.MCP:
            mcpVersionSelect.value = "CUSTOM";
            mcpMappingCheck.checked = true;
            break;
        case MappingTypes.YARN:
            yarnVersionSelect.value = "CUSTOM";
            yarnMappingCheck.checked = true;
            break;
        case MappingTypes.PARCHMENT:
            parchmentVersionSelect.value = "CUSTOM";
            parchmentMappingCheck.checked = true;
            break;
        case MappingTypes.QUILT:
            quiltVersionSelect.value = "CUSTOM";
            quiltMappingCheck.checked = true;
            break;
        case MappingTypes.SRG:
            srgMappingCheck.checked = true;
            break;
        case MappingTypes.MOJMAP:
            mojangMappingCheck.checked = true;
            break;
        case MappingTypes.INTERMEDIARY:
            yarnIntermediaryMappingCheck.checked = true;
            break;
        case MappingTypes.HASHED:
            hashedMojmapCheck.checked = true;
            break;
        case MappingTypes.SPIGOT:
            spigotMappingCheck.checked = true;
            break;
    }
    await sendEnabled();
}

async function sendImportMappings(type: MappingTypes, mappingType: MappingFileTypes, contents: string | {file(path: string): JSZipObject | null}) {
    worker.postMessage({ type: "importMappings", mType: type, mappingType: mappingType, content: contents });
}

async function onLoadedMappingsUpdate(loaded: MappingTypes[]) {
    for (const type of loaded) {
        console.debug("loaded:", MappingTypes[type]);
    }
    await updateExportMappingOptions(loaded);

    await search(searchInput.value, parseInt(searchType.value));
}

async function updateExportMappingOptions(loaded: MappingTypes[]) {
    const maps: Set<MappingTypes> = new Set(loaded);
    if (maps.size) {
        maps.add(MappingTypes.OBF);
    }

    exportFrom.innerHTML = "";
    for (const map of maps) {
        const option = document.createElement("option");
        option.value = map.toString();
        option.innerHTML = MappingTypes[map];
        exportFrom.appendChild(option);
    }

    exportToClass.innerHTML = "";
    for (const map of maps) {
        const option = document.createElement("option");
        option.value = map.toString();
        option.innerHTML = MappingTypes[map];
        exportToClass.appendChild(option);
    }

    exportToContent.innerHTML = "";
    for (const map of maps) {
        const option = document.createElement("option");
        option.value = map.toString();
        option.innerHTML = MappingTypes[map];
        exportToContent.appendChild(option);
    }

    exportToMeta.innerHTML = "";
    for (const map of maps) {
        const option = document.createElement("option");
        option.value = map.toString();
        option.innerHTML = MappingTypes[map];
        exportToMeta.appendChild(option);
    }
}

function getFallbackMapping(map: MappingTypes) {
    switch (map) {
        case MappingTypes.PARCHMENT:
            return MappingTypes.MOJMAP;
        case MappingTypes.SRG:
            return MappingTypes.OBF;
        case MappingTypes.MCP:
            return MappingTypes.SRG;
        case MappingTypes.YARN:
            return MappingTypes.INTERMEDIARY;
        case MappingTypes.QUILT:
            return MappingTypes.HASHED;
        case MappingTypes.OBF:
        case MappingTypes.MOJMAP:
        case MappingTypes.INTERMEDIARY:
        case MappingTypes.HASHED:
        case MappingTypes.SPIGOT:
    }
    return MappingTypes.OBF;
}

function onExportedMappings(data: string) {
    download(data, "mappings.tiny", "text/plain");
    exportPop.style.display = "none";
}

// Function to download data to a file
function download(data:string, filename:string, type:string) {
    var file = new Blob([data], {type: type});
    if ((<any>window.navigator).msSaveOrOpenBlob) // IE10+
        (<any>window.navigator).msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function sendVersionUpdate(mapping: MappingTypes, data: any) {
    worker.postMessage({ type: "updateVersion", mapping: mapping, data: data });
}

function sendClearMappings(mapping: MappingTypes) {
    worker.postMessage({ type: "clearMappings", mapping: mapping });
}

function sendRequestExport(from_mapping: MappingTypes,
                           to_class_mapping: MappingTypes,
                           to_content_mapping: MappingTypes,
                           to_meta_mapping: MappingTypes,
                           fallback_from: MappingTypes,
                           fallback_to_class: MappingTypes,
                           fallback_to_content: MappingTypes,
                           exportFromName: string,
                           exportToName: string) {
    worker.postMessage({ type: "exportMappings", from_mapping: from_mapping, to_class_mapping: to_class_mapping, to_content_mapping: to_content_mapping, to_meta_mapping: to_meta_mapping, fallback_from: fallback_from, fallback_to_class: fallback_to_class, fallback_to_content: fallback_to_content, exportFromName: exportFromName, exportToName: exportToName });
}

let selectedMethod: HTMLTableRowElement | null = null;


(() => {
    //load initial checks
    mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";
    yarnIntermediaryMappingCheck.checked = localStorage.getItem("yarnIntermediaryMappingCheck.value") == "true";
    yarnMappingCheck.checked = localStorage.getItem("yarnMappingCheck.value") == "true";
    srgMappingCheck.checked = localStorage.getItem("srgMappingCheck.value") == "true";
    mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";
    parchmentMappingCheck.checked = localStorage.getItem("parchmentMappingCheck.value") == "true";
    hashedMojmapCheck.checked = localStorage.getItem("hashedMojmapCheck.value") == "true";
    quiltMappingCheck.checked = localStorage.getItem("quiltMappingCheck.value") == "true";

    versionSelect.addEventListener("change", async (e) => {
        await setLoading(true);
        await sendVersion(<MCVersionSlug>mcpVersionSelect.value);
        localStorage.setItem("versionSelect.value", (<HTMLSelectElement>e.target).value);
    });

    mcpVersionSelect.addEventListener("change", (e) => {
        sendVersionUpdate(MappingTypes.MCP, (<HTMLSelectElement>e.target).value);
    });

    yarnVersionSelect.addEventListener("change", (e) => {
        sendVersionUpdate(MappingTypes.YARN, (<HTMLSelectElement>e.target).value);
    });

    searchInput.addEventListener("keyup", (e) => {
        if (e.code === "Enter") {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    // checkbox change events
    mojangMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("mojangMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    parchmentMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("parchmentMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    srgMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("srgMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    mcpMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("mcpMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    yarnIntermediaryMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("yarnIntermediaryMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    yarnMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("yarnMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    hashedMojmapCheck.addEventListener("change", (e) => {
        localStorage.setItem("hashedMojmapCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    quiltMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("quiltMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    spigotMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("spigotMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        sendEnabled();
    });

    settingsBtn.addEventListener("click", () => {
        // @ts-ignore
        settings.style.display = null;
    });

    closeSettings.addEventListener("click", () => {
        settings.style.display = "none";
    });

    mojangConfirm.addEventListener("click", async () => {
        confirmMojang = true;
        mojangConfirmPrompt.style.display = "none";
        results.style.visibility = "visible";
    });

    mojangDeny.addEventListener("click", async () => {
        confirmMojang = false;

        mojangMappingCheck.checked = false;
        localStorage.setItem("mojangMappingCheck.value", false.toString());

        await setLoading(true);
        mojangConfirmPrompt.style.visibility = "hidden";
        sendClearMappings(MappingTypes.MOJMAP);
        search(searchInput.value, parseInt(searchType.value));
    });

    searchButton.addEventListener("click", () => {
        search(searchInput.value, parseInt(searchType.value));
    })

    showSnapshots.addEventListener("change", (e) => {
        // add versions to drop-down
        for (const version of Array.from(versionSelect.children)) {
            if (version.classList.contains("MCSnapshot")) {
                if ((<HTMLInputElement>e.target).checked) {
                    version.removeAttribute("hidden");
                } else {
                    version.setAttribute("hidden", "");
                }
            }
        }
    });

    importBtn.addEventListener("click", (e) => {
        // @ts-ignore
        importPop.style.display = null;
    });

    exportBtn.addEventListener("click", async (e) => {
        // @ts-ignore
        exportPop.style.display = null;
    });

    closeImport.addEventListener("click", () => {
        // @ts-ignore
        importPop.style.display = "none";
    });

    closeExport.addEventListener("click", () => {
        exportPop.style.display = "none";
    });

    confirmExportTiny.addEventListener("click", async () => {
        const from_mapping: MappingTypes = parseInt(exportFrom.value);
        const to_class_mapping: MappingTypes = parseInt(exportToClass.value);
        const to_content_mapping: MappingTypes = parseInt(exportToContent.value);
        const to_meta_mapping: MappingTypes = parseInt(exportToMeta.value);
        const fallback_from = getFallbackMapping(from_mapping);
        const fallback_to_class = getFallbackMapping(to_class_mapping);
        const fallback_to_content = getFallbackMapping(to_content_mapping);
        sendRequestExport(from_mapping, to_class_mapping, to_content_mapping, to_meta_mapping, fallback_from, fallback_to_class, fallback_to_content, exportFromName.value, exportToName.value);
        exportPop.style.display = "none";
    });

    confirmImport.addEventListener("click", async () => {
        setLoading(true);
        await importMappings();
        search(searchInput.value, parseInt(searchType.value));
    });
})();

function windowResize() {
    resultsTable.style.maxHeight = `${window.innerHeight-topbar.offsetHeight}px`
}

window.addEventListener('resize', windowResize);

windowResize();