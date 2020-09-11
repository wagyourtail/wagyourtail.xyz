/* MIT LISCENSE

Copyright 2020 Wagyourtail

Permission is hereby granted, free of
charge, to any person obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:  The above copyright
notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


const zip = new JSZip();
const mobile = new MobileDetect(window.navigator.userAgent);

const NO_CORS_BYPASS = "https://cors-anywhere.herokuapp.com"; //thx guy on herokuapp
// thx MCP \s

const combinedMap = new Map();

const yarnIntermediary = new Map();

const mcpSrg = {methods:new Map(), fields:new Map(), paramDef:new Map()};

let minecraftVersions = null;
let yarnVersions = null;
let mcpVersions = null;

let loadedYarnIntermediaries = false;
let loadedSRG = false;
let loadedMojang = false;
let loadedMCP = false;
let loadedYarn = false;

let confirmMojang = false;

let selectedClass = null;
let selectedMethod = null;

function mcVersionCompare(a, b) {
    if (a == b) return 0;
    for (const e of versionSelect.children) {
        if (e.value == a) return 1;
        if (e.value == b) return -1;
    }
}

async function loadMCVersions() {
    //get mc versions
    if (minecraftVersions == null) {
        const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
        minecraftVersions = JSON.parse(await res.text()).versions;
    }

    versionSelect.innerHTML = "";

    //add versions to drop-down
    for (const version of minecraftVersions) {
        if (version.type == "release" || (showSnapshots.checked && version.type == "snapshot")) {
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
    if (yarnVersions == null) {
        const res = await fetch("https://maven.fabricmc.net/net/fabricmc/yarn/versions.json");
        yarnVersions = JSON.parse(await res.text());

        //legacy yarn
        const xmlParse = new DOMParser();
        const intRes = await fetch(`${NO_CORS_BYPASS}/https://dl.bintray.com/legacy-fabric/Legacy-Fabric-Maven/net/fabricmc/intermediary/maven-metadata.xml`);
        const interXML = xmlParse.parseFromString(await intRes.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].children).forEach(e => {
            yarnVersions[e.innerHTML] = [];
        });

        const yarnRes = await fetch(`${NO_CORS_BYPASS}/https://dl.bintray.com/legacy-fabric/Legacy-Fabric-Maven/net/fabricmc/yarn/maven-metadata.xml`);
        const yarnXML = xmlParse.parseFromString(await yarnRes.text(), "text/xml");
        Array.from(yarnXML.getElementsByTagName("versions")[0].children).forEach(e => {
            e = e.innerHTML;
            yarnVersions[e.split("+")[0]].push(e.split(".").pop());
        });
    }

    //load mcp version nums
    if (mcpVersions == null) {
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/versions.json`);
        mcpVersions = JSON.parse(await res.text());
    }

    loadVersion(versionSelect.value);
}

async function loadVersion(mcVersion) {

    combinedMap.clear();

    mcpSrg.methods.clear();
    mcpSrg.fields.clear();
    mcpSrg.paramDef.clear();

    yarnIntermediary.clear();

    loadedYarnIntermediaries = false;
    loadedSRG = false;
    loadedMojang = false;
    loadedMCP = false;
    loadedYarn = false;

    //is mojang available
    if (mcVersionCompare(mcVersion, "1.14.4") != -1) {
        if (mojangMappingCheck.disabled) {
            mojangMappingCheck.disabled = false;
            mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";
        }
    } else {
        mojangMappingCheck.checked = false;
        mojangMappingCheck.disabled = true;
    }

    //is yarn available
    if (mcVersion in yarnVersions) {
        if (yarnMappingCheck.disabled) {
            yarnMappingCheck.disabled = false;
            yarnMappingCheck.checked = localStorage.getItem("yarnMappingCheck.value") == "true";
        }
        yarnVersionSelect.style.visibility = "visible";
    } else {
        yarnMappingCheck.checked = false;
        yarnMappingCheck.disabled = true;
        yarnVersionSelect.style.visibility = "hidden";
    }
    await updateAvailableYarn(mcVersion);

    //is MCP available
    if (mcVersion in mcpVersions) {
        if (mcpMappingCheck.disabled) {
            mcpMappingCheck.disabled = false;
            mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";
        }
        mcpVersionSelect.style.visibility = "visible";
    } else {
        mcpMappingCheck.checked = false;
        mcpMappingCheck.disabled = true;
        mcpVersionSelect.style.visibility = "hidden";
    }
    await updateAvailableMCP(mcVersion);

    if (mojangMappingCheck.checked)
        await loadMojang(mcVersion);

    if (yarnMappingCheck.checked) {
        await loadYarnIntermediaries(mcVersion);
        if (yarnVersionSelect.value != "")
            await loadYarn(yarnVersionSelect.value);
    }

    if (mcpMappingCheck.checked) {
        await loadMCPSrgs(mcVersion);
        if (mcpVersionSelect.value != "")
            await loadMCP(mcpVersionSelect.value);
    }

    search(searchInput.value, parseInt(searchType.value));

    if (!confirmMojang && mojangMappingCheck.checked) {
        mojangConfirmPrompt.style.visibility = "visible";
        results.style.visibility = "hidden";
    } else {
        mojangConfirmPrompt.style.visibility = "hidden";
        results.style.visibility = "visible";
    }
}

async function updateAvailableMCP(mcVersion) {
    mcpVersionSelect.innerHTML = "";

    for (const version of mcpVersions[mcVersion]?.stable ?? []) {
        const option = document.createElement("option");
        option.innerHTML = `stable-${version}`;
        option.value = `stable-${version}-${mcVersion}`;
        mcpVersionSelect.appendChild(option);
    }

    for (const version of mcpVersions[mcVersion]?.snapshot ?? []) {
        const option = document.createElement("option");
        option.innerHTML = `snapshot-${version}`;
        option.value = `snapshot-${version}-${mcVersion}`;
        mcpVersionSelect.appendChild(option);
    }
}

async function updateAvailableYarn(mcVersion) {
    yarnVersionSelect.innerHTML = "";

    for (const version of yarnVersions[mcVersion]?.sort((a, b) => parseInt(b)-parseInt(a)) ?? []) {
            const option = document.createElement("option");
            option.value = `${mcVersion}+build.${version}`;
            option.innerHTML = `build.${version}`;
            yarnVersionSelect.appendChild(option);
    }
}

async function loadMCP(mcpVersion) {
    mcpVersion = mcpVersion.split("-");
    const stableSnapshot = mcpVersion.shift();
    const verNum = mcpVersion.shift();
    const mcVersion = mcpVersion.shift();
    const res = await fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp_${stableSnapshot}/${verNum}-${mcVersion}/mcp_${stableSnapshot}-${verNum}-${mcVersion}.zip`);
    const zipContent = await zip.loadAsync(await res.arrayBuffer());
    fieldCSV = (await zipContent.file("fields.csv").async("string")).split("\n");
    methodCSV = (await zipContent.file("methods.csv").async("string")).split("\n");
    paramsCSV = (await zipContent.file("params.csv").async("string")).split("\n");

    fieldCSV.shift();
    methodCSV.shift();
    paramsCSV.shift();

    for (let field of fieldCSV) {
        if (field == "") continue;
        field = field.split(",");
        const srg = field.shift().trim();
        const named = field.shift().trim();
        const combinedField = mcpSrg.fields.get(srg);
        if (combinedField)
            combinedField.mcp = named;
    }

    for (let method of methodCSV) {
        if (method == "") continue;
        method = method.split(",");
        const srg = method.shift().trim();
        const named = method.shift().trim();
        const combinedMethod = mcpSrg.methods.get(srg);
        if (combinedMethod)
            combinedMethod.mcp = named;
    }

    for (let param of paramsCSV) {
        if (param == "") continue;
        param = param.split(",");
        const token = param.shift().split("_");
        const name = param.shift();
        for (const combinedMethod of mcpSrg.paramDef.get(token[1]) ?? []) {
            if (combinedMethod.mcpParams) {
                combinedMethod.mcpParams.set(token[2], name);
            } else {
                combinedMethod.mcpParams = new Map()
                combinedMethod.mcpParams.set(token[2], name);
            }
        }
    }

    loadedMCP = true;
}

async function loadYarn(yarnVersion) {
    let res;
    if (mcVersionCompare(versionSelect.value, "1.14") != -1)
        res = await fetch(`https://maven.fabricmc.net/net/fabricmc/yarn/${yarnVersion}/yarn-${yarnVersion}-v2.jar`);
    else
        res = await fetch(`${NO_CORS_BYPASS}/https://dl.bintray.com/legacy-fabric/Legacy-Fabric-Maven/net/fabricmc/yarn/${yarnVersion}/yarn-${yarnVersion}-v2.jar`);
    const zipContent = await zip.loadAsync(await res.arrayBuffer());

    const mappings = (await zipContent.file("mappings/mappings.tiny").async("string")).split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
    mappings.shift();

    for (const classData of mappings) {
        const map = classData.split(/\s+/);
        let int;
        let named;
        if (mcVersionCompare(versionSelect.value, "1.14.2") != 1 && mcVersionCompare(versionSelect.value, "1.14") != -1) {
            named = map.shift();
            int = map.shift();
        } else {
            int = map.shift();
            named = map.shift();
        }

        const intClass = yarnIntermediary.get(int);
        const combinedClass = intClass?.combined;
        if (!intClass) continue;
        combinedClass.yarn = named;

        const lines = classData.split("\n");
        let lastMethod = null;
        while(lines.length) {
            const line = lines.shift().trim().split(/\s+/);
            switch(line[0]) {
                //method
                case "m":
                    {
                        if (mcVersionCompare(versionSelect.value, "1.14.2") != 1 && mcVersionCompare(versionSelect.value, "1.14") != -1) {
                            const int = line.pop();
                            const named = line.pop();
                            lastMethod = intClass.methods.get(int);
                            if (lastMethod)
                            lastMethod.yarn = named;
                        } else {
                            const named = line.pop();
                            const int = line.pop();
                            lastMethod = intClass.methods.get(int);
                            if (lastMethod)
                            lastMethod.yarn = named;
                        }
                    }
                    break;
                //params
                case "p":
                    {
                        if (!lastMethod) break;
                        line.shift();
                        const num = line.shift();
                        const name = line.join(" ");
                        if (lastMethod.yarnParams) {
                            lastMethod.yarnParams.set(num, name);
                        } else {
                            lastMethod.yarnParams = new Map();
                            lastMethod.yarnParams.set(num, name);
                        }
                    }
                    break;
                //field
                case "f":
                    {
                        if (mcVersionCompare(versionSelect.value, "1.14.2") != 1 && mcVersionCompare(versionSelect.value, "1.14") != -1) {
                            const int = line.pop();
                            const named = line.pop();
                            const combinedField = intClass.fields.get(int);
                            if (combinedField)
                                combinedField.yarn = named;
                        } else {
                            const named = line.pop();
                            const int = line.pop();
                            const combinedField = intClass.fields.get(int);
                            if (combinedField)
                                combinedField.yarn = named;
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    }

    loadedYarn = true;
}

async function loadYarnIntermediaries(mcVersion) {
    let res;
    if (mcVersionCompare(mcVersion, "1.14") != -1)
        res = await fetch(`https://maven.fabricmc.net/net/fabricmc/intermediary/${mcVersion}/intermediary-${mcVersion}-v2.jar`);
    else
        res = await fetch(`${NO_CORS_BYPASS}/https://dl.bintray.com/legacy-fabric/Legacy-Fabric-Maven/net/fabricmc/intermediary/${mcVersion}/intermediary-${mcVersion}-v2.jar`);
    const zipContent = await zip.loadAsync(await res.arrayBuffer());

    //mappings split by class
    const mappings = (await zipContent.file("mappings/mappings.tiny").async("string")).split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
    mappings.shift();

    for (const classData of mappings) {
        const map = classData.split(/\s+/);
        const obf = map.shift();
        const int = map.shift();

        const methods = new Map();
        const fields = new Map();

        let combinedClass = null;

        if (combinedMap.has(obf)) {
            combinedClass = combinedMap.get(obf);
        } else {
            combinedMap.set(obf, combinedClass = {methods: new Map(), fields: new Map()});
        }

        combinedClass.yarnIntermediary = int;

        //split to generate method/field maps
        const lines = classData.split("\n");
        while(lines.length) {
            switch(lines[0].trim()[0]) {
                //method
                case "m":
                    {
                        const line = lines[0].trim().substring(1).trim().split(/\s+/);
                        const int = line.pop();
                        const obfdesc = `${line.pop()}${line.pop()}`;
                        let combinedMethod = null;
                        if (combinedClass.methods.has(obfdesc)) {
                            combinedMethod = combinedClass.methods.get(obfdesc);
                        } else {
                            combinedClass.methods.set(obfdesc, combinedMethod = {});
                        }
                        combinedMethod.yarnIntermediary = int;
                        methods.set(int, combinedMethod);
                    }
                    break;
                //field
                case "f":
                    {
                        const line = lines[0].trim().substring(1).trim().split(/\s+/);
                        const int = line.pop();
                        const obf = line.pop();
                        const desc = line.pop();
                        let combinedField = null;
                        if (combinedClass.fields.has(obf)) {
                            combinedField = combinedClass.fields.get(obf);
                        } else {
                            combinedClass.fields.set(obf, combinedField = {desc:desc});
                        }
                        combinedField.yarnIntermediary = int;
                        fields.set(int, combinedField);
                    }
                    break;
                default:
                    break;
            }

            //next line
            lines.shift();
        }

        yarnIntermediary.set(int, {combined:combinedClass, methods:methods, fields:fields});
    }
    loadedYarnIntermediaries = true;
}

async function loadMCPSrgs(mcVersion) {
    if (mcVersionCompare(mcVersion, "1.13") != -1) {
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/${mcVersion}/mcp_config-${mcVersion}.zip`);
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        const mappings = (await zipContent.file("config/joined.tsrg").async("string")).split("\n\t").join("\t").split("\n");

        for (const classData of mappings) {
            const map = classData.split("\t");

            //store class names
            const obfsrg = map.shift().split(" ");
            const obf = obfsrg[0];
            const srg = obfsrg[1];

            let combinedClass = null;

            if (combinedMap.has(obf)) {
                combinedClass = combinedMap.get(obf);
            } else {
                combinedMap.set(obf, combinedClass = {methods: new Map(), fields: new Map()});
            }

            combinedClass.mcp = srg;

            //gen methods/fields
            while(map.length) {
                //next line
                line = map.shift().trim().split(/\s+/);

                //methodData
                if (line.length == 3) {
                    const obfdesc = `${line.shift()}${line.shift()}`;
                    const srg = line.shift();
                    let combinedMethod = null;
                    if (combinedClass.methods.has(obfdesc)) {
                        combinedMethod = combinedClass.methods.get(obfdesc);
                    } else {
                        combinedClass.methods.set(obfdesc, combinedMethod = {});
                    }
                    combinedMethod.srg = srg;

                    const paramDef = srg.split("_")[1];
                    if (mcpSrg.paramDef.has(paramDef)) {
                        if (!mcpSrg.paramDef.get(paramDef).includes(combinedMethod))
                            mcpSrg.paramDef.get(paramDef).push(combinedMethod);
                    } else {
                        mcpSrg.paramDef.set(paramDef, [combinedMethod]);
                    }
                    mcpSrg.methods.set(srg, combinedMethod);
                }
                //field
                else {
                    const obf = line.shift();
                    const srg = line.shift();
                    let combinedField = null;
                    if (combinedClass.fields.has(obf)) {
                        combinedField = combinedClass.fields.get(obf);
                    } else {
                        combinedClass.fields.set(obf, combinedField = {});
                    }
                    combinedField.srg = srg;
                    mcpSrg.fields.set(srg, combinedField);
                }
            }
        }
    } else {
        const res = await fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp/${mcVersion}/mcp-${mcVersion}-srg.zip`);
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        const mappings = (await zipContent.file("joined.srg").async("string")).split("\n");

        for (let line of mappings) {
            line = line.trim().split(/\s+/);
            switch(line.shift()) {
                case "CL:":
                {
                    const obf = line.shift();
                    const srg = line.shift();
                    let combinedClass = null;
                    if (combinedMap.has(obf)) {
                        combinedClass = combinedMap.get(obf);
                    } else {
                        combinedMap.set(obf, combinedClass = {methods: new Map(), fields: new Map()});
                    }
                    combinedClass.mcp = srg;
                    break;
                }
                case "FD:":
                {
                    const obfRest = line.shift().split("/");
                    const obf = obfRest.pop();
                    const obfClass = obfRest.join("/");
                    const srgRest = line.shift().split("/");
                    const srg = srgRest.pop();
                    const srgClass = srgRest.join("/");
                    let combinedField = null;
                    let combinedClass = combinedMap.get(obfClass);
                    if (combinedClass?.fields.has(obf)) {
                        combinedField = combinedClass.fields.get(obf);
                    } else {
                        combinedClass?.fields.set(obf, combinedField = {});
                    }
                    combinedField.srg = srg;
                    mcpSrg.fields.set(srg, combinedField);
                    break;
                }
                case "MD:":
                {
                    const obfRest = line.shift().split("/");
                    const obf = obfRest.pop();
                    const obfClass = obfRest.join("/");
                    const desc = line.shift();
                    const rest = line.shift().split("/");
                    const srg = rest.pop();
                    const srgClass = rest.join("/");
                    const obfdesc = `${obf}${desc}`;
                    let combinedMethod = null;
                    let combinedClass = combinedMap.get(obfClass);
                    if (combinedClass?.methods.has(obfdesc)) {
                        combinedMethod = combinedClass.methods.get(obfdesc);
                    } else {
                        combinedClass?.methods.set(obfdesc, combinedMethod = {});
                    }
                    combinedMethod.srg = srg;

                    const paramDef = srg.split("_")[1];
                    if (mcpSrg.paramDef.has(paramDef)) {
                        if (!mcpSrg.paramDef.get(paramDef).includes(combinedMethod))
                            mcpSrg.paramDef.get(paramDef).push(combinedMethod);
                    } else {
                        mcpSrg.paramDef.set(paramDef, [combinedMethod]);
                    }
                    mcpSrg.methods.set(srg, combinedMethod);
                    break;
                }
                default:
            }
        }
    }
    loadedSRG = true;
}

async function loadMojang(mcVersion) {
    let versionData = null;
    for (const version of minecraftVersions) {
        if (version.id == mcVersion) {
            versionData = version;
            break;
        }
    }
    const mappingURL = JSON.parse(await (await fetch(versionData.url)).text())?.downloads?.client_mappings?.url;
    let mappings = (await (await fetch(`${NO_CORS_BYPASS}/${mappingURL}`))?.text())?.split("<").join("&lt;").split(">").join("&gt;").split(".").join("/");
    mappings = mappings.split("\n");
    mappings.shift();
    mappings = mappings.join("\n").match(/^[^\s].+?$(?:\n\s.+?$)*/gm);
    const reversedMappings = new Map();

    //build reversed mappings
    for (const classMap of mappings) {
        lines = classMap.split("\n");
        const cNameData = lines.shift().split("-&gt;");
        const cNamed = cNameData.shift().trim();
        const classData = {obf: cNameData.shift().trim().replace(":", ""), fields: new Map(), methods:new Map()};
        for (let line of lines) {
            line = line.trim();
            const matchField = line.match(/^([^\d][^\s]+)\s*([^\s]+)\s*-&gt;\s*([^\s]+)/);
            if (matchField) {
                classData.fields.set(matchField[2], {desc:matchField[1], obf:matchField[3]});
                continue;
            }
            const matchMethod = line.match(/^\d+:\d+:([^\s]+)\s*([^\s]+)\((.*?)\)\s*-&gt;\s*([^\s]+)/);
            if (matchMethod) {
                classData.methods.set(matchMethod[2], {retval:matchMethod[1], params:matchMethod[3], obf:matchMethod[4]});
            }
        }
        reversedMappings.set(cNamed, classData);
    }

    //reverse the reversed mappings and make proper method/field signatures
    reversedMappings.forEach((revClassData, revClassName) => {
        const classData = {mojang:revClassName, fields:new Map(), methods:new Map()};

        revClassData.methods.forEach((revMethodData, revMethodName) => {
            const params = revMethodData.params == "" ? [] : revMethodData.params.split(",").map(e => reversedMappings.get(e)?.obf ?? e);
            const retval = reversedMappings.get(revMethodData.retval)?.obf ?? revMethodData.retval;
            classData.methods.set(`${revMethodData.obf}${toMethodSignature(params, retval)}`, {mojang:revMethodName});
        });

        revClassData.fields.forEach((revFieldData, revFieldName) => {
            classData.fields.set(revFieldData.obf, {desc:toSignature(reversedMappings.get(revFieldData.desc)?.obf ?? revFieldData.desc), mojang:revFieldName});
        });
        if (combinedMap.has(revClassData.obf)) {
            const combinedClassData = combinedMap.get(revClassData.obf);
            classData.methods.forEach((data, name) => {
                if (combinedClassData.methods.has(name)) {
                    combinedClassData.methods.get(name).mojang = data.mojang;
                } else {
                    combinedClassData.methods.set(name, data);
                }
            });

            classData.fields.forEach((data, name) => {
                if (combinedClassData.fields.has(name)) {
                    combinedClassData.fields.get(name).mojang = data.mojang;
                    combinedClassData.fields.get(name).desc = data.desc;
                } else {
                    combinedClassData.fields.set(name, data);
                }
            });

            combinedClassData.mojang = classData.mojang;

        } else {
            combinedMap.set(revClassData.obf, classData);
        }
    });

    loadedMojang = true;
}

function toMethodSignature(params, retval) {
    params = params.map(param => toSignature(param));
    return `(${params.join("")})${toSignature(retval)}`;
}

function toSignature(item) {
    let sig = null;
    switch(item.replace("[]", "")) {
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
            sig = `L${item.replace("[]", "")};`
    }
    if (item.endsWith("[]")) {
        return `[${sig}`;
    } else {
        return sig;
    }
}

function search(query, type = 0) {
    setLoading(true);

    query = query.toLowerCase().trim();

    setTopbars();

    //clear all tables
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    let classes = [];
    combinedMap.forEach((classData, className) => {
        if (query == "") return addClass(className, "");

        // keyword / class
        if ([0, 1].includes(type)) {
            if (className.toLowerCase().includes(query)) return classes.push([1, className]);
            if (classData.mojang?.toLowerCase().includes(query)) return classes.push([2, className]);
            if (classData.mcp?.toLowerCase().includes(query)) return classes.push([3, className]);
            if (classData.yarnIntermediary?.toLowerCase().includes(query)) return classes.push([4, className]);
            if (classData.yarn?.toLowerCase().includes(query)) return classes.push([5, className]);
        }

        // keyword / method
        if ([0, 2].includes(type)) {
            for (const [methodName, methodData] of classData.methods) {
                if (!methodName) continue;
                if (methodName.toLowerCase().includes(query)) return classes.push([6, className]);
                if (methodData.mojang?.toLowerCase().includes(query)) return classes.push([7, className]);
                if (methodData.srg?.toLowerCase().includes(query)) return classes.push([8, className]);
                if (methodData.mcp?.toLowerCase().includes(query)) return classes.push([9, className]);
                if (methodData.yarnIntermediary?.toLowerCase().includes(query)) return classes.push([10, className]);
                if (methodData.yarn?.toLowerCase().includes(query)) return classes.push([11, className]);

                if (methodData.mcpParams) {
                    for (const [paramIndex, paramName] of methodData.mcpParams) {
                        if (paramName.toLowerCase().includes(query)) return classes.push([12, className]);
                    }
                }

                if (methodData.yarnParams) {
                    for (const [paramIndex, paramName] of methodData.yarnParams) {
                        if (paramName.toLowerCase().includes(query)) return classes.push([13, className]);
                    }
                }
            }
        }

        // keyword / field
        if ([0, 3].includes(type)) {
            for (const [fieldName, fieldData] of classData.fields) {
                if (!fieldName) continue;
                if (fieldName.toLowerCase().includes(query)) return classes.push([14, className]);
                if (`${fieldData?.obf ?? ""}:${fieldData?.desc ?? ""}`.toLowerCase().includes(query)) return classes.push([15, className]);
                if (fieldData.mojang?.toLowerCase().includes(query)) return classes.push([16, className]);
                if (fieldData.srg?.toLowerCase().includes(query)) return classes.push([17, className]);
                if (fieldData.mcp?.toLowerCase().includes(query)) return classes.push([18, className]);
                if (fieldData.yarnIntermediary?.toLowerCase().includes(query)) return classes.push([19, className]);
                if (fieldData.yarn?.toLowerCase().includes(query)) return classes.push([20, className]);
            }
        }
    });

    //sort
    classes = classes.sort((a,b) => a[0]-b[0]);

    //add classes
    for (const [sortNum, className] of classes) {
        addClass(className, query);
    }

    setLoading(false);
}

function setTopbars() {

    //class
    {
        classTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        classTableHead.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            classTableHead.appendChild(mojang);
        }

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            classTableHead.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            const yarn = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            yarn.innerHTML = "Yarn";
            classTableHead.appendChild(yarnIntermediary);
            classTableHead.appendChild(yarn);
        }
    }

    //methods
    {
        methodTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        methodTableHead.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            methodTableHead.appendChild(mojang);
        }

        if (mcpMappingCheck.checked) {
            const srg = document.createElement("th");
            const mcp = document.createElement("th");
            srg.innerHTML = "SRG";
            mcp.innerHTML = "MCP";
            methodTableHead.appendChild(srg);
            methodTableHead.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            const yarn = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            yarn.innerHTML = "Yarn";
            methodTableHead.appendChild(yarnIntermediary);
            methodTableHead.appendChild(yarn);
        }
    }

    //fields
    {
        fieldTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "Obfuscated";
        fieldTableHead.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("th");
            mojang.innerHTML = "Mojang";
            fieldTableHead.appendChild(mojang);
        }

        if (mcpMappingCheck.checked) {
            const srg = document.createElement("th");
            const mcp = document.createElement("th");
            srg.innerHTML = "SRG";
            mcp.innerHTML = "MCP";
            fieldTableHead.appendChild(srg);
            fieldTableHead.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            const yarn = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            yarn.innerHTML = "Yarn";
            fieldTableHead.appendChild(yarnIntermediary);
            fieldTableHead.appendChild(yarn);
        }
    }

    //params
    {
        paramsTableHead.innerHTML = "";
        const obf = document.createElement("th");
        obf.innerHTML = "#";
        paramsTableHead.appendChild(obf);

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            paramsTableHead.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
            paramsTableHead.appendChild(yarn);
        }
    }
}

function addClass(className, query) {
    const classData = combinedMap.get(className);
    if (!classData) return;

    const row = document.createElement("tr");
    const obf = document.createElement("td");
    obf.innerHTML = className;

    row.classList.add("ClassRow");
    row.appendChild(obf);

    if (mojangMappingCheck.checked) {
        const mojang = document.createElement("td");
        mojang.innerHTML = classData.mojang ?? "-";

        row.appendChild(mojang);
    }

    if (mcpMappingCheck.checked) {
        const mcp = document.createElement("td");
        mcp.innerHTML = classData.mcp ?? "-";

        row.appendChild(mcp);
    }

    if (yarnMappingCheck.checked) {
        const yarnIntermediary = document.createElement("td");
        const yarn = document.createElement("td");
        yarnIntermediary.innerHTML = classData.yarnIntermediary ?? "-";
        yarn.innerHTML = classData.yarn ?? "-";

        row.appendChild(yarnIntermediary);
        row.appendChild(yarn);
    }

    row.onclick = () => {
        if (selectedClass) selectedClass.classList.remove("selectedClass");
        row.classList.add("selectedClass");
        selectedClass = row;
        loadClass(className, query);
    };

    ClassTable.appendChild(row);
}

function loadClass(className, query) {
    selectedMethod = null;
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";

    const {methods, fields} = combinedMap.get(className);

    //methods
    for (const [methodName, methodData] of methods) {
        if (!methodName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        row.classList.add("MethodRow");
        obf.innerHTML = methodName;
        row.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("td");
            mojang.innerHTML = methodData.mojang ?? "-";
            row.appendChild(mojang);
        }

        if (mcpMappingCheck.checked) {
            const srg = document.createElement("td");
            const mcp = document.createElement("td");
            srg.innerHTML = methodData.srg ?? "-";
            mcp.innerHTML = methodData.mcp ?? "-";
            row.appendChild(srg);
            row.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarnIntermediary = document.createElement("td");
            const yarn = document.createElement("td");
            yarnIntermediary.innerHTML = methodData.yarnIntermediary ?? "-";
            yarn.innerHTML = methodData.yarn ?? "-";
            row.appendChild(yarnIntermediary);
            row.appendChild(yarn);
        }

        row.onclick = () => {
            if (selectedMethod) selectedMethod.classList.remove("selectedMethod");
            row.classList.add("selectedMethod");
            selectedMethod = row;
            loadMethod(className, methodName);
        }

        MethodTable.appendChild(row);
    }

    if (query != "") for (const child of MethodTable.children) {
        if (child.innerText.toLowerCase().includes(query)) {
            child.offsetParent.scrollTo(0, child.offsetTop-child.offsetHeight);
            child.click();
            break;
        }
    }

    //fields
    for (const [fieldName, fieldData] of fields) {
        if (!fieldName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        obf.innerHTML = fieldName;
        row.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("td");
            mojang.innerHTML = fieldData.mojang ?? "-";
            row.appendChild(mojang);
        }

        if (mcpMappingCheck.checked) {
            const srg = document.createElement("td");
            const mcp = document.createElement("td");
            srg.innerHTML = fieldData.srg ?? "-";
            mcp.innerHTML = fieldData.mcp ?? "-";
            row.appendChild(srg);
            row.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarnIntermediary = document.createElement("td");
            const yarn = document.createElement("td");
            yarnIntermediary.innerHTML = fieldData.yarnIntermediary ?? "-";
            yarn.innerHTML = fieldData.yarn ?? "-";
            row.appendChild(yarnIntermediary);
            row.appendChild(yarn);
        }

        FieldTable.appendChild(row);
    }

}

function loadMethod(className, methodName) {
    ParamsTable.innerHTML = "";

    const params = {};

    if (yarnMappingCheck.checked) {
        const yarnParams = combinedMap.get(className)?.methods.get(methodName)?.yarnParams ?? [];
        for (const [paramNum, paramName] of yarnParams) {
            params[paramNum] = {yarn: paramName};
        }
    }

    if (mcpMappingCheck.checked) {
        const mcpParams = combinedMap.get(className)?.methods.get(methodName)?.mcpParams ?? [];
        for (const [paramNum, paramName] of mcpParams) {
            if (params[paramNum])
                params[paramNum].mcp = paramName;
            else
                params[paramNum]= {mcp: paramName};
        }
    }

    for (const param of Object.keys(params)) {
        const row = document.createElement("tr");
        const num = document.createElement("td");
        num.innerHTML = param;
        row.appendChild(num);

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("td");
            mcp.innerHTML = params[param].mcp ?? "-";
            row.appendChild(mcp);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("td");
            yarn.innerHTML = params[param].yarn ?? "-";
            row.appendChild(yarn);
        }

        ParamsTable.appendChild(row);
    }

}

async function changeMCPVersion(mcpVersion) {
    setLoading(true);

    mcpSrg.methods.forEach((item) => {
        delete item.mcpParams;
        delete item.mcp;
    });

    mcpSrg.fields.forEach((item) => {
        delete item.mcp;
    });

    await loadMCP(mcpVersion);

    search(searchInput.value, parseInt(searchType.value));
}

async function changeYarnVersion(yarnVersion) {
    setLoading(true);

    yarnIntermediary.forEach((item, i) => {
        item.methods.forEach((item, i) => {
            delete item.yarnParams;
            delete item.yarn;
        });
        item.fields.forEach((item, i) => {
            delete item.yarn;
        });
    });

    await loadYarn(yarnVersion);

    search(searchInput.value, parseInt(searchType.value));
}

function setLoading(bool) {
    if (bool) {
        loading.style.visibility = "visible";
        results.style.visibility = "hidden";
    } else {
        loading.style.visibility = "hidden";
        results.style.visibility = "visible";
    }
}

//init
{
    versionSelect.addEventListener("change", (e) => {
        setLoading(true);
        loadVersion(e.target.value);
        localStorage.setItem("versionSelect.value", e.target.value);
    });

    mcpVersionSelect.addEventListener("change", (e) => {
        changeMCPVersion(e.target.value);
    });

    yarnVersionSelect.addEventListener("change", (e) => {
        changeYarnVersion(e.target.value);
    });

    searchInput.addEventListener("keyup", (e) => {
        if (e.keyCode == 13) {
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    searchButton.addEventListener("click", () => {
        search(searchInput.value, parseInt(searchType.value));
    });

    function windowResize() {
        results.style.maxHeight = `${window.innerHeight-120}px`
    }

    window.addEventListener('resize', windowResize);

    windowResize();

    showSnapshots.addEventListener('click', (e) => {
        loadMCVersions();
        localStorage.setItem("showSnapshots.value", showSnapshots.checked);
    });

    showSnapshots.checked = localStorage.getItem("showSnapshots.value") == "true";

    mojangMappingCheck.addEventListener('click', async (e) => {
        setLoading(true);
        if (!mojangMappingCheck.disabled)
            localStorage.setItem("mojangMappingCheck.value", mojangMappingCheck.checked);
        if (mojangMappingCheck.checked && !loadedMojang) {
            await loadMojang(versionSelect.value);
        }

        search(searchInput.value, parseInt(searchType.value));

        if (!confirmMojang && mojangMappingCheck.checked) {
            mojangConfirmPrompt.style.visibility = "visible";
            results.style.visibility = "hidden";
        } else {
            mojangConfirmPrompt.style.visibility = "hidden";
            results.style.visibility = "visible";
        }
    });

    mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";

    mojangConfirm.addEventListener("click", async () => {
        confirmMojang = true;
        mojangConfirmPrompt.style.visibility = "hidden";
        results.style.visibility = "visible";
    });

    mojangDeny.addEventListener("click", async () => {
        confirmMojang = false;

        mojangMappingCheck.checked = false;
        localStorage.setItem("mojangMappingCheck.value", false);


        setLoading(true);
        mojangConfirmPrompt.style.visibility = "hidden";

        loadVersion(versionSelect.value);
    });

    mcpMappingCheck.addEventListener('click', async (e) => {
        setLoading(true);
        if (!mcpMappingCheck.disabled)
            localStorage.setItem("mcpMappingCheck.value", mcpMappingCheck.checked);

        if (mcpMappingCheck.checked && !loadedSRG) {
            await loadMCPSrgs(versionSelect.value);
        }
        if (mcpMappingCheck.checked && !loadedMCP) {
            await loadMCP(mcpVersionSelect.value);
        }
        search(searchInput.value, parseInt(searchType.value));
    });

    mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";

    yarnMappingCheck.addEventListener('click', async (e) => {
        setLoading(true);
        if (!yarnMappingCheck.disabled)
            localStorage.setItem("yarnMappingCheck.value", yarnMappingCheck.checked);
        if (yarnMappingCheck.checked && !loadedSRG) {
            await loadYarnIntermediaries(versionSelect.value);
        }
        if (yarnMappingCheck.checked && !loadedYarn) {
            await loadYarn(yarnVersionSelect.value);
        }
        search(searchInput.value, parseInt(searchType.value));
    });

    if (localStorage.getItem("yarnMappingCheck.value") !== "false") {
        localStorage.setItem("yarnMappingCheck.value", true);
        yarnMappingCheck.checked = true;
    } else {
        yarnMappingCheck.checked = false;
    }

    if (mobile.mobile()) {
        loading.style.visibility = "hidden";
        mobileConfirmPrompt.style.visibility = "visible";
    } else {
        loadMCVersions();
    }

    mobileConfirm.addEventListener("click", () => {
        setLoading(true);
        mobileConfirmPrompt.style.visibility = "hidden";
        loadMCVersions();
    });
}
