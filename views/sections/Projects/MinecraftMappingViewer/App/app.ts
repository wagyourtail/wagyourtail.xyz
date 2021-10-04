import * as jsz from "jszip";
import { JSZipObject } from "jszip";

export = 0;

declare const JSZip: jsz;

declare const versionSelect: HTMLSelectElement;
declare const showSnapshots: HTMLInputElement;
declare const searchInput: HTMLInputElement;
declare const loadingProfiler: HTMLParagraphElement;
declare const mojangConfirmPrompt: HTMLDivElement;

const NO_CORS_BYPASS = "/Projects/CORS-Bypass/App";

const zip = new JSZip();
let mcManifest: MCVersionManifest;
let yarnManifest: YarnVersionManifest;
let mcpManifest: MCPVersionManifest;
let parchmentManifest: ParchmentVersionManifest;

let confirmMojang: boolean = false;
let mappings: ClassMappings;

type ReleaseVersion = `${number}.${number}` | `${number}.${number}.${number}`;
type Snapshot = `${number}w${number}${"a"|"b"|"c"|"d"|"e"}` | `${ReleaseVersion}-pre${number}` | `${ReleaseVersion}-rc${number}`;
type MCVersionSlug =  ReleaseVersion | Snapshot;

interface ParchmentVersionManifest {
    [mcversion: string]: string[]
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
        this.updateAvailableVersionsDropdown();
    }

    reverseTransformDesc(desc: string, from: MappingTypes): string {
        if (from == MappingTypes.OBF) return desc;
        return desc.replace(/L(.+?);/g, (match, p1) => {
            for (const clazz of this.classes.values()) {
                if (clazz.getMapping(from) === p1) {
                    return `L${clazz.obfName};`;
                }
            }
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

        //YARN
        yarnVersionSelect.innerHTML = "";

        for (const version of yarnManifest[this.mcversion]?.reverse() ?? []) {
            const option = document.createElement("option");
            option.value = version.toString();
            option.innerHTML = `build.${version}`;
            yarnVersionSelect.appendChild(option);
        }

        //PARCHMENT
        parchmentVersionSelect.innerHTML = "";
        for (const version of parchmentManifest[this.mcversion]?.sort().reverse() ?? []) {
            const option = document.createElement("option");
            option.value = version;
            option.innerHTML = version;
            parchmentVersionSelect.appendChild(option);
        }
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
        const mappings = (await request.text()).split("<").join("&lt;").split(">").join("&gt;").split(".").join("/");
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
            const classData = this.classes.get(mappings.obf.replace(".", "/")) ?? new ClassData(this, mappings.obf.replace(".", "/"));
            classData.mappings.set(MappingTypes.MOJMAP, named.replace(".", "/"));

            mappings.methods.forEach((methodMappings, named) => {
                const md = classData.getOrAddMethod(methodMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, methodMappings.params + methodMappings.retval), MappingTypes.OBF);
                md?.addMapping(MappingTypes.MOJMAP, named);
            });

            mappings.fields.forEach((fieldMappings, named) => {
                const fd = classData.getOrAddField(fieldMappings.obf, ClassMappings.transformProguardDescriptors(reversedMappings, fieldMappings.desc), MappingTypes.OBF);
                fd?.addMapping(MappingTypes.MOJMAP, named);
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
                const cName = clazz.replace("[]", "").replace(".", "/");
                sig = `L${reversedMappings.get(cName)?.obf ?? cName};`
        }
        for (let i = 0; i < dims; ++i) {
            sig = "[" + sig;
        }
        return sig;
    }

    async getParchmentMappings(version: string) {
        profiler("Downloading Parchment Mappings");
        let metaRes = await fetch(`http://localhost:8000/Projects/CORS-Bypass/App/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${this.mcversion}%252F${version}%252Fmaven-metadata.xml`);

        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        const versionName = interXML.getElementsByTagName("value")[0].innerHTML;

        let res = await fetch(`http://localhost:8000/Projects/CORS-Bypass/App/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${this.mcversion}%252F${version}%252Fparchment-${this.mcversion}-${versionName}-checked.zip`);
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
        //TODO
    }

    async loadSRGMappings(srgVersion: SRGVersion, srg_mappings: string) {
        profiler("Parsing SRG Mappings");
        //TODO


        this.loadedMappings.add(MappingTypes.SRG);
        profilerDel("Parsing SRG Mappings");
    }

    async getMCPMappings(channel: "stable" | "snapshot", version: string) {
        //TODO
    }

    async loadMCPMappings(mcp_zip: JSZipObject) {
        profiler("Parsing MCP Mappings");
        if (!this.loadedMappings.has(MappingTypes.SRG)) {
            await this.getSrgMappings();
        }
        //TODO

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
        if (mappings) {
            await this.loadIntermediaryMappings(mappings);
        } else {
            console.error("ERROR PARSING INTERMEDIARY MAPPINGS ZIP!");
        }
    }

    async loadIntermediaryMappings(int_mappings: string) {
        profiler("Parsing Intermediary Mappings");
        const class_mappings = int_mappings.split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.split("\n").map(c => c.split("\t", -1)));
        const first_line = class_mappings.shift();
        if (!first_line) {
            console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE!");
            return;
        }

        const reversed = first_line[0][3] === "intermediary";
        if (reversed) {
            //TODO, fix and remove
            console.error("REVERSED INTERMEDIARY MAPPINGS!");
            return;
        }

        let current_class: ClassData | null = null;
        let current: ClassItem | null = null;
        let current_param: string | null = null;
        for (const clazz of class_mappings) {
            const class_def = clazz.shift();
            const obf = class_def?.[1];
            const int = class_def?.[2];
            if (!obf || !int) {
                console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE, bad class definition???");
                continue;
            }
            if (!this.classes.has(obf)) this.classes.set(obf, new ClassData(this, obf));
            current_class = <ClassData>this.classes.get(obf);
            current_class.addMapping(MappingTypes.INTERMEDIARY, int);

            for (const item of clazz) {
                //skip empty line
                if (item.join("").trim() === "") continue;
                switch (item[1]) {
                    // class comment
                    case "c":
                        current_class.comments.set(MappingTypes.INTERMEDIARY, item.slice(2).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<"));
                        break;
                    // class method
                    case "m":
                        current = current_class.getOrAddMethod(item[3], item[2], MappingTypes.OBF);
                        current?.addMapping(MappingTypes.INTERMEDIARY, item[4]);
                        break;
                    // class field
                    case "f":
                        current = current_class.getOrAddField(item[3], item[2], MappingTypes.OBF);
                        current?.addMapping(MappingTypes.INTERMEDIARY, item[4]);
                        break;
                    case "":
                        switch (item[2]) {
                            // item comment
                            case "c":
                                current?.comments.set(MappingTypes.INTERMEDIARY, item.slice(3).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<"));
                                break;
                            // item param
                            case "p":
                                if (current && current instanceof MethodData) {
                                    if (!current.params.has(MappingTypes.INTERMEDIARY)) current.params.set(MappingTypes.INTERMEDIARY, new Map());
                                    current.params.get(MappingTypes.INTERMEDIARY)?.set(parseInt(item[3]), current_param = item[5]);
                                } else {
                                    console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE, param on field??? " + item.join(","));
                                }
                                break;
                            case "":
                                switch (item[3]) {
                                    //param comment
                                    case "c":
                                        current?.comments.set(MappingTypes.INTERMEDIARY, (current?.comments.get(MappingTypes.INTERMEDIARY) ?? "") + `<br><p>${current_param} : ${item.slice(4).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<")}</p>`);
                                        break;
                                    default:
                                        console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE, unknown item-item element: " + item.join(","));
                                }
                                break;
                            default:
                                console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE, unknown class item element: " + item.join(","));
                        }
                        break;
                    default:
                        console.error(item);
                        console.error("ERROR PARSING INTERMEDIARY MAPPINGS FILE, unknown class element: " + item.join(","));
                }
            }

        }


        this.loadedMappings.add(MappingTypes.INTERMEDIARY);
        profilerDel("Parsing Intermediary Mappings");
    }

    async getYarnMappings(version: number) {
        if (this.loadedMappings.has(MappingTypes.YARN)) this.clearMappings(MappingTypes.YARN);
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
        profiler("Parsing Yarn Mappings");
        if (!this.loadedMappings.has(MappingTypes.INTERMEDIARY)) {
            await this.getIntermediaryMappings();
            if (!this.loadedMappings.has(MappingTypes.INTERMEDIARY)) {
                alert("FAILED TO LOAD INTERMEDIARY DEPENDENCY");
                return;
            }
        }
        const class_mappings = yarn_mappings.split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.split("\n").map(c => c.split("\t", -1)));
        const first_line = class_mappings.shift();
        if (!first_line) {
            console.error("ERROR PARSING YARN MAPPINGS FILE!");
            return;
        }

        const reversed = first_line[0][3] === "named";
        if (reversed) {
            //TODO, fix and remove
            console.error("ERROR REVERSED YARN MAPPINGS!");
            return;
        }

        let current: ClassItem | null = null;
        let current_param: string | null = null;
        for (const clazz of class_mappings) {
            const class_def = clazz.shift();
            const int = class_def?.[1];
            const named = class_def?.[2];
            if (!int || !named) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, bad class definition???");
                continue;
            }

            let current_class = await this.getOrAddClass(int, MappingTypes.INTERMEDIARY);
            if (current_class === null) {
                console.error("ERROR PARSING YARN MAPPINGS FILE, could not find intermediaries for class: " + int + " " + named);
                continue;
            }
            current_class.addMapping(MappingTypes.YARN, named);

            for (const item of clazz) {
                //skip empty line
                if (item.join("").trim() === "") continue;
                switch (item[1]) {
                    // class comment
                    case "c":
                        current_class.comments.set(MappingTypes.YARN, item.slice(2).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<"));
                        break;
                    // class method
                    case "m":
                        current = current_class.getOrAddMethod(item[3], item[2], MappingTypes.INTERMEDIARY);
                        current?.addMapping(MappingTypes.YARN, item[4]);
                        break;
                    // class field
                    case "f":
                        current = current_class.getOrAddField(item[3], item[2], MappingTypes.INTERMEDIARY);
                        current?.addMapping(MappingTypes.YARN, item[4]);
                        break;
                    case "":
                        switch (item[2]) {
                            // item comment
                            case "c":
                                current?.comments.set(MappingTypes.YARN, item.slice(3).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<"));
                                break;
                            // item param
                            case "p":
                                if (current && current instanceof MethodData) {
                                    if (!current.params.has(MappingTypes.YARN)) current.params.set(MappingTypes.YARN, new Map());
                                    current.params.get(MappingTypes.YARN)?.set(parseInt(item[3]), current_param = item[5]);
                                } else {
                                    console.error("ERROR PARSING YARN MAPPINGS FILE, param on field??? " + item.join(","));
                                }
                                break;
                            case "":
                                switch (item[3]) {
                                    //param comment
                                    case "c":
                                        current?.comments.set(MappingTypes.YARN, (current?.comments.get(MappingTypes.YARN) ?? "") + `<br><p>${current_param} : ${item.slice(4).join("\t").replace(/\\n/g, "<br>").replace(/&gt;/g, ">").replace(/&lt;/g, "<")}</p>`);
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




        this.loadedMappings.add(MappingTypes.YARN);
        profilerDel("Parsing Yarn Mappings");
    }

    async clearMappings(mappingType: MappingTypes) {
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

    transformDescriptor(mappingType: MappingTypes): string {
        if (MappingTypes.OBF == mappingType) {
            return this.obfDesc;
        }
        return this.obfDesc.replace(/L(.+?);/g, (match, p1) => {
            return `L${this.classMappings.classes.get(p1)?.mappings.get(mappingType) ?? p1};`;
        });
    }

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
        if (!this.descriptors.has(mappingType)) this.descriptors.set(mappingType, this.transformDescriptor(mappingType));
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

    getOrAddField(field_name: string, field_desc: string, mapping: MappingTypes): FieldData | null {
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

        if (enabled.includes(MappingTypes.PARCHMENT)) {
            const parchment = document.createElement("th");
            parchment.innerHTML = "Parchment";
            paramsTableHead.appendChild(parchment);
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

    mappings.classes.forEach((classData, obfName) => {
        if (value === "") {
            addClass(classData, enabledMappings, "");
            return;
        }

        if (type === SearchType.KEYWORD || type == SearchType.CLASS) {
            for (let i = 0; i <= MappingTypes.YARN; ++i) {
                if (classData.getMapping(i).toLowerCase().includes(value)) {
                    addClass(classData, enabledMappings, value);
                    return;
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.METHOD) {
            for (let i = 0; i <= MappingTypes.YARN; ++i) {
                for (const method of classData.methods.values()) {
                    if (method.getMapping(i).toLowerCase().includes(value)) {
                        addClass(classData, enabledMappings, value);
                        return;
                    }
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.FIELD) {
            for (let i = 0; i <= MappingTypes.YARN; ++i) {
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
            yarn.innerHTML = methodData.mappings.get(MappingTypes.YARN) ?? methodData.mappings.get(MappingTypes.YARN) ?? "-";
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


        ParamsTable.appendChild(row);
    }
}

declare const commentHolder: HTMLDivElement;

function loadComment(data: AbstractData) {
    commentHolder.innerHTML = "";
    data.comments.forEach((comment, mapping) => {
        const header = document.createElement("h4");
        header.innerHTML = MappingTypes[mapping];
        commentHolder.appendChild(header);
        const content = document.createElement("p");
        content.innerHTML = comment;
        commentHolder.appendChild(content);
    });
}

let selectedMethod: HTMLTableRowElement | null = null;
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

(() => {
    //load initial checks
    mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";
    yarnIntermediaryMappingCheck.checked = localStorage.getItem("yarnIntermediaryMappingCheck.value") == "true";
    yarnMappingCheck.checked = localStorage.getItem("yarnMappingCheck.value") == "true";
    srgMappingCheck.checked = localStorage.getItem("srgMappingCheck.value") == "true";
    mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";
    parchmentMappingCheck.checked = localStorage.getItem("parchmentMappingCheck.value") == "true";

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

    //checkbox change events
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
        versionSelect.innerHTML = "";

        //add versions to drop-down
        for (const version of mcManifest.versions) {
            if (version.type === "release" || ((<HTMLInputElement>e.target).checked && version.type === "snapshot")) {
                const option = document.createElement("option");
                option.value = option.innerHTML = version.id;
                versionSelect.appendChild(option);
            }
        }
    });
})();

declare const topbar: HTMLDivElement;

function windowResize() {
    resultsTable.style.maxHeight = `${window.innerHeight-topbar.offsetHeight}px`
}

window.addEventListener('resize', windowResize);

windowResize();