import jsz from "jszip";

//trick to keep typescript from requiring it...
declare const JSZip: jsz

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

        type ReversedMappings = {
            obf: string | undefined,
            fields: Map<string, {desc: string, obf: string}>,
            methods: Map<string, {retval: string, params: string, obf: string}>
        };

        // build reversed mappings
        const reversedMappings = new Map<string, ReversedMappings>();
        for (const classdata of classes ?? []) {
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
                const matchMethod = line.match(/^(?:\d+:\d+:)?([^\s]+)\s*([^\s]+)\((.*?)\)\s*-&gt;\s*([^\s]+)/);
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
            const classData = new ClassData(mappings.obf);
            classData.mappings.set(MappingTypes.MOJMAP, named);

            mappings.methods.forEach((methodMappings, named) => {
                //TODO
            });

            mappings.fields.forEach((fieldMappings, named) => {
                //TODO
            });
        })

        this.loadedMappings.add(MappingTypes.MOJMAP);
        profilerDel("Parsing Mojang Mappings");
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

    async loadMCPMappings(mcp_zip: jsz.JSZipObject) {
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

    addMapping(mappingType: MappingTypes, name: string, comment: string) {
        if (mappingType === MappingTypes.OBF) {
            throw new Error("Tried to change obf name!");
        }
        this.mappings.set(mappingType, name);
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
    readonly obfDesc: string;
    readonly descriptors: Map<MappingTypes, string> = new Map();

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
}

class MethodData extends ClassItem {
    readonly params: Map<MappingTypes, string[]> = new Map();

    transformDescriptor(MappingType: MappingTypes): string {
        //TODO
        return "";
    }

}

class FieldData extends ClassItem {
    transformDescriptor(MappingType: MappingTypes): string {
        //TODO
        return "";
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

async function search(value: string, type: SearchType) {
    setLoading(true);
    // window.history.replaceState({}, '', `${window.location.href.split('?')[0]}?version=${versionSelect.value}&mapping=${mapping().join(",")}&search=${query}`);
    profiler("Searching");

    value = value.toLowerCase().trim();

    //TODO



    profilerDel("Searching");
    setLoading(false);
}

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


})();