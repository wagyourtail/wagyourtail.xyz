import * as jsz from "jszip";
import {JSZipObject} from "jszip";

//@ts-ignore
importScripts("https://cdn.rawgit.com/Stuk/jszip/master/dist/jszip.min.js");
//@ts-ignore
importScripts("xmldom.js");

declare const JSZip: jsz;

interface dp {
    new(): DOMParser;
}

//@ts-ignore
var DOMParser: dp = xmldom.DOMParser;

//@ts-ignore
const module = {}
export = 0;

type ReleaseVersion = `${number}.${number}` | `${number}.${number}.${number}`;
type Snapshot = `${number}w${number}${"a"|"b"|"c"|"d"|"e"}` | `${ReleaseVersion}-pre${number}` | `${ReleaseVersion}-rc${number}`;
type MCVersionSlug =  ReleaseVersion | Snapshot;

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


const NO_CORS_BYPASS = "/Projects/CORS-Bypass/App";

let mappings: ClassMappings;
let manifests: Manifests;

function mcVersionCompare(a: MCVersionSlug, b: MCVersionSlug) {
    if (a === b) return 0;
    for (const e of manifests.mcManifest.versions) {
        if (e.id === a) return 1;
        if (e.id === b) return -1;
    }
    throw Error("MC version not in list.");
}

async function loadManifests() {
    if (manifests) return;

    //@ts-ignore
    manifests = {}

    if (!manifests.mcManifest) {
        //get mc versions
        profiler("Getting Minecraft Versions");
        const res = await fetch(`${NO_CORS_BYPASS}/https://launchermeta.mojang.com/mc/game/version_manifest.json`);
        profilerDel("Getting Minecraft Versions");
        manifests.mcManifest = await res.json();
    }

    //load yarn version nums
    if (!manifests.yarnManifest) {
        manifests.yarnManifest = {}
        profiler("Getting Intermediary Versions");
        {
            const res = await fetch("https://meta.fabricmc.net/v2/versions/intermediary");
            const intermediaryInternalMappings: {
                maven: string,
                version: string,
                stable: boolean
            }[] = await res.json();
            for (const version of intermediaryInternalMappings) {
                if (!manifests.yarnManifest[version.version]) manifests.yarnManifest[version.version] = []
            }
        }
        profilerDel("Getting Intermediary Versions");

        profiler("Getting Legacy Intermediary Versions");
        {
            const res = await fetch("https://meta.legacyfabric.net/v2/versions/intermediary");
            const intermediaryInternalMappings: {
                maven: string,
                version: string,
                stable: boolean
            }[] = await res.json();
            for (const version of intermediaryInternalMappings) {
                if (!manifests.yarnManifest[version.version]) manifests.yarnManifest[version.version] = []
            }
        }
        profilerDel("Getting Legacy Intermediary Versions");


        profiler("Getting Yarn Versions");
        {
            const res = await fetch("https://meta.fabricmc.net/v2/versions/yarn");
            const yarnInternalMappings: {
                gameVersion: MCVersionSlug
                separator: string
                build: number
                maven: string
                version: string
                stable: boolean
            }[] = await res.json();
            for (const version of yarnInternalMappings) {
                if (!manifests.yarnManifest[version.gameVersion]) manifests.yarnManifest[version.gameVersion] = []
                manifests.yarnManifest[version.gameVersion].push(version.build)
            }
        }
        profilerDel("Getting Yarn Versions");


        profiler("Getting Legacy Yarn Versions");
        {
            const res = await fetch("https://meta.legacyfabric.net/v2/versions/yarn");
            const yarnInternalMappings: {
                gameVersion: MCVersionSlug
                separator: string
                build: number
                maven: string
                version: string
                stable: boolean
            }[] = await res.json();
            for (const version of yarnInternalMappings) {
                if (!manifests.yarnManifest[version.gameVersion]) manifests.yarnManifest[version.gameVersion] = []
                manifests.yarnManifest[version.gameVersion].push(version.build)
            }
        }
        profilerDel("Getting Legacy Yarn Versions");
        for (const version of Object.values(manifests.yarnManifest)) {
            version.reverse()
        }
    }

    //load mcp version nums
    if (manifests.mcpManifest == null) {
        profiler("Getting MCP Versions");
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/versions.json`);
        profilerDel("Getting MCP Versions");
        manifests.mcpManifest = JSON.parse(await res.text());

        if (!("1.16" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16"] = {snapshot: [20200514]}
        }

        if (!("1.16.1" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16.1"] = {snapshot: [20200820]}
        }

        if (!("1.16.2" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16.2"] = {snapshot: [20200916]}
        }

        if (!("1.16.3" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16.3"] = {snapshot: [20201028]}
        }
        if (!("1.16.4" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16.4"] = {snapshot: [20210309]}
        }
        if (!("1.16.5" in manifests.mcpManifest)) {
            manifests.mcpManifest["1.16.5"] = {snapshot: [20210309]}
        }

        //srg versions
        const xmlParse = new DOMParser();
        profiler("Getting SRG Versions");
        const srg13res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/maven-metadata.xml`);
        profilerDel("Getting SRG Versions");
        const interXML = xmlParse.parseFromString(await srg13res.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].childNodes).forEach(e => {
            if (e.textContent === null) return;
            if (!e.textContent.includes("-") && !(e.textContent in manifests.mcpManifest)) {
                manifests.mcpManifest[e.textContent] = undefined;
            }
        });
    }


    // load parchment versions
    // parchment doesn't store a list -_-
    if (manifests.parchmentNoManifest == null) {
        manifests.parchmentNoManifest = {}
    }

    // hashed mojmap versions
    if (manifests.hashedMojmapManifest == null) {
        manifests.hashedMojmapManifest = new Set();
        let metaRes: Response;
        profiler("Downloading Hashed Mojmap Mappings");

        // metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/hashed-mojmap/maven-metadata.xml`);
        const xmlParse = new DOMParser();
        // const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        // for (const version of Array.from(interXML.getElementsByTagName("version"))) {
        //     hashedMojmapManifest[version.textContent.split("-SNAPSHOT")[0]] = "hashed-mojmap";
        // }

        metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/hashed/maven-metadata.xml`);
        const interXML2 = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        for (const version of Array.from(interXML2.getElementsByTagName("version"))) {
            const vt = version.textContent?.split("-SNAPSHOT")[0];
            if (vt != null) {
                manifests.hashedMojmapManifest.add(vt);
            }
        }
        profilerDel("Downloading Hashed Mojmap Mappings");
    }

    // quilt versions
    if (manifests.quiltManifest == null) {
        manifests.quiltManifest = {};
        let metaRes: Response;
        profiler("Downloading Quilt Mappings");

        metaRes = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-mappings/maven-metadata.xml`);
        const xmlParse = new DOMParser();
        const interXML = xmlParse.parseFromString(await metaRes.text(), "text/xml");
        for (const version of Array.from(interXML.getElementsByTagName("version"))) {
            const versionParts = version.textContent?.split("+build.");
            if (versionParts != null) {
                if (!manifests.quiltManifest[versionParts[0]]) manifests.quiltManifest[versionParts[0]] = [];
                manifests.quiltManifest[versionParts[0]].push(parseInt(versionParts[1]));
            }
        }

        profilerDel("Downloading Quilt Mappings");
    }

    // spigot versions
    // spigot doesn't store a list -_-
    if (manifests.spigotNoManifest == null) {
        manifests.spigotNoManifest = {};
    }
    sendManifests();
}

function sendManifests() {
//@ts-ignore
    postMessage({ type: "manifests", manifests: manifests });
}

async function onEnabledMappings(mps: MappingTypes[], yarnVers: string, mcpVers: string, parchmentVers: string, quiltVers: string) {
    mappings.loadEnabledMappings(mps, yarnVers, mcpVers, parchmentVers, quiltVers);
}



async function onVersionSelect(version: MCVersionSlug) {
    if (!mappings || mappings.mcversion !== version) {
        await loadNoManifests(<MCVersionSlug>version);
        mappings = new ClassMappings(<MCVersionSlug>version);
    }
}

async function loadNoManifests(mcVersion: MCVersionSlug) {
    // update if parchment has mappings for current mc version
    if (manifests.parchmentNoManifest[mcVersion] == undefined) {
        const xmlParse = new DOMParser();
        profiler(`Getting Parchment ${mcVersion} Versions`);

        const parchmentRes = await fetch(`${NO_CORS_BYPASS}/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${mcVersion}%252Fmaven-metadata.xml`);
        profilerDel(`Getting Parchment ${mcVersion} Versions`);
        if (parchmentRes.status != 200) {
            manifests.parchmentNoManifest[mcVersion] = [];
        } else {
            const interXML = xmlParse.parseFromString(await parchmentRes.text(), "text/xml");
            // @ts-ignore
            manifests.parchmentNoManifest[mcVersion] = Array.from(interXML.getElementsByTagName("versions")[0].childNodes).map(e => e.textContent).filter(e => e != null).reverse();
        }
    }

    // update if spigot has mappings for current mc version
    if (manifests.spigotNoManifest[mcVersion] === undefined) {
        profiler(`Getting Spigot ${mcVersion} Versions`);
        const spigotResp = await fetch(`${NO_CORS_BYPASS}/https://hub.spigotmc.org/versions/${mcVersion}.json`);
        profilerDel(`Getting Spigot ${mcVersion} Versions`);
        if (spigotResp.status != 200) {
            manifests.spigotNoManifest[mcVersion] = null;
        } else {
            manifests.spigotNoManifest[mcVersion] = JSON.parse(await spigotResp.text()).refs.BuildData;
        }
    }

    sendNoManifests();
}

function sendNoManifests() {
//@ts-ignore
    postMessage({ type: "noManifests", manifests: manifests });
}

enum MappingTypes {
    OBF,
    MOJMAP, PARCHMENT,
    SRG, MCP,
    INTERMEDIARY, YARN,
    HASHED, QUILT,
    SPIGOT
}

enum SRGVersion {
    SRG, TSRG, TSRG2
}

type ReversedMappings = {
    obf: string | undefined,
    fields: Map<string, {desc: string, obf: string}>,
    methods: Map<string, {retval: string, params: string, obf: string}>
};

function sendMojmapLoaded() {
//@ts-ignore
    postMessage({ type: "mojmapLoaded" });
}

function sendLoadedMappingsUpdate(loaded: MappingTypes[]) {
//@ts-ignore
    postMessage({ type: "loadedMappings", mappings: loaded });
}

class ClassMappings {
    readonly mcversion: MCVersionSlug;
    readonly loadedMappings: Set<MappingTypes> = new Set();
    enabled: MappingTypes[] = [];

    readonly classes: Map<string, ClassData> = new Map();
    readonly srgFields: Map<string, FieldData[]> = new Map();
    readonly srgMethods: Map<string, MethodData[]> = new Map();

    loadedMCPVersion: null | [string, string] = null;
    loadedYarnVersion: null | string = null;

    constructor(mcversion: MCVersionSlug) {
        this.mcversion = mcversion;
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
                if (backup !== null && clazz.getMapping(backup) === p1) {
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
            p1 = clazz?.getMapping(to) || (backup !== null ? clazz?.getMapping(backup) || p1 : p1);
            return `L${p1};`;
        });
    }

    async loadEnabledMappings(enabledMappings: MappingTypes[], yarnVers: string, mcpVers: string, parchmentVers: string, quiltVers: string) {
        this.enabled = enabledMappings;
        const newMappings = enabledMappings.filter(e => !this.loadedMappings.has(e));
        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            await this.getMojangMappings();
        }

        if (enabledMappings.includes(MappingTypes.PARCHMENT)) {
            await this.getParchmentMappings(parchmentVers);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            await this.getSrgMappings();
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            const parts = mcpVers.split("-");
            await this.getMCPMappings(<any>parts[0], parts[1]);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            await this.getIntermediaryMappings();
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            await this.getYarnMappings(parseInt(yarnVers));
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            await this.getHashedMappings();
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            await this.getQuiltMappings(parseInt(quiltVers));
        }

        if (enabledMappings.includes(MappingTypes.SPIGOT)) {
            await this.getSpigotMappings();
        }

        sendLoadedMappingsUpdate([...this.loadedMappings.values()]);
    }

    async getOrAddClass(class_name: string, mapping: MappingTypes) {
        if (mapping === MappingTypes.OBF && this.classes.has(class_name)) {
            return this.classes.get(class_name);
        }
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

        for (const version of manifests.mcManifest.versions) {
            if (version.id === this.mcversion) {
                vers = version.url;
                break;
            }
        }

        if (!vers) {
            return;
        }

        const mappingsURL: string = (await (await fetch(`${NO_CORS_BYPASS}/${vers}`)).json())?.downloads?.client_mappings?.url;

        if (!mappingsURL) {
            return;
        }

        profiler("Downloading Mojang Mappings");
        const request = await fetch(`${NO_CORS_BYPASS}/${mappingsURL}`);
        if (request.status !== 200) return;
        const mappings = (await request.text()).split(".").join("/");
        profilerDel("Downloading Mojang Mappings");

        await this.loadMojangMappings(mappings);
        sendMojmapLoaded();
    }

    async loadMojangMappings(proguard_mappings: string) {
        profiler("Parsing Mojang Mappings");

        const lines = proguard_mappings.split("\n");

        lines.shift(); // copyright notice
        const classes = lines.join("\n").matchAll(/^[^\s#].+?$(?:\n[\s#].+?$)*/gm);

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
                if (line.startsWith("#")) continue;
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
        const versionName = interXML.getElementsByTagName("value")[0].textContent;

        let res = await fetch(`${NO_CORS_BYPASS}/https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-public&path=org%252Fparchmentmc%252Fdata%252Fparchment-${this.mcversion}%252F${version}%252Fparchment-${this.mcversion}-${versionName}-checked.zip`);
        profilerDel("Downloading Parchment Mappings");
        const zip = new JSZip();
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

            if (clazz == null) {
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
            res = await fetch(`${NO_CORS_BYPASS}/https://maven.minecraftforge.net/de/oceanlabs/mcp/mcp/${this.mcversion}/mcp-${this.mcversion}-srg.zip`);
        }
        profilerDel("Downloading SRG Mappings");
        const zip = new JSZip();
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
                case "FD:": {
                    const obf_parts = current_line[1].match(/(.+)\/([^\/]+)$/);
                    const srg_parts = current_line[2].match(/(.+)\/([^\/]+)$/);
                    const current_class = await this.getOrAddClass(<string>obf_parts?.[1], MappingTypes.OBF);
                    if (current_class == null) {
                        continue;
                    }
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
                    if (current_class == null) {
                        continue;
                    }
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
        let current_class: ClassData | null | undefined = null;
        while (lines.length) {
            const current_line = <string>lines.shift();
            const indent = <string>current_line.match(/^\t*/)?.[0];
            if (indent.length == 0) {
                const cParts = current_line.trim().split(/\s+/);
                current_class = await this.getOrAddClass(cParts[0], MappingTypes.OBF);
                if (current_class == null) {
                    continue;
                }
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
        let current_class: ClassData | null | undefined = null;
        let current_item: AbstractData | null | undefined = undefined;
        while (lines.length) {
            const current_line = <string>lines.shift();
            const indent = <string>current_line.match(/^\t*/)?.[0];
            if (indent.length == 0) {
                const cParts = current_line.trim().split(/\s+/);
                current_class = await this.getOrAddClass(cParts[0], MappingTypes.OBF);
                if (current_class == null) {
                    continue;
                }
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
        const zip = new JSZip();
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
                const current_field = field_list.shift()?.split(",").map((e: string) => e.trim());
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
                const current_method = method_list.shift()?.split(",").map((e: string) => e.trim());
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
                const current_param = param_list.shift()?.split(",").map((e: string) => e.trim());
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
            res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/legacyfabric/intermediary/${this.mcversion}/intermediary-${this.mcversion}-v2.jar`);
        profilerDel("Downloading Yarn Intermediary Mappings");
        const zip = new JSZip();
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
            res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/legacyfabric/yarn/${this.mcversion}+build.${version}/yarn-${this.mcversion}+build.${version}-v2.jar`);
        profilerDel("Downloading Yarn Mappings");
        const zip = new JSZip();
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
            if (current_class == null) {
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
            if (current_class == null) {
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

        let res: Response = await fetch(`${NO_CORS_BYPASS}/https://maven.quiltmc.org/repository/release/org/quiltmc/hashed/${this.mcversion}/hashed-${this.mcversion}.jar`);
        profilerDel("Downloading Yarn Intermediary Mappings");
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        const mappings = await zipContent.file("hashed/mappings.tiny")?.async("string") ?? await zipContent.file("mappings/mappings.tiny")?.async("string");
        if (mappings) {
            await this.loadHashedMappings(mappings);
        } else {
            console.error("ERROR PARSING HASHED MAPPINGS ZIP!");
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
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const mappings = await zipContent.file("hashed/mappings.tiny")?.async("string") ?? await zipContent.file("mappings/mappings.tiny")?.async("string");
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

    async getSpigotMappings() {
        profiler("Downloading Spigot Mappings");
        let res: Response = await fetch(`${NO_CORS_BYPASS}/https://hub.spigotmc.org/stash/rest/api/latest/projects/SPIGOT/repos/builddata/archive?at=${manifests.spigotNoManifest[this.mcversion]}&format=zip`);
        profilerDel("Downloading Spigot Mappings");
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        await this.loadSpigotMappings(zipContent, this.mcversion);
    }

    async loadSpigotMappings(spigotMappingZip: {file(path: string): JSZipObject | null}, descrim: string) {
        if (this.loadedMappings.has(MappingTypes.SPIGOT)) this.clearMappings(MappingTypes.SPIGOT);
        profiler("Parsing Spigot Mappings");
        const classMappings = await spigotMappingZip.file(`mappings/bukkit-${descrim}-cl.csrg`)?.async("string");
        for (const line of classMappings?.split("\n") ?? []) {
            const parts = line.trim().split(" ");
            if (line.trim() == "" || parts[0].startsWith("#")) continue;
            const clazz = await this.getOrAddClass(parts[0], MappingTypes.OBF);
            if (clazz == null) {
                continue;
            }
            clazz.addMapping(MappingTypes.SPIGOT, parts[1]);
        }

        const memberMappings = await spigotMappingZip.file(`mappings/bukkit-${descrim}-members.csrg`)?.async("string");
        let currentClass: ClassData | null | undefined = null;
        for (const line of memberMappings?.split("\n") ?? []) {
            const parts = line.trim().split(" ");
            if (line.trim() == "" || parts[0].startsWith("#")) continue;
            currentClass = await this.getOrAddClass(parts[0], MappingTypes.SPIGOT);
            if (currentClass == null) {
                continue;
            }
            if (parts.length == 4) {
                const md = await currentClass.getOrAddMethod(parts[1], <string>this.reverseTransformDesc(parts[2], MappingTypes.SPIGOT), MappingTypes.OBF);
                md?.addMapping(MappingTypes.SPIGOT, parts[3]);

            } else if (parts.length == 3) {
                const fd = await currentClass.getOrAddField(parts[1], null, MappingTypes.OBF);
                fd?.addMapping(MappingTypes.SPIGOT, parts[2]);
            } else {
                console.error("UNKNOWN MAPPING PART!: " + line);
            }
        }

        this.loadedMappings.add(MappingTypes.SPIGOT);
        profilerDel("Parsing Spigot Mappings");
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
            return `L${!mapped || mapped == "-" || !mapped ? p1 : mapped};`;
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
            return `L${mapped == "-" || !mapped ? p1 : mapped};`;
        });
    }

    setDescriptor(mappingType: MappingTypes, desc: string | null) {
        if (mappingType === MappingTypes.OBF) {
            if (this.obfDesc != null) throw new Error("Tried to change obf descriptor!");
            else this.obfDesc = desc;
            return
        }
        if (desc == null) {
            return;
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
        if (mapping === MappingTypes.OBF && this.fields.has(field_name)) {
            const field = this.fields.get(field_name);
            if (field?.getDescriptor(MappingTypes.OBF) == null) {
                field?.setDescriptor(MappingTypes.OBF, this.classMappings.reverseTransformDesc(field_desc, mapping));
            }
            return field ?? null;
        }
        for (const field of this.fields.values()) {
            if (field.getMapping(mapping) === field_name || field.getMapping(MappingTypes.OBF) === field_name) {
                if (field.getDescriptor(MappingTypes.OBF) == null) {
                    field.setDescriptor(MappingTypes.OBF, this.classMappings.reverseTransformDesc(field_desc, mapping));
                }
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
        if (mapping === MappingTypes.OBF && this.methods.has(method_name + method_desc)) {
            return this.methods.get(method_name + method_desc) ?? null;
        }
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

function profiler(message: string) {
//@ts-ignore
    postMessage({ type: "profiler", message: message });
}

function profilerDel(message: string) {
//@ts-ignore
    postMessage({ type: "profilerDel", message: message });
}

onmessage = (e) => {
    const { data } = e;
    console.debug("c2s", data.type);
    switch (data.type) {
        case "version":
            onVersionSelect(data.version);
            break;
        case "enabled":
            onEnabledMappings(data.enabled, data.yarnVersion, data.mcpVersion, data.parchmentVersion, data.quiltVersion);
            break;
        case "importMappings":
            onImportMappings(data.mType, data.mappingType, data.content);
            break;
        case "updateVersion":
            onUpdateVersion(data.mapping, data.data);
            break;
        case "clearMappings":
            onClearMappings(data.mapping);
            break;
        case "exportMappings":
            onRequestExport(data.from_mapping, data.to_class_mapping, data.to_content_mapping, data.to_meta_mapping, data.fallback_from, data.fallback_to_class, data.fallback_to_content, data.exportFromName, data.exportToName);
            break;
        case "search":
            onSearch(data.value, data.sType);
            break;
        case "requestClassData":
            onRequestClassData(data.className, data.enabledMappings, data.sigChecks, data.fallback);
            break;
        default:
            console.error(`S Unknown message type: ${data.type}`);
    }
}

async function onClearMappings(mapping: MappingTypes) {
    await mappings.clearMappings(mapping);
    sendLoadedMappingsUpdate([...mappings.loadedMappings.values()]);
}


async function onRequestClassData(classObfName: string, enabledMappings: MappingTypes[], sigTransform: MappingTypes[], fallbackTOOBF: boolean) {
    const classData = await mappings.getOrAddClass(classObfName, MappingTypes.OBF);
    if (classData == null) {
        return;
    }
    const methods: string[][] = [];
    //methods
    for (const [methodName, methodData] of classData.methods) {
        if (!methodName) continue;

        const method = [];
        method.push(methodName);
        method.push(methodName.replace("<", "&lt;").replace(">", "&gt;"));

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            let mojmapData = methodData.getMappingWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP).replace("<", "&lt;").replace(">", "&gt;");
            if (mojmapData != "-" && sigTransform.includes(MappingTypes.MOJMAP)) {
                mojmapData += methodData.transformDescriptorWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP);
            }
            method.push(mojmapData);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            let srgData = methodData.getMappingWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG).replace("<", "&lt;").replace(">", "&gt;");
            if (srgData != "-" && sigTransform.includes(MappingTypes.SRG)) {
                srgData += methodData.transformDescriptorWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            }
            method.push(srgData);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            let mcpData = methodData.getMappingWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG).replace("<", "&lt;").replace(">", "&gt;");
            if (mcpData != "-" && sigTransform.includes(MappingTypes.MCP)) {
                mcpData += methodData.transformDescriptorWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            }
            method.push(mcpData);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            let yarnIntermediary = methodData.getMappingWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY).replace("<", "&lt;").replace(">", "&gt;");
            if (yarnIntermediary != "-" && sigTransform.includes(MappingTypes.INTERMEDIARY)) {
                yarnIntermediary += methodData.transformDescriptorWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            }
            method.push(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            let yarn = methodData.getMappingWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY).replace("<", "&lt;").replace(">", "&gt;");
            if (yarn != "-" && sigTransform.includes(MappingTypes.YARN)) {
                yarn += methodData.transformDescriptorWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            }
            method.push(yarn);
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            let hashed = methodData.getMappingWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED).replace("<", "&lt;").replace(">", "&gt;");
            if (hashed != "-" && sigTransform.includes(MappingTypes.HASHED)) {
                hashed += methodData.transformDescriptorWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            }
            method.push(hashed);
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            let quilt = methodData.getMappingWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED).replace("<", "&lt;").replace(">", "&gt;");
            if (quilt != "-" && sigTransform.includes(MappingTypes.QUILT)) {
                quilt += methodData.transformDescriptorWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            }
            method.push(quilt);
        }

        if (enabledMappings.includes(MappingTypes.SPIGOT)) {
            let spigot = methodData.getMappingWithFallback(MappingTypes.SPIGOT, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SPIGOT).replace("<", "&lt;").replace(">", "&gt;");
            if (spigot != "-" && sigTransform.includes(MappingTypes.SPIGOT)) {
                spigot += methodData.transformDescriptorWithFallback(MappingTypes.SPIGOT, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SPIGOT);
            }
            method.push(spigot);
        }

        methods.push(method);
    }

    const fields: string[][] = [];

    for (const [fieldName, fieldData] of classData.fields) {
        if (!fieldName) continue;
        let field = [];

        field.push(fieldName);
        field.push(fieldName + ":" + fieldData.transformDescriptor(MappingTypes.OBF));

        if (enabledMappings.includes(MappingTypes.MOJMAP)) {
            let mojang = fieldData.getMappingWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP);
            if (mojang != "-" && sigTransform.includes(MappingTypes.MOJMAP)) {
                mojang += ":" + fieldData.transformDescriptorWithFallback(MappingTypes.MOJMAP, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.MOJMAP);
            }
            field.push(mojang);
        }

        if (enabledMappings.includes(MappingTypes.SRG)) {
            let srg = fieldData.getMappingWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            if (srg != "-" && sigTransform.includes(MappingTypes.SRG)) {
                srg += ":" + fieldData.transformDescriptorWithFallback(MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            }
            field.push(srg);
        }

        if (enabledMappings.includes(MappingTypes.MCP)) {
            let mcp = fieldData.getMappingWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            if (mcp != "-" && sigTransform.includes(MappingTypes.MCP)) {
                mcp += ":" + fieldData.transformDescriptorWithDoubleFallback(MappingTypes.MCP, MappingTypes.SRG, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SRG);
            }
            field.push(mcp);
        }

        if (enabledMappings.includes(MappingTypes.INTERMEDIARY)) {
            let yarnIntermediary = fieldData.getMappingWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            if (yarnIntermediary != "-" && sigTransform.includes(MappingTypes.INTERMEDIARY)) {
                yarnIntermediary += ":" + fieldData.transformDescriptorWithFallback(MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            }
            field.push(yarnIntermediary);
        }

        if (enabledMappings.includes(MappingTypes.YARN)) {
            let yarn = fieldData.getMappingWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            if (yarn != "-" && sigTransform.includes(MappingTypes.YARN)) {
                yarn += ":" + fieldData.transformDescriptorWithDoubleFallback(MappingTypes.YARN, MappingTypes.INTERMEDIARY, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.INTERMEDIARY);
            }
            field.push(yarn);
        }

        if (enabledMappings.includes(MappingTypes.HASHED)) {
            let hashed = fieldData.getMappingWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            if (hashed != "-" && sigTransform.includes(MappingTypes.HASHED)) {
                hashed += ":" + fieldData.transformDescriptorWithFallback(MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            }
            field.push(hashed);
        }

        if (enabledMappings.includes(MappingTypes.QUILT)) {
            let quilt = fieldData.getMappingWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            if (quilt != "-" && sigTransform.includes(MappingTypes.QUILT)) {
                quilt += ":" + fieldData.transformDescriptorWithDoubleFallback(MappingTypes.QUILT, MappingTypes.HASHED, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.HASHED);
            }
            field.push(quilt);
        }

        if (enabledMappings.includes(MappingTypes.SPIGOT)) {
            let spigot = fieldData.getMappingWithFallback(MappingTypes.SPIGOT, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SPIGOT);
            if (spigot != "-" && sigTransform.includes(MappingTypes.SPIGOT)) {
                spigot += ":" + fieldData.transformDescriptorWithFallback(MappingTypes.SPIGOT, fallbackTOOBF ? MappingTypes.OBF : MappingTypes.SPIGOT);
            }
            field.push(spigot);
        }
        fields.push(field);
    }

    sendClassData(classData, methods, fields, enabledMappings)
}

function sendClassData(classData: ClassData, methods: string[][], fields: string[][], enabledMappings: MappingTypes[]) {
//@ts-ignore
    postMessage({ type: "classData", classData: classData, methods: methods, fields: fields, enabledMappings: enabledMappings });
}

function onUpdateVersion(mapping: MappingTypes, data: string) {
    switch (mapping) {
        case MappingTypes.YARN:
            mappings.getYarnMappings(parseInt(data));
            break;
        case MappingTypes.MCP:
            const parts = data.split("-");
            mappings.getMCPMappings(<any>parts[0], parts[1]);
            break;
        case MappingTypes.PARCHMENT:
            mappings.getParchmentMappings(data);
            break;
        case MappingTypes.QUILT:
            mappings.getQuiltMappings(parseInt(data));
            break;
        default:
            throw new Error("Unknown mapping type");
    }
}

enum SearchType {
    KEYWORD, CLASS, METHOD, FIELD
}

async function onSearch(value: string, type: SearchType) {

    profiler("Searching");


    value = value.toLowerCase().trim();

    if (value === "") {
        sendSearchResults([...mappings.classes.values()], mappings.enabled, value);
        return;
    }

    const results: ClassData[] = [];

    mappings.classes.forEach((classData, obfName) => {
        if (value === "") {
            results.push(classData);
            return;
        }

        if (type === SearchType.KEYWORD || type == SearchType.CLASS) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                if (classData.getMapping(i).toLowerCase().includes(value)) {
                    results.push(classData);
                    return;
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.METHOD) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                for (const method of classData.methods.values()) {
                    if (method.getMapping(i).toLowerCase().includes(value)) {
                        results.push(classData);
                        return;
                    }
                }
            }
        }

        if (type === SearchType.KEYWORD || type == SearchType.FIELD) {
            for (let i = 0; i <= MappingTypes.QUILT; ++i) {
                for (const field of classData.fields.values()) {
                    if (field.getMapping(i).toLowerCase().includes(value)) {
                        results.push(classData);
                        return;
                    }
                }
            }
        }
    });

    profilerDel("Searching");
    sendSearchResults(results, mappings.enabled, value);
}

function sendSearchResults(results: ClassData[], enabled: MappingTypes[], value: string) {
    //@ts-ignore
//@ts-ignore
    postMessage({ type: "searchResults", results: results, enabled: enabled, value: value });
}

enum MappingFileTypes {
    SRG, TINY, TSRG, TSRG2, MCP, PROGUARD, PARCHMENT, CSRG
}

async function onImportMappings(target: MappingTypes, mappingType: MappingFileTypes, contents: string | {file(path: string): JSZipObject | null}) {
    if (target == MappingTypes.INTERMEDIARY) {
        if (mappingType === MappingFileTypes.TINY) {
            await mappings.loadIntermediaryMappings(<string>contents);
        } else {
            alert("Intermediary mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (target == MappingTypes.YARN) {
        if (mappingType === MappingFileTypes.TINY) {
            await mappings.loadYarnMappings(<string>contents);
        } else {
            alert("Yarn mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (target == MappingTypes.MOJMAP) {
        if (mappingType === MappingFileTypes.PROGUARD) {
            await mappings.loadMojangMappings(<string>contents);
        } else {
            alert("Mojmap mappings can only be imported from proguard mappings.");
            return;
        }
    } else if (target == MappingTypes.PARCHMENT) {
        if (mappingType === MappingFileTypes.PARCHMENT) {
            await mappings.loadParchmentMappings(<string>contents);
        } else {
            alert("Parchment mappings can only be imported from parchment mappings (json).");
            return;
        }
    } else if (target == MappingTypes.MCP) {
        if (mappingType === MappingFileTypes.MCP) {
            await mappings.loadMCPMappings(<{file(path: string): JSZipObject | null}>contents);
        } else {
            alert("MCP mappings can only be imported from mcp mappings (zip of CSVs).");
            return;
        }
    } else if (target == MappingTypes.SRG) {
        if (mappingType === MappingFileTypes.SRG) {
            await mappings.loadSRGMappings(SRGVersion.SRG, <string>contents);
        } else if (mappingType === MappingFileTypes.TSRG) {
            await mappings.loadSRGMappings(SRGVersion.TSRG, <string>contents);
        } else if (mappingType === MappingFileTypes.TSRG2) {
            await mappings.loadSRGMappings(SRGVersion.TSRG2, <string>contents);
        } else {
            alert("SRG mappings can only be imported from srg mappings (srg or tsrg).");
            return;
        }
    } else if (target == MappingTypes.HASHED) {
        if (mappingType === MappingFileTypes.TINY) {
            await mappings.loadHashedMappings(<string>contents);
        } else {
            alert("Hashed mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (target == MappingTypes.QUILT) {
        if (mappingType === MappingFileTypes.TINY) {
            await mappings.loadQuiltMappings(<string>contents);
        } else {
            alert("Quilt mappings can only be imported from tiny mappings.");
            return;
        }
    } else if (target == MappingTypes.SPIGOT) {
        if (mappingType === MappingFileTypes.CSRG) {
            const info = JSON.parse(await (<{file(path: string): JSZipObject | null}>contents).file("info.json")?.async("string") ?? "{}");
            await mappings.loadSpigotMappings(<{file(path: string): JSZipObject | null}>contents, info.minecraftVersion);
        } else {
            alert("Spigot mappings can only be imported from spigot repo zip (with info.json and csrg files).");
        }
    } else {
        alert("No import type selected");
        return;
    }

    sendImportMappingsDone(target);
}

function sendImportMappingsDone(target: MappingTypes) {
//@ts-ignore
    postMessage({ type: "importMappingsDone", target: target });
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

async function onRequestExport(from_mapping: MappingTypes,
                               to_class_mapping: MappingTypes,
                               to_content_mapping: MappingTypes,
                               to_meta_mapping: MappingTypes,
                               fallback_from: MappingTypes,
                               fallback_to_class: MappingTypes,
                               fallback_to_content: MappingTypes,
                               exportFromName: string,
                               exportToName: string
) {
        let exportString = `tiny\t2\t0\t${exportFromName}\t${exportToName}`;

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
        sendExportedMappings(exportString);
}

async function sendExportedMappings(exportString: string) {
//@ts-ignore
    postMessage({ type: "export", data: exportString });
}

loadManifests();