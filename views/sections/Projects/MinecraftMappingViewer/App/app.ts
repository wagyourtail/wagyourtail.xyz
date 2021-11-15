import e from "express";
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
declare const customMappingImportFile: HTMLInputElement;
declare const exportFrom: HTMLSelectElement;
declare const exportToClass: HTMLSelectElement;
declare const exportToContent: HTMLSelectElement;
declare const exportToMeta: HTMLSelectElement;
declare const exportFromName: HTMLInputElement;
declare const exportToName: HTMLInputElement;
declare const fallbackToOBF: HTMLInputElement;


const NO_CORS_BYPASS = "/Projects/CORS-Bypass/App";

const zip = new JSZip();
let mcManifest: MCVersionManifest;
let yarnManifest: YarnVersionManifest;
let mcpManifest: MCPVersionManifest;
let parchmentManifest: ParchmentVersionManifest;
let hashedMojmapManifest: HashedMojmapManifest;
let quiltManifest: QuiltManifest;

let confirmMojang: boolean = false;
let mappings: ClassMappings;

type ReleaseVersion = `${number}.${number}` | `${number}.${number}.${number}`;
type Snapshot = `${number}w${number}${"a"|"b"|"c"|"d"|"e"}` | `${ReleaseVersion}-pre${number}` | `${ReleaseVersion}-rc${number}`;
type MCVersionSlug =  ReleaseVersion | Snapshot;

interface ParchmentVersionManifest {
    [mcversion: string]: string[]
}

interface HashedMojmapManifest {
    [mcversion: string]: string
}

interface QuiltManifest {
    [mcversion: string]: number[]
}

interface MCVersionManifest {
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

interface YarnVersionManifest {
    [mcversion: string]: number[]
}

interface MCPVersionManifest {
    [mcversion: string]: {
        snapshot: number[],
        stable?: number[]
    } | undefined
}

async function loadMinecraftVersions() {
    //get mc versions
    if (!mcManifest) {
        profiler("Getting Minecraft Versions");
        const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
        profilerDel("Getting Minecraft Versions");
        mcManifest = await res.json();
    }

    versionSelect.innerHTML = "";

    //add versions to drop-down
    for (const version of mcManifest.versions) {
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

    //load yarn version nums
    if (!yarnManifest) {
        profiler("Getting Yarn Versions");
        const res = await fetch("https://maven.fabricmc.net/net/fabricmc/yarn/versions.json");
        profilerDel("Getting Yarn Versions");
        yarnManifest = await res.json();


        //legacy yarn
        const xmlParse = new DOMParser();
        profiler("Getting Legacy Yarn Versions");
        const intRes = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/intermediary/maven-metadata.xml`);
        profilerDel("Getting Legacy Yarn Versions");
        const interXML = xmlParse.parseFromString(await intRes.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].children).forEach(e => {
            yarnManifest[e.innerHTML] = [];
        });

        profiler("Getting Legacy Yarn Intermediary Versions");
        const yarnRes = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/yarn/maven-metadata.xml`);
        profilerDel("Getting Legacy Yarn Intermediary Versions");
        const yarnXML = xmlParse.parseFromString(await yarnRes.text(), "text/xml");
        Array.from(yarnXML.getElementsByTagName("versions")[0].children).forEach(e => {
            const innerHTML = e.innerHTML;
            yarnManifest[innerHTML.split("+")[0]].push(parseInt(<string>innerHTML.split(".").pop()));
        });
    }

    //load mcp version nums
    if (mcpManifest == null) {
        profiler("Getting MCP Versions");
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/versions.json`);
        profilerDel("Getting MCP Versions");
        mcpManifest = JSON.parse(await res.text());

        if (!("1.16" in mcpManifest)) {
            mcpManifest["1.16"] = {snapshot: [20200514]}
        }

        if (!("1.16.1" in mcpManifest)) {
            mcpManifest["1.16.1"] = {snapshot: [20200820]}
        }

        if (!("1.16.2" in mcpManifest)) {
            mcpManifest["1.16.2"] = {snapshot: [20200916]}
        }

        if (!("1.16.3" in mcpManifest)) {
            mcpManifest["1.16.3"] = {snapshot: [20201028]}
        }
        if (!("1.16.4" in mcpManifest)) {
            mcpManifest["1.16.4"] = {snapshot: [20210309]}
        }
        if (!("1.16.5" in mcpManifest)) {
            mcpManifest["1.16.5"] = {snapshot: [20210309]}
        }

        //srg versions
        const xmlParse = new DOMParser();
        profiler("Getting SRG Versions");
        const srg13res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/maven-metadata.xml`);
        profilerDel("Getting SRG Versions");
        const interXML = xmlParse.parseFromString(await srg13res.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].children).forEach(e => {
            if (!e.innerHTML.includes("-") && !(e.innerHTML in mcpManifest)) {
                mcpManifest[e.innerHTML] = undefined;
            }
        });
    }


    // load parchment versions
    if (parchmentManifest == null) {
        parchmentManifest = {}
        for (const mcVersion of ["1.16.5", "1.17", "1.17.1"]) {
            const xmlParse = new DOMParser();
            profiler(`Getting Parchment ${mcVersion} Versions`);

            const parchmentRes = await fetch(`${NO_CORS_BYPASS}/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${mcVersion}%252Fmaven-metadata.xml`);
            profilerDel(`Getting Parchment ${mcVersion} Versions`);
            const interXML = xmlParse.parseFromString(await parchmentRes.text(), "text/xml");
            parchmentManifest[mcVersion] = Array.from(interXML.getElementsByTagName("versions")[0].children).map(e => e.innerHTML).reverse();
        }
    }

    // hashed mojmap versions
    if (hashedMojmapManifest == null) {
        hashedMojmapManifest = {};
        let metaRes: Response;
        profiler("Downloading Hashed Mojmap Mappings");

        metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/snapshot/org/quiltmc/hashed-mojmap/maven-metadata.xml`);
        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        for (const version of Array.from(interXML.getElementsByTagName("version"))) {
            hashedMojmapManifest[version.innerHTML.split("-SNAPSHOT")[0]] = "hashed-mojmap";
        }

        metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/snapshot/org/quiltmc/hashed/maven-metadata.xml`);
        const interXML2 = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        for (const version of Array.from(interXML2.getElementsByTagName("version"))) {
            hashedMojmapManifest[version.innerHTML.split("-SNAPSHOT")[0]] = "hashed";
        }
        profilerDel("Downloading Hashed Mojmap Mappings");
    }

    // quilt versions
    if (quiltManifest == null) {
        quiltManifest = {};
        let metaRes: Response;
        profiler("Downloading Quilt Mappings");

        metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-mappings/maven-metadata.xml`);
        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        for (const version of Array.from(interXML.getElementsByTagName("version"))) {
            const versionParts = version.innerHTML.split("+build.");
            if (!quiltManifest[versionParts[0]]) quiltManifest[versionParts[0]] = [];
            quiltManifest[versionParts[0]].push(parseInt(versionParts[1]));
        }

        profilerDel("Downloading Quilt Mappings");
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

    if (!mappings || mappings.mcversion !== versionSelect.value) {
        mappings = new ClassMappings(<MCVersionSlug>versionSelect.value);
    }
}

function mcVersionCompare(a: MCVersionSlug, b: MCVersionSlug) {
    if (a === b) return 0;
    // @ts-ignore
    for (const e of versionSelect.children) {
        if (e.value === a) return 1;
        if (e.value === b) return -1;
    }
    throw Error("MC version not in list.");
}

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

enum MappingTypes {
    OBF,
    MOJMAP, PARCHMENT,
    SRG, MCP,
    INTERMEDIARY, YARN,
    HASHED, QUILT
}

enum SRGVersion {
    SRG, TSRG, TSRG2
}

type ReversedMappings = {
    obf: string | undefined,
    fields: Map<string, {desc: string, obf: string}>,
    methods: Map<string, {retval: string, params: string, obf: string}>
};

class ClassMappings {
    readonly mcversion: MCVersionSlug;
    readonly loadedMappings: Set<MappingTypes> = new Set();

    readonly classes: Map<string, ClassData> = new Map();
    readonly srgFields: Map<string, FieldData[]> = new Map();
    readonly srgMethods: Map<string, MethodData[]> = new Map();

    loadedMCPVersion: null | [string, string] = null;
    loadedYarnVersion: null | string = null;

    constructor(mcversion: MCVersionSlug) {
        this.mcversion = mcversion;
        this.updateAvailableVersionsDropdown();
    }

    reverseTransformDesc(desc: string | null, from: MappingTypes): string | null {
        if (from == MappingTypes.OBF) return desc;
        let backup: MappingTypes | null = null;
        switch (from) {
            case MappingTypes.MCP:
                backup = MappingTypes.SRG;
                break;
            case MappingTypes.YARN:
                backup = MappingTypes.INTERMEDIARY;
                break;
            case MappingTypes.QUILT:
                backup = MappingTypes.HASHED;
                break;
            default:
        }
        return (<string>desc).replace(/L(.+?);/g, (match, p1) => {
            for (const clazz of this.classes.values()) {
                if (clazz.getMapping(from) === p1) {
                    return `L${clazz.obfName};`;
                }
                if (backup && clazz.getMapping(backup) == p1) {
                    return `L${clazz.obfName};`;
                }
            }
            return `L${p1};`;
        });
    }

    transformDesc(desc: string | null, to: MappingTypes): string | null {
        if (to == MappingTypes.OBF) return desc;
        let backup: MappingTypes | null = null;
        switch (to) {
            case MappingTypes.MCP:
                backup = MappingTypes.SRG;
                break;
            case MappingTypes.YARN:
                backup = MappingTypes.INTERMEDIARY;
                break;
            case MappingTypes.QUILT:
                backup = MappingTypes.HASHED;
                break;
            default:
        }
        return (<string>desc).replace(/L(.+?);/g, (match, p1) => {
            const clazz = this.classes.get(p1);
            p1 = clazz?.getMapping(to) ?? (backup ? clazz?.getMapping(backup) ?? p1 : p1);
            return `L${p1};`;
        });
    }

    updateAvailableVersionsDropdown() {
        //MCP
        mcpVersionSelect.innerHTML = "";
        for (const version of mcpManifest[this.mcversion]?.stable ?? []) {
            const option = document.createElement("option");
            option.innerHTML = option.value = `stable-${version}`;
            mcpVersionSelect.appendChild(option);
        }

        for (const version of mcpManifest[this.mcversion]?.snapshot ?? []) {
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

        for (const version of yarnManifest[this.mcversion]?.reverse() ?? []) {
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
        for (const version of parchmentManifest[this.mcversion]?.sort().reverse() ?? []) {
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
        for (const version of quiltManifest[this.mcversion]?.reverse() ?? []) {
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

    async loadEnabledMappings(enabledMappings: MappingTypes[]) {
        const newMappings = enabledMappings.filter(e => !this.loadedMappings.has(e));
        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            await this.getMojangMappings();
        }

        if (enabledMappings.includes(MappingTypes.PARCHMENT)) {
            await this.getParchmentMappings(parchmentVersionSelect.value);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            await this.getSrgMappings();
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const parts = mcpVersionSelect.value.split("-");
            await this.getMCPMappings(<any>parts[0], parts[1]);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            await this.getIntermediaryMappings();
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            await this.getYarnMappings(parseInt(yarnVersionSelect.value));
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            await this.getHashedMappings();
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            await this.getQuiltMappings(parseInt(quiltVersionSelect.value));
        }
    }

    async getOrAddClass(class_name: string, mapping: MappingTypes) {
        for (const clazz of this.classes.values()) {
            if (clazz.getMapping(mapping) === class_name) {
                return clazz;
            }
            if (clazz.getMapping(MappingTypes.OBF) === class_name) {
                return clazz;
            }
        }
        if (mapping !== MappingTypes.OBF) console.log(`adding class: ${class_name}`);
        const clazz = new ClassData(this, class_name);
        this.classes.set(class_name, clazz);
        return clazz;
    }

    async getMojangMappings() {
        if (this.loadedMappings.has(MappingTypes.MOJMAP)) return;

        let vers: string | null = null;

        for (const version of mcManifest.versions) {
            if (version.id === this.mcversion) {
                vers = version.url;
                break;
            }
        }

        if (!vers) {
            return;
        }

        const mappingsURL: string = (await (await fetch(vers)).json())?.downloads?.client_mappings?.url;

        if (!mappingsURL) {
            return;
        }

        profiler("Downloading Mojang Mappings");
        const request = await fetch(`${NO_CORS_BYPASS}/${mappingsURL}`);
        if (request.status !== 200) return;
        const mappings = (await request.text()).split(".").join("/");
        profilerDel("Downloading Mojang Mappings");

        await this.loadMojangMappings(mappings);

        if (!confirmMojang && mojangMappingCheck.checked) {
            // @ts-ignore
            mojangConfirmPrompt.style.display = null;
            results.style.visibility = "hidden";
        } else {
            mojangConfirmPrompt.style.display = "none";
            results.style.visibility = "visible";
        }
    }

    async loadMojangMappings(proguard_mappings: string) {
        profiler("Parsing Mojang Mappings");

        const lines = proguard_mappings.split("\n");

        lines.shift(); // copyright notice
        const classes = lines.join("\n").matchAll(/^[^\s].+?$(?:\n\s.+?$)*/gm);

        // build reversed mappings
        const reversedMappings = new Map<string, ReversedMappings>();
        for (const cdata of classes ?? []) {
            const classdata = cdata[0].split("\n");
            const cNameData = classdata.shift()?.split("->");
            const cNamed = cNameData?.shift()?.trim();

            if (!cNamed) continue;

            const classItemData: ReversedMappings = {
                obf: cNameData?.shift()?.trim().replace(/:/g, ""),
                fields: new Map(),
                methods: new Map()
            };

            if (!classItemData.obf) continue;

            for (const classItem of classdata) {
                const line = classItem.trim();
                const matchMethod = line.match(/^(?:\d+:\d+:)?([^\s]+)\s*([^\s]+)(\(.*?\))\s*->\s*([^\s]+)/);
                if (matchMethod) {
                    classItemData.methods.set(matchMethod[2], {retval:matchMethod[1], params:matchMethod[3], obf:matchMethod[4]});
                    continue;
                }
                const matchField = line.match(/^([^\d][^\s]+)\s*([^\s\(]+)\s*->\s*([^\s]+)/);
                if (matchField) {
                    classItemData.fields.set(matchField[2], {desc:matchField[1], obf:matchField[3]});
                }
            }
            reversedMappings.set(cNamed, classItemData);
        }

        // reverse reversed mappings and change method descriptors to correct format.
        reversedMappings.forEach((mappings, named) => {
            if (!mappings.obf) return;
            const classData = this.classes.get(mappings.obf.replace(/\./g, "/")) ?? new ClassData(this, mappings.obf.replace(/\./g, "/"));
            classData.mappings.set(MappingTypes.MOJMAP, named.replace(/\./g, "/"));

            mappings.methods.forEach((methodMappings, named) => {
                const md = classData.getOrAddMethod(methodMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, methodMappings.params + methodMappings.retval), MappingTypes.OBF);
                md?.addMapping(MappingTypes.MOJMAP, named);
            });

            mappings.fields.forEach((fieldMappings, named) => {
                const fd = classData.getOrAddField(fieldMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, fieldMappings.desc), MappingTypes.OBF);
                fd?.addMapping(MappingTypes.MOJMAP, named);
            });

            this.classes.set(mappings.obf.replace(/\./g, "/"), classData);
        })

        this.loadedMappings.add(MappingTypes.MOJMAP);
        profilerDel("Parsing Mojang Mappings");
    }

    private static transformProguardDescriptors(reversedMappings: Map<string, ReversedMappings>, desc: string): string {
        //method
        if (desc.includes("(")) {
            const match = desc.match(/\((.*)\)(.+)/);
            if (!match) throw new Error(`proguard method descriptor bad format "${desc}"`);
            if (match[1] == "") return "()" + ClassMappings.transformProguardClass(reversedMappings, match[2])
            return `(${match[1].split(",").map(e => ClassMappings.transformProguardClass(reversedMappings, e)).join("")})${ClassMappings.transformProguardClass(reversedMappings, match[2])}`;
        //field
        } else {
            return ClassMappings.transformProguardClass(reversedMappings, desc);
        }
    }

    private static transformProguardClass(reversedMappings: Map<string, ReversedMappings>, clazz: string): string {
        const dims = (clazz.match(/\[\]/g) ?? []).length;
        let sig: string;
        switch (clazz.replace(/\[]/g, "")) {
            case "boolean":
                sig = "Z";
                break;
            case "byte":
                sig = "B";
                break;
            case "char":
                sig = "C";
                break;
            case "short":
                sig = "S";
                break;
            case "int":
                sig = "I";
                break;
            case "long":
                sig = "J";
                break;
            case "float":
                sig = "F";
                break;
            case "double":
                sig = "D";
                break;
            case "void":
                sig = "V";
                break;
            default:
                const cName = clazz.replace(/\[]/g, "").replace(/\./g, "/");
                sig = `L${reversedMappings.get(cName)?.obf ?? cName};`
        }
        for (let i = 0; i < dims; ++i) {
            sig = "[" + sig;
        }
        return sig;
    }

    async getParchmentMappings(version: string) {
        profiler("Downloading Parchment Mappings");
        let metaRes = await fetch(`${NO_CORS_BYPASS}/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${this.mcversion}%252F${version}%252Fmaven-metadata.xml`);

        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        const versionName = interXML.getElementsByTagName("value")[0].innerHTML;

        let res = await fetch(`${NO_CORS_BYPASS}/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${this.mcversion}%252F${version}%252Fparchment-${this.mcversion}-${versionName}-checked.zip`);
        profilerDel("Downloading Parchment Mappings");

        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const content = await zipContent.file("parchment.json")?.async("string");
        if (content) {
            await this.loadParchmentMappings(content);
        } else {
            console.error("ERROR PARSING PARCHMENT MAPPINGS ZIP");
        }
    }

    async loadParchmentMappings(mappings: string) {
        profiler("Parsing Parchment Mappings");
        if (!this.loadedMappings.has(MappingTypes.MOJMAP)) {
            await this.getMojangMappings();
        }

        interface ParchmentMappings {
            version: string,
            packages: {
                name: string,
                javadoc?: string[]
            }[],
            classes: {
                name: string,
                methods: {
                    name: string,
                    descriptor: string,
                    javadoc?: string[],
                    parameters: {
                        index: number,
                        name: string,
                        javadoc?: string
                    }[]
                }[]
                fields: {
                    name: string,
                    descriptor: string,
                    javadoc?: string[]
                }[],
                javadoc?: string[]
            }[]
        }

        const parchmentMappings: ParchmentMappings = JSON.parse(mappings);

        for (const classMapping of parchmentMappings.classes) {
            const clazz = await this.getOrAddClass(classMapping.name, MappingTypes.MOJMAP);

            if (clazz === null) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, could not find mojmap for class: " + classMapping.name);
                continue;
            }

            if (classMapping.javadoc) {
                clazz.comments.set(MappingTypes.PARCHMENT, classMapping.javadoc.join("<br>"));
            }

            for (const methodMapping of classMapping.methods ?? []) {
                const method = clazz.getOrAddMethod(methodMapping.name, methodMapping.descriptor, MappingTypes.MOJMAP);

                if (method === null) {
                    console.error("ERROR PARSING YARN MAPPINGS FILE, could not find mojmap for method: " + classMapping.name + ";" + methodMapping.name + methodMapping.descriptor);
                    continue;
                }

                let methodDoc: string = methodMapping.javadoc?.join("<br>") ?? "";
                const paramMap: Map<number, string> = new Map();

                for (const paramMapping of methodMapping.parameters ?? []) {
                    paramMap.set(paramMapping.index, paramMapping.name);
                    if (paramMapping.javadoc) {
                        methodDoc += `<p>@param ${paramMapping.name} ${paramMapping.javadoc}</p>`;
                    }
                }
                method.params.set(MappingTypes.PARCHMENT, paramMap);


                if (methodMapping.javadoc) {
                    method.comments.set(MappingTypes.PARCHMENT, methodDoc);
                }
            }

            for (const fieldMapping of classMapping.fields ?? []) {
                const field = clazz.getOrAddField(fieldMapping.name, fieldMapping.descriptor, MappingTypes.MOJMAP);

                if (field === null) {
                    console.error("ERROR PARSING YARN MAPPINGS FILE, could not find mojmap for field: " + classMapping.name + ";" + fieldMapping.name + fieldMapping.descriptor);
                    continue;
                }

                if (fieldMapping.javadoc) {
                    field.comments.set(MappingTypes.PARCHMENT, fieldMapping.javadoc.join("<br>"));
                }
            }
        }

        this.loadedMappings.add(MappingTypes.PARCHMENT);
        profilerDel("Parsing Parchment Mappings");
    }

    async getSrgMappings() {
        profiler("Downloading SRG Mappings");
        let res;
        if (mcVersionCompare(this.mcversion, "1.12.2") != -1) {
            res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/${this.mcversion}/mcp_config-${this.mcversion}.zip`);
        } else {
            res = await fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp/${this.mcversion}/mcp-${this.mcversion}-srg.zip`);
        }
        profilerDel("Downloading SRG Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const file = zipContent.file("config/joined.tsrg");
        if (file) {
            const content = await file.async("string");
            await this.loadSRGMappings(content.startsWith("tsrg2") ? SRGVersion.TSRG2 : SRGVersion.TSRG, content);

        } else {
            const file = zipContent.file("joined.srg");
            if (file) {
                await this.loadSRGMappings(SRGVersion.SRG, await file.async("string"));
            } else {
                alert("BROKEN MCPCONFIG DOWNLOAD!");
            }
        }

    }

    async loadSRGMappings(srgVersion: SRGVersion, srg_mappings: string) {
        if (this.loadedMappings.has(MappingTypes.SRG)) this.clearMappings(MappingTypes.SRG);
        profiler("Parsing SRG Mappings");
        switch (srgVersion) {
            case SRGVersion.SRG:
                await this.loadSRG1Mappings(srg_mappings);
                break
            case SRGVersion.TSRG:
                await this.loadTSRG1Mappings(srg_mappings);
                break
            case SRGVersion.TSRG2:
                await this.loadTSRG2Mappings(srg_mappings);
                break
        }
        this.loadedMappings.add(MappingTypes.SRG);
        profilerDel("Parsing SRG Mappings");
    }

    private async loadSRG1Mappings(srg_mappings: string) {
        const lines = srg_mappings.split("\n");
        while (lines.length) {
            const current_line = (<string>lines.shift()).split(/\s+/);
            switch (current_line[0]) {
                case "CL:":
                    (await this.getOrAddClass(current_line[1], MappingTypes.OBF))?.addMapping(MappingTypes.SRG, current_line[2]);
                    break;
                case "FD": {
                    const obf_parts = current_line[1].match(/(.+)\/([^\/]+)$/);
                    const srg_parts = current_line[2].match(/(.+)\/([^\/]+)$/);
                    const current_class = await this.getOrAddClass(<string>obf_parts?.[1], MappingTypes.OBF);
                    const current_field = current_class.getOrAddField(<string>obf_parts?.[2], null, MappingTypes.OBF);
                    current_field?.addMapping(MappingTypes.SRG, <string>srg_parts?.[2]);
                    const id = <string>srg_parts?.[2].match(/\d+/)?.[0];
                    if (!id) {
                        console.warn(`NO NUMBERS IN SRG MAPPING??? "${current_line}"`);
                        continue;
                    }
                    if (!this.srgFields.has(id)) this.srgFields.set(id, []);
                    if (current_field) this.srgFields.get(id)?.push(current_field);
                    break;
                }
                case "MD:": {
                    const obf_parts = current_line[1].match(/(.+)\/([^\/]+)$/);
                    const srg_parts = current_line[3].match(/(.+)\/([^\/]+)$/);
                    const current_class = await this.getOrAddClass(<string>obf_parts?.[1], MappingTypes.OBF);
                    const current_method = current_class.getOrAddMethod(<string>obf_parts?.[2], current_line[2], MappingTypes.OBF);
                    current_method?.addMapping(MappingTypes.SRG, <string>srg_parts?.[2]);
                    current_method?.setDescriptor(MappingTypes.SRG, current_line[4]);
                    const id = <string>srg_parts?.[2].match(/\d+/)?.[0];
                    if (!id) {
                        console.warn(`NO NUMBERS IN SRG MAPPING??? "${current_line}"`);
                        continue;
                    }
                    if (!this.srgMethods.has(id)) this.srgMethods.set(id, []);
                    if (current_method) this.srgMethods.get(id)?.push(current_method);
                    break;
                }
                case "PK:":
                    break
            }
        }
    }

    private async loadTSRG1Mappings(tsrg_mappings: string) {
        const lines = tsrg_mappings.split("\n");
        let current_class: ClassData | null = null;
        while (lines.length) {
            const current_line = <string>lines.shift();
            const indent = <string>current_line.match(/^\t*/)?.[0];
            if (indent.length == 0) {
                const cParts = current_line.trim().split(/\s+/);
                current_class = await this.getOrAddClass(cParts[0], MappingTypes.OBF);
                current_class.addMapping(MappingTypes.SRG, cParts[1]);
            } else if (indent.length == 1) {
                const fmParts = current_line.trim().split(/\s+/);
                //field
                if (fmParts.length == 2) {
                    const current_field = current_class?.getOrAddField(fmParts[0], null, MappingTypes.OBF);
                    current_field?.addMapping(MappingTypes.SRG, fmParts[1]);
                    const id = fmParts[1].match(/\d+/)?.[0];
                    if (!id) {
                        console.warn(`NO NUMBERS IN SRG MAPPING??? "${current_line}"`);
                        continue;
                    }
                    if (!this.srgFields.has(id)) this.srgFields.set(id, []);
                    if (current_field) this.srgFields.get(id)?.push(current_field);
                //method
                } else {
                    const current_method = current_class?.getOrAddMethod(fmParts[0], fmParts[1], MappingTypes.OBF);
                    current_method?.addMapping(MappingTypes.SRG, fmParts[2]);
                    const id = fmParts[2].match(/\d+/)?.[0];
                    if (!id) {
                        console.warn(`NO NUMBERS IN SRG MAPPING??? "${current_line}"`);
                        continue;
                    }
                    if (!this.srgMethods.has(id)) this.srgMethods.set(id, []);
                    if (current_method) this.srgMethods.get(id)?.push(current_method);
                }
            }
        }

    }

    private async loadTSRG2Mappings(tsrg2_mappings: string) {
        const lines = tsrg2_mappings.split("\n");
        lines.shift();
        let current_class: ClassData | null = null;
        let current_item: AbstractData | null | undefined = undefined;
        while (lines.length) {
            const current_line = <string>lines.shift();
            const indent = <string>current_line.match(/^\t*/)?.[0];
            if (indent.length == 0) {
                const cParts = current_line.trim().split(/\s+/);
                current_class = await this.getOrAddClass(cParts[0], MappingTypes.OBF);
                current_class.addMapping(MappingTypes.SRG, cParts[1]);
            } else if (indent.length == 1) {
                const fmParts = current_line.trim().split(/\s+/);
                //field
                if (fmParts.length == 3) {
                    current_item = current_class?.getOrAddField(fmParts[0], null, MappingTypes.OBF);
                    current_item?.addMapping(MappingTypes.SRG, fmParts[1]);
                    if (!this.srgFields.has(fmParts[2])) this.srgFields.set(fmParts[2], []);
                    if (current_item) this.srgFields.get(fmParts[2])?.push(<FieldData>current_item);
                //method
                } else {
                    current_item = current_class?.getOrAddMethod(fmParts[0], fmParts[1], MappingTypes.OBF);
                    current_item?.addMapping(MappingTypes.SRG, fmParts[2]);
                    if (!this.srgMethods.has(fmParts[3])) this.srgMethods.set(fmParts[3], []);
                    if (current_item) this.srgMethods.get(fmParts[3])?.push(<MethodData>current_item);
                }
            //param
            } else if (indent.length == 2) {
                const pParts = current_line.trim().split(/\s+/);
                // verify cus things like "static" are at this level too
                if (pParts.length == 4) {
                    if (current_item instanceof MethodData) {
                        if (!current_item.params.has(MappingTypes.SRG)) current_item.params.set(MappingTypes.SRG, new Map());
                        current_item.params.get(MappingTypes.SRG)?.set(parseInt(pParts[0]), pParts[2]);
                        if (!this.srgMethods.has(pParts[3])) this.srgMethods.set(pParts[3], []);
                        this.srgMethods.get(pParts[3])?.push(current_item);
                    }
                }
            }
        }
    }



    async getMCPMappings(channel: "stable" | "snapshot", version: string) {
        profiler("Downloading MCP Mappings");
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_${channel}/${version}-${this.mcversion}/mcp_${channel}-${version}-${this.mcversion}.zip`);
        profilerDel("Downloading MCP Mappings");

        await this.loadMCPMappings(await zip.loadAsync(await res.arrayBuffer()));
    }

    async loadMCPMappings(mcp_zip: {file(path: string): JSZipObject | null}) {
        if (this.loadedMappings.has(MappingTypes.MCP)) this.clearMappings(MappingTypes.MCP);
        profiler("Parsing MCP Mappings");
        if (!this.loadedMappings.has(MappingTypes.SRG)) {
            await this.getSrgMappings();
        }

        const fields = await mcp_zip.file("fields.csv")?.async("string");
        const methods = await mcp_zip.file("methods.csv")?.async("string");
        const params = await mcp_zip.file("params.csv")?.async("string");

        if (fields) {
            const field_list = fields.split("\n");
            field_list.shift() // remove header
            while (field_list.length) {
                const current_field = field_list.shift()?.split(",").map(e => e.trim());
                if (!current_field || current_field.length <= 1) continue;
                const id = current_field[0].match(/\d+/)?.[0];
                if (!id) {
                    console.warn(`NO NUMBERS IN SRG (mcp) MAPPING??? "${current_field}"`);
                    continue;
                }
                for (const field of this.srgFields.get(id) ?? []) {
                    if (field.getMapping(MappingTypes.SRG) == current_field[0]) field.addMapping(MappingTypes.MCP, current_field[1], current_field[3]);
                }
            }
        }

        if (methods) {
            const method_list = methods.split("\n");
            method_list.shift() // remove header
            while (method_list.length) {
                const current_method = method_list.shift()?.split(",").map(e => e.trim());
                if (!current_method || current_method.length <= 1) continue;
                const id = current_method[0].match(/\d+/)?.[0];
                if (!id) {
                    console.warn(`NO NUMBERS IN SRG (mcp) MAPPING??? "${current_method}"`);
                    continue;
                }
                for (const method of this.srgMethods.get(id) ?? []) {
                    if (method.getMapping(MappingTypes.SRG) == current_method[0]) method.addMapping(MappingTypes.MCP, current_method[1], current_method[3]);
                }
            }
        }

        if (params) {
            const param_list = params.split("\n");
            param_list.shift() //remove header
            while (param_list.length) {
                const current_param = param_list.shift()?.split(",").map(e => e.trim());
                if (!current_param || current_param.length <= 1) continue;
                const srg_parts = current_param[0].replace(/_/g, " ").trim().split(" ");
                //new params (tsrg2), this shouldn't be used as I didn't add 1.17 mcp mappings to the override list
                if (srg_parts.length == 2) {
                    for (const method of this.srgMethods.get(srg_parts[1]) ?? []) {
                        for (const paramEntry of method.params.get(MappingTypes.SRG)?.entries() ?? []) {
                            if (paramEntry[1] == current_param[0]) {
                                if (!method.params.has(MappingTypes.MCP)) method.params.set(MappingTypes.MCP, new Map());
                                method.params.get(MappingTypes.MCP)?.set(paramEntry[0], current_param[1]);
                            }
                        }
                    }
                } else {
                    for (const method of this.srgMethods.get(srg_parts[1]) ?? []) {
                        if (!method.params.has(MappingTypes.MCP)) method.params.set(MappingTypes.MCP, new Map());
                        method.params.get(MappingTypes.MCP)?.set(parseInt(srg_parts[2]), current_param[1])
                    }
                }
            }
        }

        this.loadedMappings.add(MappingTypes.MCP);
        profilerDel("Parsing MCP Mappings");
    }

    async getIntermediaryMappings() {
        let res: Response;
        profiler("Downloading Yarn Intermediary Mappings");
        if (mcVersionCompare(this.mcversion, "1.14") != -1)
            res = await fetch(`https://maven.fabricmc.net/net/fabricmc/intermediary/${this.mcversion}/intermediary-${this.mcversion}-v2.jar`);
        else
            res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/intermediary/${this.mcversion}/intermediary-${this.mcversion}-v2.jar`);
        profilerDel("Downloading Yarn Intermediary Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        const mappings = await zipContent.file("mappings/mappings.tiny")?.async("string");
        if (mappings) {~
            await this.loadIntermediaryMappings(mappings);
        } else {
            console.error("ERROR PARSING INTERMEDIARY MAPPINGS ZIP!");
        }
    }

    async loadIntermediaryMappings(int_mappings: string) {
        if (this.loadedMappings.has(MappingTypes.INTERMEDIARY)) this.clearMappings(MappingTypes.INTERMEDIARY);
        profiler("Parsing Intermediary Mappings");
        const class_mappings = int_mappings.split("\nc").map(e => e.split("\n").map(c => c.split("\t", -1)));
        const first_line = class_mappings.shift();
        if (!first_line) {
            console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE!");
            return;
        }

        await this.parseTinyFile(int_mappings, MappingTypes.OBF, MappingTypes.INTERMEDIARY);


        this.loadedMappings.add(MappingTypes.INTERMEDIARY);
        profilerDel("Parsing Intermediary Mappings");
    }

    async getYarnMappings(version: number) {
        profiler("Downloading Yarn Mappings");
        let res: Response;
        if (mcVersionCompare(this.mcversion, "1.14") != -1)
            res = await fetch(`https://maven.fabricmc.net/net/fabricmc/yarn/${this.mcversion}+build.${version}/yarn-${this.mcversion}+build.${version}-v2.jar`);
        else
            res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/yarn/${this.mcversion}+build.${version}/yarn-${this.mcversion}+build.${version}-v2.jar`);
        profilerDel("Downloading Yarn Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const mappings = await zipContent.file("mappings/mappings.tiny")?.async("string");
        if (mappings) {
            await this.loadYarnMappings(mappings);
        } else {
            console.error("ERROR PARSING YARN MAPPINGS ZIP!");
        }
    }

    async loadYarnMappings(yarn_mappings: string) {
        if (this.loadedMappings.has(MappingTypes.YARN)) this.clearMappings(MappingTypes.YARN);
        profiler("Parsing Yarn Mappings");
        if (!this.loadedMappings.has(MappingTypes.INTERMEDIARY)) {
            await this.getIntermediaryMappings();
            if (!this.loadedMappings.has(MappingTypes.INTERMEDIARY)) {
                alert("FAILED TO LOAD INTERMEDIARY DEPENDENCY");
                return;
            }
        }

        //yarn v2's are backwards from 1.14-1.14.2
        const reversed = mcVersionCompare(this.mcversion, "1.14.2") < 1 && mcVersionCompare(this.mcversion, "1.14") > -1;

        await this.parseTinyFile(yarn_mappings, MappingTypes.INTERMEDIARY, MappingTypes.YARN, reversed);

        this.loadedMappings.add(MappingTypes.YARN);
        profilerDel("Parsing Yarn Mappings");
    }

    async parseTinyFile(contents: string, mapping_From: MappingTypes, mapping_To: MappingTypes, reversed?: boolean) {
        const class_mappings = contents.split("\nc").map(e => e.split("\n").map(c => c.split("\t", -1)));
        const first_line = class_mappings.shift();
        if (!first_line) {
            console.error("ERROR PARSING YARN MAPPINGS FILE!");
            return;
        }

        let current: ClassItem | null = null;
        let current_param: string | null = null;

        for (const clazz of class_mappings) {
            const class_def = clazz[0];
            const from = class_def?.[reversed ? 2 : 1];
            const to = class_def?.[reversed ? 1 : 2];
            if (!from || !to) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, bad class definition???");
                continue;
            }

            let current_class = await this.getOrAddClass(from, mapping_From);
            if (current_class === null) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, could not find intermediaries for class: " + from + " " + to);
                continue;
            }
            current_class.addMapping(mapping_To, to);
        }

        for (const clazz of class_mappings) {
            const class_def = clazz.shift();
            const from = class_def?.[reversed ? 2 : 1];
            const to = class_def?.[reversed ? 1 : 2];
            if (!from || !to) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, bad class definition???");
                continue;
            }

            let current_class = await this.getOrAddClass(from, mapping_From);
            if (current_class === null) {
                continue;
            }

            for (const item of clazz) {
                //skip empty line
                if (item.join("").trim() === "") continue;
                switch (item[1]) {
                    // class comment
                    case "c":
                        current_class.comments.set(mapping_To, item.slice(2).join("\t").replace(/\\n/g, "<br>"));
                        break;
                    // class method
                    case "m":
                        current = current_class.getOrAddMethod(item[reversed ? 4 : 3], reversed ? this.transformDesc(this.reverseTransformDesc(item[2], mapping_To), mapping_From) ?? item[2] : item[2], mapping_From);
                        current?.addMapping(mapping_To, item[reversed ? 3 : 4]);
                        break;
                    // class field
                    case "f":
                        current = current_class.getOrAddField(item[reversed ? 4 : 3], reversed ? this.transformDesc(this.reverseTransformDesc(item[2], mapping_To), mapping_From) ?? item[2] : item[2], mapping_From);
                        current?.addMapping(mapping_To, item[reversed ? 3 : 4]);
                        break;
                    case "":
                        switch (item[2]) {
                            // item comment
                            case "c":
                                current?.comments.set(mapping_To, item.slice(3).join("\t").replace(/\\n/g, "<br>"));
                                break;
                            // item param
                            case "p":
                                if (current && current instanceof MethodData) {
                                    if (!current.params.has(mapping_To)) current.params.set(mapping_To, new Map());
                                    current.params.get(mapping_To)?.set(parseInt(item[3]), current_param = item[5]);
                                } else {
                                    console.error("ERROR PARSING YARN MAPPINGS FILE, param on field??? " + item.join(","));
                                }
                                break;
                            case "":
                                switch (item[3]) {
                                    //param comment
                                    case "c":
                                        current?.comments.set(mapping_To, (current?.comments.get(mapping_To) ?? "") + `<br>@param ${current_param} ${item.slice(4).join("\t").replace(/\\n/g, "<br>")}`);
                                        break;
                                    default:
                                        console.error("ERROR PARSING YARN MAPPINGS FILE, unknown item-item element: " + item.join(","));
                                }
                                break;
                            default:
                                console.error("ERROR PARSING YARN MAPPINGS FILE, unknown class item element: " + item.join(","));
                        }
                        break;
                    default:
                        console.error(item);
                        console.error("ERROR PARSING YARN MAPPINGS FILE, unknown class element: " + item.join(","));
                }
            }
        }
    }

    async getHashedMappings() {
        profiler("Downloading Yarn Intermediary Mappings");
        const hashed = hashedMojmapManifest[this.mcversion];
        let metaRes: Response = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/snapshot/org/quiltmc/${hashed}/${this.mcversion}-SNAPSHOT/maven-metadata.xml`);

        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        const current = interXML.getElementsByTagName("snapshot")[0];
        const timestamp = current.getElementsByTagName("timestamp")[0].innerHTML;
        const build = current.getElementsByTagName("buildNumber")[0].innerHTML;


        let res: Response = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/snapshot/org/quiltmc/${hashed}/${this.mcversion}-SNAPSHOT/${hashed}-${this.mcversion}-${timestamp}-${build}.jar`);
        profilerDel("Downloading Yarn Intermediary Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        const mappings = await zipContent.file("hashed/mappings.tiny")?.async("string");
        if (mappings) {
            await this.loadHashedMappings(mappings);
        } else {
            console.error("ERROR PARSING INTERMEDIARY MAPPINGS ZIP!");
        }
    }

    async loadHashedMappings(hashed_mappings: string) {
        if (this.loadedMappings.has(MappingTypes.HASHED)) this.clearMappings(MappingTypes.HASHED);
        profiler("Parsing Hashed Mojmap Mappings");
        const class_mappings = hashed_mappings.split("\nc").map(e => e.split("\n").map(c => c.split("\t", -1)));
        const first_line = class_mappings.shift();
        if (!first_line) {
            console.error("ERROR PARSING HASHED MAPPINGS FILE!");
            return;
        }

        await this.parseTinyFile(hashed_mappings, MappingTypes.OBF, MappingTypes.HASHED);

        this.loadedMappings.add(MappingTypes.HASHED);
        profilerDel("Parsing Hashed Mojmap Mappings");
    }

    async getQuiltMappings(version: number) {
        profiler("Downloading Quilt Mappings");
        let res: Response = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-mappings/${this.mcversion}+build.${version}/quilt-mappings-${this.mcversion}+build.${version}-v2.jar`);
        profilerDel("Downloading Quilt Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const mappings = await zipContent.file("hashed/mappings.tiny")?.async("string");
        if (mappings) {
            await this.loadQuiltMappings(mappings);
        } else {
            console.error("ERROR PARSING QUILT MAPPINGS ZIP!");
        }
    }

    async loadQuiltMappings(quilt_mappings: string) {
        if (this.loadedMappings.has(MappingTypes.QUILT)) this.clearMappings(MappingTypes.QUILT);
        profiler("Parsing Quilt Mappings");
        if (!this.loadedMappings.has(MappingTypes.HASHED)) {
            await this.getHashedMappings();
            if (!this.loadedMappings.has(MappingTypes.HASHED)) {
                alert("FAILED TO LOAD HASHED MOJMAP DEPENDENCY");
                return;
            }
        }

        await this.parseTinyFile(quilt_mappings, MappingTypes.HASHED, MappingTypes.QUILT);

        this.loadedMappings.add(MappingTypes.QUILT);
        profilerDel("Parsing Quilt Mappings");
    }

    async clearMappings(mappingType: MappingTypes) {
        if (mappingType == MappingTypes.SRG) {
            this.srgMethods.clear();
            this.srgFields.clear();
        }
        this.classes.forEach(clazz => {
            clazz.mappings.delete(mappingType);
            clazz.comments.delete(mappingType);
            clazz.fields.forEach(field => {
                field.mappings.delete(mappingType);
                field.comments.delete(mappingType);
            })
            clazz.methods.forEach(method => {
                method.params.delete(mappingType);
                method.mappings.delete(mappingType);
                method.comments.delete(mappingType);
            })
        })
        this.loadedMappings.delete(mappingType);
    }
}

abstract class AbstractData {
    readonly classMappings: ClassMappings;
    readonly obfName: string;
    readonly mappings: Map<MappingTypes, string> = new Map();
    readonly comments: Map<MappingTypes, string> = new Map();

    protected constructor(classMappings: ClassMappings, obfName: string) {
        this.classMappings = classMappings;
        this.obfName = obfName;
    }

    addMapping(mappingType: MappingTypes, name: string, comment?: string) {
        if (mappingType === MappingTypes.OBF) {
            throw new Error("Tried to change obf name!");
        }
        this.mappings.set(mappingType, name);
        if (comment)
            this.comments.set(mappingType, comment);
    }

    getMapping(mappingType: MappingTypes) {
        if (mappingType === MappingTypes.OBF) {
            return this.obfName;
        }
        return this.mappings.get(mappingType) ?? "-";
    }

    getMappingWithFallback(mappingType: MappingTypes, fallbackMappingType: MappingTypes) {
        if (mappingType === MappingTypes.OBF) {
            return this.obfName;
        }
        let mapping = this.mappings.get(mappingType);
        if (!mapping) {
            if (fallbackMappingType === MappingTypes.OBF) {
                return this.obfName;
            }
            mapping = this.mappings.get(fallbackMappingType);
        }
        return mapping ?? "-";
    }
    
    getMappingWithDoubleFallback(mappingType: MappingTypes, fallbackMappingType: MappingTypes, fallback2MappingType: MappingTypes) {
        if (mappingType === MappingTypes.OBF) {
            return this.obfName;
        }
        let mapping = this.mappings.get(mappingType);
        if (!mapping) {
            if (fallbackMappingType === MappingTypes.OBF) {
                return this.obfName;
            }
            mapping = this.mappings.get(fallbackMappingType);
        }
        if (!mapping) {
            if (fallback2MappingType === MappingTypes.OBF) {
                return this.obfName;
            }
            mapping = this.mappings.get(fallback2MappingType);
        }
        return mapping ?? "-";
    }

    getComment(mappingType: MappingTypes) {
        return this.comments.get(mappingType);
    }

}

abstract class ClassItem extends AbstractData {
    protected obfDesc: string | null;
    protected readonly descriptors: Map<MappingTypes, string> = new Map();

    constructor(classMappings: ClassMappings, obfName: string, obfDesc: string | null) {
        super(classMappings, obfName);
        this.obfDesc = obfDesc;
    }

    transformDescriptor(mappingType: MappingTypes): string | null {
        if (this.obfDesc == null) return null;
        if (MappingTypes.OBF == mappingType) {
            return this.obfDesc;
        }
        return this.obfDesc.replace(/L(.+?);/g, (match, p1) => {
            return `L${this.classMappings.classes.get(p1)?.mappings.get(mappingType) ?? p1};`;
        });
    }

    transformDescriptorWithFallback(mappingType: MappingTypes, fallbackMappingType: MappingTypes): string | null {
        if (this.obfDesc == null) return null;
        if (MappingTypes.OBF == mappingType) {
            return this.obfDesc;
        }
        return this.obfDesc.replace(/L(.+?);/g, (match, p1) => {
            const clz = this.classMappings.classes.get(p1);
            const mapped = clz?.getMappingWithFallback(mappingType, fallbackMappingType);
            return `L${!mapped || mapped == "-" ? p1 : mapped};`;
        });
    }

    transformDescriptorWithDoubleFallback(mappingType: MappingTypes, fallbackMappingType: MappingTypes, fallback2MappingType: MappingTypes): string | null {
        if (this.obfDesc == null) return null;
        if (MappingTypes.OBF == mappingType) {
            return this.obfDesc;
        }
        return this.obfDesc.replace(/L(.+?);/g, (match, p1) => {
            const clz = this.classMappings.classes.get(p1);
            const mapped = clz?.getMappingWithDoubleFallback(mappingType, fallbackMappingType, fallback2MappingType);
            return `L${mapped == "-" ? p1 : mapped};`;
        });
    }

    setDescriptor(mappingType: MappingTypes, desc: string) {
        if (mappingType === MappingTypes.OBF) {
            if (this.obfDesc != null) throw new Error("Tried to change obf descriptor!");
            else this.obfDesc = desc;
            return
        }
        this.descriptors.set(mappingType, desc);
    }

    getDescriptor(mappingType: MappingTypes) {
        if (mappingType === MappingTypes.OBF) {
            return this.obfDesc;
        }
        if (!this.descriptors.has(mappingType)) {
            const newDesc = this.transformDescriptor(mappingType);
            if (newDesc) {
                this.descriptors.set(mappingType, newDesc);
            }
            return newDesc;
        }
        return this.descriptors.get(mappingType);
    }

    abstract getKey(): string;
}

class MethodData extends ClassItem {
    readonly params: Map<MappingTypes, Map<number, string>> = new Map();

    getKey(): string {
        return this.obfName + this.obfDesc;
    }

}

class FieldData extends ClassItem {

    getKey(): string {
        return this.obfName;
    }
}

class ClassData extends AbstractData {
    fields: Map<string, FieldData> = new Map();
    methods: Map<string, MethodData> = new Map();

    constructor(mappings: ClassMappings, obfName: string) {
        super(mappings, obfName);
    }

    getOrAddField(field_name: string, field_desc: string | null, mapping: MappingTypes): FieldData | null {
        for (const field of this.fields.values()) {
            if (field.getMapping(mapping) === field_name || field.getMapping(MappingTypes.OBF) === field_name) {
                return field;
            }
        }
        const obfDesc = this.classMappings.reverseTransformDesc(field_desc, mapping);
        if (mapping != MappingTypes.OBF) console.log(`adding ${this.obfName};${field_name}:${obfDesc}`)
        const fd = new FieldData(this.classMappings, field_name, obfDesc);
        this.fields.set(fd.getKey(), fd);
        return fd;
    }

    getOrAddMethod(method_name: string, method_desc: string, mapping: MappingTypes): MethodData | null {
        for (const method of this.methods.values()) {
            if ((method.getMapping(mapping) === method_name || method.getMapping(MappingTypes.OBF) === method_name) && method.getDescriptor(mapping) === method_desc) {
                return method;
            }
        }
        const obfDesc = this.classMappings.reverseTransformDesc(method_desc, mapping);
        if (mapping != MappingTypes.OBF) console.log(`adding ${this.obfName};${method_name}${obfDesc}`)
        const fd = new MethodData(this.classMappings, method_name, obfDesc);
        this.methods.set(fd.getKey(), fd);
        return fd;
    }
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


function getEnabledMappings(mcVersion: MCVersionSlug): MappingTypes[] {
    const checked: MappingTypes[] = [];

    if (mcVersionCompare(mcVersion, "1.14.4") != -1) {
        mojangMappingCheck.disabled = false;
        if (mojangMappingCheck.checked) {
            checked.push(MappingTypes.MOJMAP);
        }
    } else {
        mojangMappingCheck.disabled = true;
    }

    if (mcVersion in parchmentManifest) {
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

    if (mcVersion in yarnManifest) {
        yarnIntermediaryMappingCheck.disabled = false;
        if (yarnIntermediaryMappingCheck.checked) {
            checked.push(MappingTypes.INTERMEDIARY);
        }
    } else {
        yarnIntermediaryMappingCheck.disabled = true;
    }

    if (mcVersion in yarnManifest && yarnManifest[mcVersion].length) {
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

    if (mcVersion in mcpManifest) {
        srgMappingCheck.disabled = false;
        if (srgMappingCheck.checked) {
            checked.push(MappingTypes.SRG);
        }
    } else {
        srgMappingCheck.disabled = true;
    }

    if (mcpManifest[mcVersion]) {
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

    if (mcVersion in hashedMojmapManifest) {
        hashedMojmapCheck.disabled = false;
        if (hashedMojmapCheck.checked) {
            checked.push(MappingTypes.HASHED);
        }
    } else {
        hashedMojmapCheck.disabled = true;
    }

    if (mcVersion in quiltManifest) {
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
    const enabledMappings = getEnabledMappings(mappings.mcversion);
    versionData.innerHTML = mappings.mcversion + ": " + enabledMappings.map(e => {
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
    window.history.replaceState({}, '', `${window.location.href.split('?')[0]}?version=${versionSelect.value}&mapping=${enabledMappings.map(e => MappingTypes[e]).join(",")}&search=${value}`);
    profiler("Searching");

    setTopbars(enabledMappings);

    value = value.toLowerCase().trim();

    //clear all tables
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    mappings.classes.forEach((classData, obfName) => {
        if (value === "") {
            addClass(classData, enabledMappings, "");
            return;
        }

        if (type === SearchType.KEYWORD || type == SearchType.CLASS) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                if (classData.getMapping(i).toLowerCase().includes(value)) {
                    addClass(classData, enabledMappings, value);
                    return;
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.METHOD) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                for (const method of classData.methods.values()) {
                    if (method.getMapping(i).toLowerCase().includes(value)) {
                        addClass(classData, enabledMappings, value);
                        return;
                    }
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.FIELD) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                for (const field of classData.fields.values()) {
                    if (field.getMapping(i).toLowerCase().includes(value)) {
                        addClass(classData, enabledMappings, value);
                        return;
                    }
                }
            }
        }
    });

    profilerDel("Searching");
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

    row.onclick = () => {
        if (selectedClass) selectedClass.classList.remove("selectedClass");
        row.classList.add("selectedClass");
        selectedClass = row;
        loadClass(classData, enabledMappings, searchValue);
        loadComment(classData);
    };

    ClassTable.appendChild(row);
}


//class method + field display stuff
function loadClass(classData: ClassData, enabledMappings: MappingTypes[], searchValue: string) {
    selectedMethod = null;
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";
    const fallbackTOOBF = fallbackToOBF.checked;

    //methods
    for (const [methodName, methodData] of classData.methods) {
        if (!methodName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        row.classList.add("MethodRow");
        obf.innerHTML = methodName.replace("<", "&lt;").replace(">", "&gt;");
        row.appendChild(obf);

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("td");
            mojang.innerHTML = methodData.getMappingWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP).replace("<", "&lt;").replace(">", "&gt;");
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += methodData.transformDescriptorWithFallback(MappingTypes.MOJMAP, MappingTypes.OBF);
            }
            row.appendChild(mojang);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            const srg = document.createElement("td");
            srg.innerHTML = methodData.getMappingWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG).replace("<", "&lt;").replace(">", "&gt;");
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += methodData.transformDescriptorWithFallback(MappingTypes.SRG, MappingTypes.OBF);
            }
            row.appendChild(srg);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("td");
            mcp.innerHTML = methodData.getMappingWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG).replace("<", "&lt;").replace(">", "&gt;");
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += methodData.transformDescriptorWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, MappingTypes.OBF);
            }
            row.appendChild(mcp);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = methodData.getMappingWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY).replace("<", "&lt;").replace(">", "&gt;");
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += methodData.transformDescriptorWithFallback(MappingTypes.INTERMEDIARY, MappingTypes.OBF);
            }
            row.appendChild(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("td");
            yarn.innerHTML = methodData.getMappingWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY).replace("<", "&lt;").replace(">", "&gt;");
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += methodData.transformDescriptorWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, MappingTypes.OBF);
            }
            row.appendChild(yarn);
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            const hashed = document.createElement("td");
            hashed.innerHTML = methodData.getMappingWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED).replace("<", "&lt;").replace(">", "&gt;");
            if (hashed.innerHTML != "-" && yarnSignatureCheck.checked) {
                hashed.innerHTML += methodData.transformDescriptorWithFallback(MappingTypes.HASHED, MappingTypes.OBF);
            }
            row.appendChild(hashed);
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("td");
            quilt.innerHTML = methodData.getMappingWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED).replace("<", "&lt;").replace(">", "&gt;");
            if (quilt.innerHTML != "-" && yarnSignatureCheck.checked) {
                quilt.innerHTML += methodData.transformDescriptorWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, MappingTypes.OBF);
            }
            row.appendChild(quilt);
        }

        row.onclick = () => {
            if (selectedMethod) selectedMethod.classList.remove("selectedMethod");
            row.classList.add("selectedMethod");
            selectedMethod = row;
            loadMethod(methodData, enabledMappings);
            loadComment(methodData);
        }

        MethodTable.appendChild(row);
    }

    //@ts-ignore
    if (searchValue != "") for (const child: HTMLElement of MethodTable.children) {
        if (child.innerText.toLowerCase().includes(searchValue)) {
            child.offsetParent?.scrollTo(0, child.offsetTop-(child.offsetHeight));
            child.click();
            break;
        }
    }

    //fields
    for (const [fieldName, fieldData] of classData.fields) {
        if (!fieldName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        row.classList.add("FieldRow");
        obf.innerHTML = fieldName + ":" + fieldData.transformDescriptor(MappingTypes.OBF);
        row.appendChild(obf);

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("td");
            mojang.innerHTML = fieldData.getMappingWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP);
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += fieldData.transformDescriptorWithFallback(MappingTypes.MOJMAP, MappingTypes.OBF);
            }
            row.appendChild(mojang);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            const srg = document.createElement("td");
            srg.innerHTML = fieldData.getMappingWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += fieldData.transformDescriptorWithFallback(MappingTypes.SRG, MappingTypes.OBF);
            }
            row.appendChild(srg);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("td");
            mcp.innerHTML = fieldData.getMappingWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += fieldData.transformDescriptorWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, MappingTypes.OBF);
            }
            row.appendChild(mcp);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = fieldData.getMappingWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += fieldData.transformDescriptorWithFallback(MappingTypes.INTERMEDIARY, MappingTypes.OBF);
            }
            row.appendChild(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("td");
            yarn.innerHTML = fieldData.getMappingWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += fieldData.transformDescriptorWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, MappingTypes.OBF);
            }
            row.appendChild(yarn);
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            const hashed = document.createElement("td");
            hashed.innerHTML = fieldData.getMappingWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            if (hashed.innerHTML != "-" && yarnSignatureCheck.checked) {
                hashed.innerHTML += fieldData.transformDescriptorWithFallback(MappingTypes.HASHED, MappingTypes.OBF);
            }
            row.appendChild(hashed);
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            const quilt = document.createElement("td");
            quilt.innerHTML = fieldData.getMappingWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            if (quilt.innerHTML != "-" && yarnSignatureCheck.checked) {
                quilt.innerHTML += fieldData.transformDescriptorWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, MappingTypes.OBF);
            }
            row.appendChild(quilt);
        }

        row.onclick = () => {
            loadComment(fieldData);
        }

        FieldTable.appendChild(row);
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

function loadComment(data: AbstractData) {
    commentHolder.innerHTML = "";
    data.comments.forEach((comment, mapping) => {
        if (!getEnabledMappings(mappings.mcversion).includes(mapping)) return;
        const header = document.createElement("h4");
        header.innerHTML = MappingTypes[mapping];
        commentHolder.appendChild(header);
        const content = document.createElement("p");
        content.innerHTML = comment;
        commentHolder.appendChild(content);
    });
}

enum MappingFileTypes {
    SRG, TINY, TSRG, TSRG2, MCP, PROGUARD, PARCHMENT
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
        if (zf = zip.file("mappings/mappings.tiny")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.TINY;
        } else if (zf = zip.file("hashed/mappings.tiny")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.TINY;
        } else if (zf = zip.file("joined.srg")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.SRG;
        } else if (zf = zip.file("config/joined.tsrg")) {
            contents = await zf.async("string");
            mappingType = contents.startsWith("tsrg2") ? MappingFileTypes.TSRG2 : MappingFileTypes.TSRG;
        } else if (zf = zip.file("parchment.json")) {
            contents = await zf.async("string");
            mappingType = MappingFileTypes.PARCHMENT;
        } else if (zf = zip.file("fields.csv")) {
            contents = zip;
            mappingType = MappingFileTypes.MCP;
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

    if (intermediaryImport.checked) {
        if (mappingType === MappingFileTypes.TINY) {
            yarnIntermediaryMappingCheck.checked = true;
            await mappings.loadIntermediaryMappings(<string>contents);
        } else {
            alert("Intermediary mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (yarnImport.checked) {
        if (mappingType === MappingFileTypes.TINY) {
            yarnMappingCheck.checked = true;
            yarnVersionSelect.value = "CUSTOM";
            await mappings.loadYarnMappings(<string>contents);
        } else {
            alert("Yarn mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (mojmapImport.checked) {
        if (mappingType === MappingFileTypes.PROGUARD) {
            mojangMappingCheck.checked = true;
            await mappings.loadMojangMappings(<string>contents);
        } else {
            alert("Mojmap mappings can only be imported from proguard mappings.");
            return;
        }
    } else if (parchmentImport.checked) {
        if (mappingType === MappingFileTypes.PARCHMENT) {
            parchmentMappingCheck.checked = true;
            parchmentVersionSelect.value = "CUSTOM";
            await mappings.loadParchmentMappings(<string>contents);
        } else {
            alert("Parchment mappings can only be imported from parchment mappings (json).");
            return;
        }
    } else if (mcpImport.checked) {
        if (mappingType === MappingFileTypes.MCP) {
            mcpMappingCheck.checked = true;
            mcpVersionSelect.value = "CUSTOM";
            await mappings.loadMCPMappings(<{file(path: string): JSZipObject | null}>contents);
        } else {
            alert("MCP mappings can only be imported from mcp mappings (zip of CSVs).");
            return;
        }
    } else if (srgImport.checked) {
        if (mappingType === MappingFileTypes.SRG) {
            srgMappingCheck.checked = true;
            await mappings.loadSRGMappings(SRGVersion.SRG, <string>contents);
        } else if (mappingType === MappingFileTypes.TSRG) {
            srgMappingCheck.checked = true;
            await mappings.loadSRGMappings(SRGVersion.TSRG, <string>contents);
        } else if (mappingType === MappingFileTypes.TSRG2) {
            srgMappingCheck.checked = true;
            await mappings.loadSRGMappings(SRGVersion.TSRG2, <string>contents);
        } else {
            alert("SRG mappings can only be imported from srg mappings (srg or tsrg).");
            return;
        }
    } else if (hashedImport.checked) {
        if (mappingType === MappingFileTypes.TINY) {
            hashedMojmapCheck.checked = true;
            await mappings.loadHashedMappings(<string>contents);
        } else {
            alert("Hashed mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (quiltImport.checked) {
        if (mappingType === MappingFileTypes.TINY) {
            quiltMappingCheck.checked = true;
            quiltVersionSelect.value = "CUSTOM";
            await mappings.loadQuiltMappings(<string>contents);
        } else {
            alert("Quilt mappings can only be imported from tiny mappings.");
            return;
        }
    } else {
        alert("No import type selected");
        return;
    }
    importPop.style.display = "none";
}

async function updateExportMappingOptions() {
    const maps: Set<MappingTypes> = new Set(mappings.loadedMappings);
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
        case MappingTypes.OBF:
            return map;
        case MappingTypes.MOJMAP:
            return MappingTypes.OBF;
        case MappingTypes.PARCHMENT:
            return MappingTypes.MOJMAP;
        case MappingTypes.SRG:
            return MappingTypes.OBF;
        case MappingTypes.MCP:
            return MappingTypes.SRG;
        case MappingTypes.INTERMEDIARY:
            return MappingTypes.OBF;
        case MappingTypes.YARN:
            return MappingTypes.INTERMEDIARY;
        case MappingTypes.HASHED:
            return MappingTypes.OBF;
        case MappingTypes.QUILT:
            return MappingTypes.OBF;
    }
}

async function exportMappings() {
    let exportString = `tiny\t2\t0\t${exportFromName.value}\t${exportToName.value}`;
    const from_mapping: MappingTypes = parseInt(exportFrom.value);
    const to_class_mapping: MappingTypes = parseInt(exportToClass.value);
    const to_content_mapping: MappingTypes = parseInt(exportToContent.value);
    const to_meta_mapping: MappingTypes = parseInt(exportToMeta.value);
    const fallback_from = getFallbackMapping(from_mapping);
    const fallback_to_class = getFallbackMapping(to_class_mapping);
    const fallback_to_content = getFallbackMapping(to_content_mapping);

    for (const clz of mappings.classes.values()) {
        const from_class = clz.getMappingWithDoubleFallback(from_mapping, fallback_from, MappingTypes.OBF);
        let to_class = clz.getMappingWithFallback(to_class_mapping, fallback_to_class);
        if (to_class === "-") {
            to_class = from_class;
        }
        exportString += `\nc\t${from_class}\t${to_class}`;

        const to_contents = clz.getComment(to_meta_mapping);
        if (to_contents) {
            exportString += `\n\t${to_contents.replace("<br>", "\\n")}`;
        }
        for (const md of clz.methods.values()) {
            const from_method = md.getMappingWithDoubleFallback(from_mapping, fallback_from, MappingTypes.OBF);
            let to_method = md.getMappingWithFallback(to_content_mapping, fallback_to_content);
            if (to_method === "-") {
                to_method = from_method;
            }
            exportString += `\n\tm\t${md.transformDescriptorWithFallback(from_mapping, fallback_from)}\t${from_method}\t${to_method}`;
            const to_comment = md.getComment(to_meta_mapping);
            if (to_comment) {
                exportString += `\n\t\tc${to_comment.replace("<br>", "\\n")}`;
            }
            for (const [i, p] of [...md.params.get(to_meta_mapping)?.entries() ?? []].sort((e,d) => e[0] - d[0])) {
                exportString += `\n\t\tp\t${i}\t\t${p}`;
            }

            //TODO: param comments as seperate here
        }

        for (const fd of clz.fields.values()) {
            const from_field = fd.getMappingWithDoubleFallback(from_mapping, fallback_from, MappingTypes.OBF);
            let to_field = fd.getMappingWithFallback(to_content_mapping, fallback_to_content);
            if (to_field === "-") {
                to_field = from_field;
            }
            exportString += `\n\tf\t${fd.transformDescriptorWithFallback(from_mapping, fallback_from)}\t${from_field}\t${to_field}`;
            const to_comment = fd.getComment(to_meta_mapping);
            if (to_comment) {
                exportString += `\n\t\tc${to_comment.replace("<br>", "\\n")}`;
            }
        }
    }
    download(exportString, "mappings.tiny", "text/plain");

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
        mappings = new ClassMappings(<MCVersionSlug>(<HTMLSelectElement>e.target).value);
        localStorage.setItem("versionSelect.value", (<HTMLSelectElement>e.target).value);
        mappings.loadEnabledMappings(getEnabledMappings(mappings.mcversion)).then(() => {
            search(searchInput.value, parseInt(searchType.value));
        });
    });

    mcpVersionSelect.addEventListener("change", (e) => {
        const parts = (<HTMLSelectElement>e.target).value.split("-");
        mappings.getMCPMappings(<any>parts[0], parts[1]).then(() => {
            search(searchInput.value, parseInt(searchType.value));
        });
    });

    yarnVersionSelect.addEventListener("change", (e) => {
        mappings.getYarnMappings(parseInt((<HTMLSelectElement>e.target).value)).then(() => {
            search(searchInput.value, parseInt(searchType.value));
        });
    });

    searchInput.addEventListener("keyup", (e) => {
        if (e.code === "Enter") {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    // checkbox change events
    mojangMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("mojangMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getMojangMappings().then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    parchmentMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("parchmentMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getParchmentMappings(parchmentVersionSelect.value).then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    srgMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("srgMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getSrgMappings();
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    mcpMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("mcpMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        const parts = mcpVersionSelect.value.split("-");
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getMCPMappings(<any>parts[0], parts[1]).then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    yarnIntermediaryMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("yarnIntermediaryMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getIntermediaryMappings().then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    yarnMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("yarnMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getYarnMappings(parseInt(yarnVersionSelect.value)).then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    hashedMojmapCheck.addEventListener("change", (e) => {
        localStorage.setItem("hashedMojmapCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getHashedMappings().then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    quiltMappingCheck.addEventListener("change", (e) => {
        localStorage.setItem("quiltMappingCheck.value", (<HTMLInputElement>e.target).checked.toString());
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getQuiltMappings(parseInt(quiltVersionSelect.value)).then(() => {
                search(searchInput.value, parseInt(searchType.value));
            });
        } else {
            search(searchInput.value, parseInt(searchType.value));
        }
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
        await mappings.clearMappings(MappingTypes.MOJMAP);
        search(searchInput.value, parseInt(searchType.value));
    });

    searchButton.addEventListener("click", () => {
        search(searchInput.value, parseInt(searchType.value));
    })

    loadMinecraftVersions().then(() => {
        mappings.loadEnabledMappings(getEnabledMappings(mappings.mcversion)).then(() => {
            search(searchInput.value, parseInt(searchType.value));
        });
    });

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
        await updateExportMappingOptions();
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
        await exportMappings();
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