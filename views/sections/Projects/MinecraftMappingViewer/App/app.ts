import * as jsz from "jszip";
import { JSZipObject } from "jszip";
import { query } from "express";

export = 0;

declare const JSZip: jsz;

declare const versionSelect: HTMLSelectElement;
declare const showSnapshots: HTMLInputElement;
declare const searchInput: HTMLInputElement;
declare const loadingProfiler: HTMLParagraphElement;

const NO_CORS_BYPASS = "https://cors.wagyourtail.xyz";

const zip = new JSZip();
let mcManifest: MCVersionManifest;
let yarnManifest: YarnVersionManifest;
let mcpManifest: MCPVersionManifest;

let mappings: ClassMappings;

type ReleaseVersion = `${number}.${number}` | `${number}.${number}.${number}`;
type Snapshot = `${number}w${number}${"a"|"b"|"c"|"d"|"e"}` | `${ReleaseVersion}-pre${number}` | `${ReleaseVersion}-rc${number}`;
type MCVersionSlug =  ReleaseVersion | Snapshot;

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
        if (version.type === "release" || (showSnapshots.checked && version.type === "snapshot")) {
            const option = document.createElement("option");
            option.value = option.innerHTML = version.id;
            versionSelect.appendChild(option);
        }
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
        profilerDel("Getting Legacy Yarn Versions")
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

    const rawParams = window.location.search?.substring(1);
    if (rawParams) {
        const params = new Map(<[string, string][]>window.location.search.substring(1).split("&").map(e => e.split("=", 2)));
        if (params.has("mapping")) {
            for (const map of params.get("mapping")?.split(",") ?? []) {
                localStorage.setItem(map.trim()+"MappingCheck.value", "true");
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
    INTERMEDIARY, YARN
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
    }

    async loadEnabledMappings(enabledMappings: MappingTypes[]) {
        const newMappings = enabledMappings.filter(e => !this.loadedMappings.has(e));


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
        const mappings = (await request.text()).split("<").join("&lt;").split(">").join("&gt;").split(".").join("/");
        profilerDel("Downloading Mojang Mappings");
        await this.loadMojangMappings(mappings);
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
            const cNameData = classdata.shift()?.split("-&gt;");
            const cNamed = cNameData?.shift()?.trim();

            if (!cNamed) continue;

            const classItemData: ReversedMappings = {
                obf: cNameData?.shift()?.trim().replace(":", ""),
                fields: new Map(),
                methods: new Map()
            };

            if (!classItemData.obf) continue;

            for (const classItem of classdata) {
                const line = classItem.trim();
                const matchMethod = line.match(/^(?:\d+:\d+:)?([^\s]+)\s*([^\s]+)(\(.*?\))\s*-&gt;\s*([^\s]+)/);
                if (matchMethod) {
                    classItemData.methods.set(matchMethod[2], {retval:matchMethod[1], params:matchMethod[3], obf:matchMethod[4]});
                    continue;
                }
                const matchField = line.match(/^([^\d][^\s]+)\s*([^\s\(]+)\s*-&gt;\s*([^\s]+)/);
                if (matchField) {
                    classItemData.fields.set(matchField[2], {desc:matchField[1], obf:matchField[3]});
                }
            }
            reversedMappings.set(cNamed, classItemData);
        }

        // reverse reversed mappings and change method descriptors to correct format.
        reversedMappings.forEach((mappings, named) => {
            if (!mappings.obf) return;
            const classData = new ClassData(mappings.obf.replace(".", "/"));
            classData.mappings.set(MappingTypes.MOJMAP, named.replace(".", "/"));

            mappings.methods.forEach((methodMappings, named) => {
                const md = new MethodData(this, methodMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, methodMappings.params + methodMappings.retval))
                md.addMapping(MappingTypes.MOJMAP, named);
                classData.methods.set(md.getKey(), md);
            });

            mappings.fields.forEach((fieldMappings, named) => {
                const fd = new FieldData(this, fieldMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, fieldMappings.desc));
                fd.addMapping(MappingTypes.MOJMAP, named);
                classData.fields.set(fd.getKey(), fd);
            });

            this.classes.set(mappings.obf.replace(".", "/"), classData);
        })

        this.loadedMappings.add(MappingTypes.MOJMAP);
        profilerDel("Parsing Mojang Mappings");
    }

    private static transformProguardDescriptors(reversedMappings: Map<string, ReversedMappings>, desc: string): string {
        //method
        if (desc.includes("(")) {
            const match = desc.match(/\((.*)\)(.+)/);
            if (!match) throw new Error(`proguard method descriptor bad format "${desc}"`);
            if (match[1] == "") return "()" + ClassMappings.transformProguardClass(reversedMappings.get(match[2])?.obf ?? match[2])
            return match[1].split(",").map(e => ClassMappings.transformProguardClass(reversedMappings.get(e)?.obf ?? e)).join("") + ClassMappings.transformProguardClass(reversedMappings.get(match[2])?.obf ?? match[2]);
        //field
        } else {
            return ClassMappings.transformProguardClass(reversedMappings.get(desc)?.obf ?? desc);
        }
    }

    private static transformProguardClass(clazz: string): string {
        const dims = (clazz.match(/\[\]/g) ?? []).length;
        let sig: string;
        switch (clazz.replace("[]", "")) {
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
                sig = `L${clazz.replace("[]", "").replace(".", "/")};`
        }
        for (let i = 0; i < dims; ++i) {
            sig = "[" + sig;
        }
        return sig;
    }

    async getParchmentMappings() {
        //TODO
    }

    async loadParchmentMappings() {
        if (!this.loadedMappings.add(MappingTypes.MOJMAP)) {
            await this.getMojangMappings();
        }
        //TODO
    }

    async getSrgMappings() {
        //TODO
    }

    async loadSRGMappings(srgVersion: SRGVersion, srg_mappings: string) {
        //TODO
    }

    async getMCPMappings(channel: "stable" | "snapshot", version: string) {
        //TODO
    }

    async loadMCPMappings(mcp_zip: JSZipObject) {
        if (!this.loadedMappings.add(MappingTypes.SRG)) {
            await this.getSrgMappings();
        }
        //TODO
    }

    async getIntermediaryMappings() {
        //TODO
    }

    async loadIntermediaryMappings(int_mappings: string) {
        //TODO
    }

    async getYarnMappings(version: number) {
        //TODO
    }

    async loadYarnMappings(yarn_mappings: string) {
        if (!this.loadedMappings.add(MappingTypes.INTERMEDIARY)) {
            await this.getIntermediaryMappings();
        }
        //TODO
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

    getComment(mappingType: MappingTypes) {
        return this.comments.get(mappingType);
    }

}

abstract class ClassItem extends AbstractData {
    protected readonly obfDesc: string;
    protected readonly descriptors: Map<MappingTypes, string> = new Map();

    constructor(classMappings: ClassMappings, obfName: string, obfDesc: string) {
        super(classMappings, obfName);
        this.obfDesc = obfDesc;
    }

    abstract transformDescriptor(MappingType: MappingTypes): string;

    setDescriptor(mappingType: MappingTypes, desc: string) {
        if (mappingType === MappingTypes.OBF) {
            throw new Error("Tried to change obf descriptor!");
        }
        if (!this.descriptors.has(mappingType)) {
            this.setDescriptor(mappingType, this.transformDescriptor(mappingType));
        }
        this.descriptors.set(mappingType, desc);
    }

    getDescriptor(mappingType: MappingTypes) {
        if (mappingType === MappingTypes.OBF) {
            return this.obfDesc;
        }
        return this.descriptors.get(mappingType);
    }

    abstract getKey(): string;
}

class MethodData extends ClassItem {
    readonly params: Map<MappingTypes, Map<number, string>> = new Map();

    transformDescriptor(MappingType: MappingTypes): string {
        //TODO
        return "";
    }

    getKey(): string {
        return this.obfName + this.obfDesc;
    }

}

class FieldData extends ClassItem {
    transformDescriptor(MappingType: MappingTypes): string {
        //TODO
        return "";
    }

    getKey(): string {
        return this.obfName;
    }
}

class ClassData {
    readonly obfName: string;
    readonly mappings: Map<MappingTypes, string> = new Map();
    fields: Map<string, FieldData> = new Map();
    methods: Map<string, MethodData> = new Map();

    constructor(obfName: string) {
        this.obfName = obfName;
    }
}

declare const loading: HTMLElement;
declare const results: HTMLElement;

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

declare const mojangMappingCheck: HTMLInputElement;
declare const srgMappingCheck: HTMLInputElement;
declare const mcpMappingCheck: HTMLInputElement;
declare const yarnIntermediaryMappingCheck: HTMLInputElement;
declare const yarnMappingCheck: HTMLInputElement;

declare const yarnVersionSelect: HTMLSelectElement;
declare const mcpVersionSelect: HTMLSelectElement;
declare const searchType: HTMLSelectElement;


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

    return checked;
}

enum SearchType {
    KEYWORD, CLASS, METHOD, FIELD
}

declare const classTableHead: HTMLTableElement;
declare const methodTableHead: HTMLTableElement;
declare const fieldTableHead: HTMLTableElement;
declare const paramsTableHead: HTMLTableElement;

declare const classes: HTMLTableElement;
declare const method: HTMLTableElement;
declare const fields: HTMLTableElement;
declare const params: HTMLTableElement;

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
};

declare const ClassTable: HTMLTableElement;
declare const MethodTable: HTMLTableElement;
declare const ParamsTable: HTMLTableElement;
declare const FieldTable: HTMLTableElement;

async function search(value: string, type: SearchType) {
    setLoading(true);
    const enabledMappings = getEnabledMappings(mappings.mcversion);
    window.history.replaceState({}, '', `${window.location.href.split('?')[0]}?version=${versionSelect.value}&mapping=${enabledMappings.map(e => MappingTypes[e]).join(",")}&search=${value}`);
    profiler("Searching");

    setTopbars(enabledMappings);

    value = value.toLowerCase().trim();

    //clear all tables
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    const classes = [];
    mappings.classes.forEach((classData, obfName) => {
        if (value === "") addClass(classData, enabledMappings, "");

        if (type === SearchType.KEYWORD || type == SearchType.CLASS) {

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

    row.onclick = () => {
        if (selectedClass) selectedClass.classList.remove("selectedClass");
        row.classList.add("selectedClass");
        selectedClass = row;
        loadClass(classData, enabledMappings, searchValue);
    };

    ClassTable.appendChild(row);
}


//class method + field display stuff
function loadClass(classData: ClassData, enabledMappings: MappingTypes[], searchValue: string) {
    selectedMethod = null;
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    //methods
    for (const [methodName, methodData] of classData.methods) {
        if (!methodName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        row.classList.add("MethodRow");
        obf.innerHTML = methodName;
        row.appendChild(obf);

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("td");
            mojang.innerHTML = methodData.mappings.get(MappingTypes.MOJMAP) ?? "-";
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += methodData.transformDescriptor(MappingTypes.MOJMAP);
            }
            row.appendChild(mojang);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            const srg = document.createElement("td");
            srg.innerHTML = methodData.mappings.get(MappingTypes.SRG) ?? "-";
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += methodData.transformDescriptor(MappingTypes.SRG);
            }
            row.appendChild(srg);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("td");
            mcp.innerHTML = methodData.mappings.get(MappingTypes.MCP) ?? methodData.mappings.get(MappingTypes.SRG) ?? "-";
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += methodData.transformDescriptor(MappingTypes.MCP);
            }
            row.appendChild(mcp);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = methodData.mappings.get(MappingTypes.INTERMEDIARY) ?? "-";
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += methodData.transformDescriptor(MappingTypes.INTERMEDIARY);
            }
            row.appendChild(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("td");
            yarn.innerHTML = methodData.mappings.get(MappingTypes.YARN) ?? methodData.mappings.get(MappingTypes.INTERMEDIARY) ?? "-";
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += methodData.transformDescriptor(MappingTypes.YARN);
            }
            row.appendChild(yarn);
        }

        row.onclick = () => {
            if (selectedMethod) selectedMethod.classList.remove("selectedMethod");
            row.classList.add("selectedMethod");
            selectedMethod = row;
            loadMethod(methodData, enabledMappings);
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
        obf.innerHTML = fieldName + ":" + fieldData.transformDescriptor(MappingTypes.OBF);
        row.appendChild(obf);

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            const mojang = document.createElement("td");
            mojang.innerHTML = fieldData.mappings.get(MappingTypes.MOJMAP) ?? "-";
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += fieldData.transformDescriptor(MappingTypes.MOJMAP);
            }
            row.appendChild(mojang);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            const srg = document.createElement("td");
            srg.innerHTML = fieldData.mappings.get(MappingTypes.SRG) ?? "-";
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += fieldData.transformDescriptor(MappingTypes.SRG);
            }
            row.appendChild(srg);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const mcp = document.createElement("td");
            mcp.innerHTML = fieldData.mappings.get(MappingTypes.MCP) ?? fieldData.mappings.get(MappingTypes.SRG) ?? "-";
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += fieldData.transformDescriptor(MappingTypes.MCP);
            }
            row.appendChild(mcp);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = fieldData.mappings.get(MappingTypes.INTERMEDIARY) ?? "-";
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += fieldData.transformDescriptor(MappingTypes.INTERMEDIARY);
            }
            row.appendChild(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            const yarn = document.createElement("td");
            yarn.innerHTML = fieldData.mappings.get(MappingTypes.YARN) ?? fieldData.mappings.get(MappingTypes.INTERMEDIARY) ?? "-";
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += fieldData.transformDescriptor(MappingTypes.YARN);
            }
            row.appendChild(yarn);
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

    for (const param of params.keys()) {
        const row = document.createElement("tr");
        const num = document.createElement("td");
        num.innerHTML = param.toString();
        row.appendChild(num);

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("td");
            mcp.innerHTML = methodData.params.get(MappingTypes.MCP)?.get(param) ?? "-";
            row.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("td");
            yarn.innerHTML = methodData.params.get(MappingTypes.YARN)?.get(param) ?? "-";
            row.appendChild(yarn);
        }

        ParamsTable.appendChild(row);
    }
}

let selectedMethod: HTMLTableRowElement | null = null;
declare const mojangSignatureCheck: HTMLInputElement;
declare const srgSignatureCheck: HTMLInputElement;
declare const mcpSignatureCheck: HTMLInputElement;
declare const yarnIntermediarySignatureCheck: HTMLInputElement;
declare const yarnSignatureCheck: HTMLInputElement;
declare const settingsBtn: HTMLDivElement;
declare const closeSettings: HTMLDivElement;
declare const settings: HTMLDivElement;

(() => {
    //load initial checks
    mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";
    yarnIntermediaryMappingCheck.checked = localStorage.getItem("yarnIntermediaryMappingCheck.value") == "true";
    yarnMappingCheck.checked = localStorage.getItem("yarnMappingCheck.value") == "true";
    srgMappingCheck.checked = localStorage.getItem("srgMappingCheck.value") == "true";
    mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";

    versionSelect.addEventListener("change", async (e) => {
        await setLoading(true);
        mappings = new ClassMappings(<MCVersionSlug>(<HTMLSelectElement>e.target).value);
        localStorage.setItem("versionSelect.value", (<HTMLSelectElement>e.target).value);
        mappings.loadEnabledMappings(getEnabledMappings(mappings.mcversion));
    });

    mcpVersionSelect.addEventListener("change", (e) => {
        const parts = (<HTMLSelectElement>e.target).value.split("-");
        mappings.getMCPMappings(<any>parts[0], parts[1]);
    });

    yarnVersionSelect.addEventListener("change", (e) => {
        mappings.getYarnMappings(parseInt((<HTMLSelectElement>e.target).value));
    });

    searchInput.addEventListener("keyup", (e) => {
        if (e.code === "Enter") {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    //checkbox change events
    mojangMappingCheck.addEventListener("change", (e) => {
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getMojangMappings();
        }
    });

    srgMappingCheck.addEventListener("change", (e) => {
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getSrgMappings();
        }
    });

    mcpMappingCheck.addEventListener("change", (e) => {
        const parts = (<HTMLSelectElement>e.target).value.split("-");
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getMCPMappings(<any>parts[0], parts[1]);
        }
    });

    yarnIntermediaryMappingCheck.addEventListener("change", (e) => {
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getIntermediaryMappings();
        }
    });

    yarnMappingCheck.addEventListener("change", (e) => {
        if ((<HTMLInputElement>e.target).checked) {
            mappings.getYarnMappings(parseInt((<HTMLSelectElement>e.target).value));
        }
    });

    settingsBtn.addEventListener("click", () => {
        // @ts-ignore
        settings.style.display = null;
    });

    closeSettings.addEventListener("click", () => {
        settings.style.display = "none";
    });
})();