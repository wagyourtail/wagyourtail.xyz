/* MIT LISCENSE

Copyright 2021 Wagyourtail

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


//add cache

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', {scope: "./"}).then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}



const zip = new JSZip();
const mobile = new MobileDetect(window.navigator.userAgent);

const NO_CORS_BYPASS = "https://cors.wagyourtail.xyz";
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
//query for mc versions
async function loadMCVersions() {


    //get mc versions
    if (minecraftVersions == null) {
        profiler("Getting Minecraft Versions");
        const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
        profilerDel("Getting Minecraft Versions");
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
        profiler("Getting Yarn Versions");
        const res = await fetch("https://maven.fabricmc.net/net/fabricmc/yarn/versions.json");
        profilerDel("Getting Yarn Versions");
        yarnVersions = JSON.parse(await res.text());


        //legacy yarn
        const xmlParse = new DOMParser();
        profiler("Getting Legacy Yarn Versions");
        const intRes = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/intermediary/maven-metadata.xml`);
        profilerDel("Getting Legacy Yarn Versions")
        const interXML = xmlParse.parseFromString(await intRes.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].children).forEach(e => {
            yarnVersions[e.innerHTML] = [];
        });



        profiler("Getting Legacy Yarn Intermediary Versions");
        const yarnRes = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/yarn/maven-metadata.xml`);
        profilerDel("Getting Legacy Yarn Intermediary Versions");
        const yarnXML = xmlParse.parseFromString(await yarnRes.text(), "text/xml");
        Array.from(yarnXML.getElementsByTagName("versions")[0].children).forEach(e => {
            e = e.innerHTML;
            yarnVersions[e.split("+")[0]].push(e.split(".").pop());
        });
    }

    //load mcp version nums
    if (mcpVersions == null) {
        profiler("Getting MCP Versions");
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/versions.json`);
        profilerDel("Getting MCP Versions");
        mcpVersions = JSON.parse(await res.text());

        if (!("1.16" in mcpVersions)) {
            mcpVersions["1.16"] = {snapshot: [20200514]}
        }

        if (!("1.16.1" in mcpVersions)) {
            mcpVersions["1.16.1"] = {snapshot: [20200820]}
        }

        if (!("1.16.2" in mcpVersions)) {
            mcpVersions["1.16.2"] = {snapshot: [20200916]}
        }

        if (!("1.16.3" in mcpVersions)) {
            mcpVersions["1.16.3"] = {snapshot: [20201028]}
        }
        if (!("1.16.4" in mcpVersions)) {
            mcpVersions["1.16.4"] = {snapshot: [20210309]}
        }
        if (!("1.16.5" in mcpVersions)) {
            mcpVersions["1.16.5"] = {snapshot: [20210309]}
        }

        //srg versions
        const xmlParse = new DOMParser();
        profiler("Getting SRG Versions");
        const srg13res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/maven-metadata.xml`);
        profilerDel("Getting SRG Versions");
        const interXML = xmlParse.parseFromString(await srg13res.text(), "text/xml");
        Array.from(interXML.getElementsByTagName("versions")[0].children).forEach(e => {
            if (!e.innerHTML.includes("-") && !(e.innerHTML in mcpVersions)) {
                mcpVersions[e.innerHTML] = null;
            }
        });
    }

    const rawParams = window.location.search?.substring(1);
    if (rawParams) {
        const params = new Map(window.location.search.substring(1).split("&").map(e => e.split("=", 2)));
        if (params.has("mapping")) {
            for (const map of params.get("mapping").split(",")) {
                localStorage.setItem(map.trim()+"MappingCheck.value", "true");
            }
        }
        if (params.has("search")) {
            searchInput.value = params.get("search");
        }
        if (params.has("version")) {
            versionSelect.value = params.get("version");
        }
    }

    loadVersion(versionSelect.value);


}

//update version dropdowns
async function updateAvailableMCP(mcVersion) {
    mcpVersionSelect.innerHTML = "";
    profiler("Updateing MCP Versions Available");
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
    profilerDel("Updateing MCP Versions Available");
}
async function updateAvailableYarn(mcVersion) {
    yarnVersionSelect.innerHTML = "";
    profiler("Updateing Yarn Versions Available");
    for (const version of yarnVersions[mcVersion]?.sort((a, b) => parseInt(b)-parseInt(a)) ?? []) {
            const option = document.createElement("option");
            option.value = `${mcVersion}+build.${version}`;
            option.innerHTML = `build.${version}`;
            yarnVersionSelect.appendChild(option);
    }
    profilerDel("Updateing Yarn Versions Available");
}

//update loaded version
async function changeMCPVersion(mcpVersion) {

    updateVersionData();

    await setLoading(true);

    mcpSrg.methods.forEach((item) => {
        for (const methodData of item) {
            delete methodData.mcpParams;
            delete methodData.mcp;
        }
    });

    mcpSrg.fields.forEach((item) => {
        for (const fieldData of item) {
            delete fieldData.mcp;
        }
    });

    await loadMCP(mcpVersion);

    search(searchInput.value, parseInt(searchType.value));
}
async function changeYarnVersion(yarnVersion) {

    updateVersionData();

    await setLoading(true);

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

//load version
async function loadVersion(mcVersion) {

    updateVersionData();

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

    //is intermediary available
    if (mcVersion in yarnVersions) {
        if (yarnIntermediaryMappingCheck.disabled) {
            yarnIntermediaryMappingCheck.disabled = false;
            yarnIntermediaryMappingCheck.checked = localStorage.getItem("yarnIntermediaryMappingCheck.value") == "true";
        }
    } else {
        yarnIntermediaryMappingCheck.checked = false;
        yarnIntermediaryMappingCheck.disabled = true;
    }

    //is yarn available
    if (mcVersion in yarnVersions && yarnVersions[mcVersion].length) {
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

    //is SRG available
    if (mcVersion in mcpVersions) {
        if (srgMappingCheck.disabled) {
            srgMappingCheck.disabled = false;
            srgMappingCheck.checked = localStorage.getItem("srgMappingCheck.value") == "true";
        }
    } else {
        srgMappingCheck.checked = false;
        srgMappingCheck.disabled = true;
    }

    //is MCP available
    if (mcVersion in mcpVersions && mcpVersions[mcVersion] !== null) {
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

    updateVersionData();

    if (mojangMappingCheck.checked)
        await loadMojang(mcVersion);

    if (yarnIntermediaryMappingCheck.checked || yarnMappingCheck.checked)
        await loadYarnIntermediaries(mcVersion);

    if (yarnMappingCheck.checked && yarnVersionSelect.value != "")
        await loadYarn(yarnVersionSelect.value);

    if (srgMappingCheck.checked || mcpMappingCheck.checked)
        await loadMCPSrgs(mcVersion);

    if (mcpMappingCheck.checked && mcpVersionSelect.value != "")
        await loadMCP(mcpVersionSelect.value);

    search(searchInput.value, parseInt(searchType.value));

    if (!confirmMojang && mojangMappingCheck.checked) {
        mojangConfirmPrompt.style.display = null;
        results.style.visibility = "hidden";
    } else {
        mojangConfirmPrompt.style.display = "none";
        results.style.visibility = "visible";
    }
}
function setTopbars() {
    profiler("Updating Table Headers");
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

        if (srgMappingCheck.checked || mcpMappingCheck.checked) {
            const mcp = document.createElement("th");
            const text = [];
            if (srgMappingCheck.checked)
                text.push("SRG");
            if (mcpMappingCheck.checked)
                text.push("MCP");
            mcp.innerHTML = text.join("/");
            classTableHead.appendChild(mcp);
        }

        if (yarnIntermediaryMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            classTableHead.appendChild(yarnIntermediary);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
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

        if (srgMappingCheck.checked) {
            const srg = document.createElement("th");
            srg.innerHTML = "SRG";
            methodTableHead.appendChild(srg);
        }

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            methodTableHead.appendChild(mcp);
        }

        if (yarnIntermediaryMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            methodTableHead.appendChild(yarnIntermediary);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("th");
            yarn.innerHTML = "Yarn";
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

        if (srgMappingCheck.checked) {
            const srg = document.createElement("th");
            srg.innerHTML = "SRG";
            fieldTableHead.appendChild(srg);
        }

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("th");
            mcp.innerHTML = "MCP";
            fieldTableHead.appendChild(mcp);
        }

        if (yarnIntermediaryMappingCheck.checked) {
            const yarnIntermediary = document.createElement("th");
            yarnIntermediary.innerHTML= "Yarn Intermediary";
            fieldTableHead.appendChild(yarnIntermediary);
        }

        if (yarnMappingCheck.checked) {
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

    buildResize(classes);
    buildResize(method);
    buildResize(params);
    buildResize(fields);
    profilerDel("Updating Table Headers");
}

function buildResize(table) {
    // Query all headers
    const cols = table.querySelectorAll('th');

    // Loop over them
    [].forEach.call(cols, function(col) {
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

function createResizableColumn(col, resizer) {
    // Track the current position of mouse
    let x = 0;
    let w = 0;

    const mouseDownHandler = function(e) {
        // Get the current mouse position
        x = e.clientX;

        // Calculate the current width of column
        const styles = window.getComputedStyle(col);
        w = parseInt(styles.width, 10);

        // Attach listeners for document's events
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function(e) {
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

//MCP
async function loadMCP(mcpVersion) {
    mcpVersion = mcpVersion.split("-");
    const stableSnapshot = mcpVersion.shift();
    const verNum = mcpVersion.shift();
    const mcVersion = mcpVersion.shift();
    profiler("Downloading MCP Mappings");
    const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_${stableSnapshot}/${verNum}-${mcVersion}/mcp_${stableSnapshot}-${verNum}-${mcVersion}.zip`);
    profilerDel("Downloading MCP Mappings");
    const zipContent = await zip.loadAsync(await res.arrayBuffer());
    const fieldCSV = (await zipContent.file("fields.csv").async("string"));
    const methodCSV = (await zipContent.file("methods.csv").async("string"));
    const paramsCSV = (await zipContent.file("params.csv").async("string"));

    parseMCPCSV(fieldCSV, methodCSV, paramsCSV);
}
function parseMCPCSV(fieldCSV, methodCSV, paramsCSV) {
    profiler("Parsing MCP Mappings");

    fieldCSV = fieldCSV.split("\n");
    methodCSV = methodCSV.split("\n");
    paramsCSV = paramsCSV.split("\n");

    fieldCSV.shift();
    methodCSV.shift();
    paramsCSV.shift();

    for (let field of fieldCSV) {
        if (field == "") continue;
        field = field.split(",");
        const srg = field.shift().trim();
        const named = field.shift().trim();
        for (const combinedField of mcpSrg.fields.get(srg) ?? []) {
            combinedField.mcp = named;
        }
    }

    for (let method of methodCSV) {
        if (method == "") continue;
        method = method.split(",");
        const srg = method.shift().trim();
        const named = method.shift().trim();
        for (const combinedMethod of mcpSrg.methods.get(srg) ?? []) {
            combinedMethod.mcp = named;
        }
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

    profilerDel("Parsing MCP Mappings");
    loadedMCP = true;
}

async function loadMCPSrgs(mcVersion) {
    if (mcVersionCompare(mcVersion, "1.12.2") != -1) {
        profiler("Downloading SRG Mappings");
        const res = await fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/${mcVersion}/mcp_config-${mcVersion}.zip`);
        profilerDel("Downloading SRG Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        paraseMCPSrgsTSRG(await zipContent.file("config/joined.tsrg").async("string"))

    } else {
        profiler("Downloading SRG Mappings");
        const res = await fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp/${mcVersion}/mcp-${mcVersion}-srg.zip`);
        profilerDel("Downloading SRG Mappings");
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        parseMCPSRGsSRG(await zipContent.file("joined.srg").async("string"));
    }
}
function paraseMCPSrgsTSRG(mappings) {
    profiler("Parsing SRG Mappings");
    mappings = mappings.split("\n\t").join("\t").split("\n");

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
                if (!mcpSrg.methods.has(srg)) {
                    mcpSrg.methods.set(srg, [combinedMethod]);
                } else {
                    mcpSrg.methods.get(srg).push(combinedMethod);
                }
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
                if (!mcpSrg.fields.has(srg)) {
                    mcpSrg.fields.set(srg, [combinedField]);
                } else {
                    mcpSrg.fields.get(srg).push(combinedField);
                }
            }
        }
    }
    profilerDel("Parsing SRG Mappings");
    loadedSRG = true;
}
function parseMCPSRGsSRG(mappings) {
    mappings = mappings.split("\n");
    profiler("Downloading SRG Mappings");
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
                if (mcpSrg.fields.has(srg)) {
                    mcpSrg.fields.get(srg).push(combinedField);
                } else {
                    mcpSrg.fields.set(srg, [combinedField]);
                }
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
                if (mcpSrg.methods.has(srg)) {
                    mcpSrg.methods.get(srg).push(combinedMethod);
                } else {
                    mcpSrg.methods.set(srg, [combinedMethod]);
                }
                break;
            }
            default:
        }
    }
    profilerDel("Downloading SRG Mappings");
    loadedSRG = true;
}

//Yarn
async function loadYarn(yarnVersion) {
    let res;
    profiler("Downloading Yarn Mappings");
    if (mcVersionCompare(versionSelect.value, "1.14") != -1)
        res = await fetch(`https://maven.fabricmc.net/net/fabricmc/yarn/${yarnVersion}/yarn-${yarnVersion}-v2.jar`);
    else
        res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/yarn/${yarnVersion}/yarn-${yarnVersion}-v2.jar`);
    profilerDel("Downloading Yarn Mappings");
    const zipContent = await zip.loadAsync(await res.arrayBuffer());

    parseYarn(await zipContent.file("mappings/mappings.tiny").async("string"))

}
function parseYarn(mappings) {
    profiler("Parsing Yarn Mappings");
    mappings = mappings.split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
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
    profilerDel("Parsing Yarn Mappings");

    loadedYarn = true;
}
async function loadYarnIntermediaries(mcVersion) {
    let res;
    profiler("Downloading Yarn Intermediary Mappings");
    if (mcVersionCompare(mcVersion, "1.14") != -1)
        res = await fetch(`https://maven.fabricmc.net/net/fabricmc/intermediary/${mcVersion}/intermediary-${mcVersion}-v2.jar`);
    else
        res = await fetch(`${NO_CORS_BYPASS}/https://maven.legacyfabric.net/net/fabricmc/intermediary/${mcVersion}/intermediary-${mcVersion}-v2.jar`);
    profilerDel("Downloading Yarn Intermediary Mappings");
    const zipContent = await zip.loadAsync(await res.arrayBuffer());

    parseYarnIntermediaries(await zipContent.file("mappings/mappings.tiny").async("string"));
}
function parseYarnIntermediaries(mappings) {
    profiler("Parsing Yarn Intermediary Mappings");
    //mappings split by class
    mappings = mappings.split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
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
    profilerDel("Parsing Yarn Intermediary Mappings");
    loadedYarnIntermediaries = true;
}

//Mojang
async function loadMojang(mcVersion) {
    let versionData = null;
    for (const version of minecraftVersions) {
        if (version.id == mcVersion) {
            versionData = version;
            break;
        }
    }
    const mappingURL = JSON.parse(await (await fetch(versionData.url)).text())?.downloads?.client_mappings?.url;
    profiler("Downloading Mojang Mappings");
    let mappings = (await (await fetch(`${NO_CORS_BYPASS}/${mappingURL}`))?.text())?.split("<").join("&lt;").split(">").join("&gt;").split(".").join("/");
    profilerDel("Downloading Mojang Mappings");
    profiler("Parsing Mojang Mappings");
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
            const matchMethod = line.match(/^(?:\d+:\d+:)?([^\s]+)\s*([^\s]+)\((.*?)\)\s*-&gt;\s*([^\s]+)/);
            if (matchMethod) {
                classData.methods.set(matchMethod[2], {retval:matchMethod[1], params:matchMethod[3], obf:matchMethod[4]});
                continue;
            }
            const matchField = line.match(/^([^\d][^\s]+)\s*([^\s\(]+)\s*-&gt;\s*([^\s]+)/);
            if (matchField) {
                classData.fields.set(matchField[2], {desc:matchField[1], obf:matchField[3]});
                continue;
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
    profilerDel("Parsing Mojang Mappings");

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

function mapping() {
    const mappings = [];
    if (yarnMappingCheck.checked) {
        mappings.push("yarn");
    }
    if (yarnIntermediaryMappingCheck.checked) {
        mappings.push("yarnIntermediary");
    }
    if (srgMappingCheck.checked) {
        mappings.push("srg");
    }
    if (mcpMappingCheck.checked) {
        mappings.push("mcp");
    }
    if (mojangMappingCheck.checked) {
        mappings.push("mojang");
    }
    return mappings;
}

//search stuff
function search(query, type = 0) {
    setLoading(true);
    window.history.replaceState({}, '', `${window.location.href.split('?')[0]}?version=${versionSelect.value}&mapping=${mapping().join(",")}&search=${query}`);

    profiler("Searching");

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
                if (mojangMappingCheck.checked && methodData.mojang?.toLowerCase().includes(query)) return classes.push([7, className]);
                if (srgMappingCheck.checked && methodData.srg?.toLowerCase().includes(query)) return classes.push([8, className]);
                if (mcpMappingCheck.checked && methodData.mcp?.toLowerCase().includes(query)) return classes.push([9, className]);
                if (yarnIntermediaryMappingCheck.checked && methodData.yarnIntermediary?.toLowerCase().includes(query)) return classes.push([10, className]);
                if (yarnMappingCheck.checked && methodData.yarn?.toLowerCase().includes(query)) return classes.push([11, className]);

                if (mcpMappingCheck.checked && methodData.mcpParams) {
                    for (const [paramIndex, paramName] of methodData.mcpParams) {
                        if (paramName.toLowerCase().includes(query)) return classes.push([12, className]);
                    }
                }

                if (yarnMappingCheck.checked && methodData.yarnParams) {
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
                if (mojangMappingCheck.checked && fieldData.mojang?.toLowerCase().includes(query)) return classes.push([16, className]);
                if (srgMappingCheck.checked && fieldData.srg?.toLowerCase().includes(query)) return classes.push([17, className]);
                if (mcpMappingCheck.checked && fieldData.mcp?.toLowerCase().includes(query)) return classes.push([18, className]);
                if (yarnIntermediaryMappingCheck.checked && fieldData.yarnIntermediary?.toLowerCase().includes(query)) return classes.push([19, className]);
                if (yarnMappingCheck.checked && fieldData.yarn?.toLowerCase().includes(query)) return classes.push([20, className]);
            }
        }
    });


    profilerDel("Searching");
    profiler("Building Class Table");

    //sort
    classes = classes.sort((a,b) => a[0]-b[0]);

    //add classes
    for (const [sortNum, className] of classes) {
        addClass(className, query);
    }

    profilerDel("Building Class Table");
    setLoading(false);

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

    if (srgMappingCheck.checked || mcpMappingCheck.checked) {
        const mcp = document.createElement("td");
        mcp.innerHTML = classData.mcp ?? "-";

        row.appendChild(mcp);
    }

    if (yarnIntermediaryMappingCheck.checked) {
        const yarnIntermediary = document.createElement("td");
        yarnIntermediary.innerHTML = classData.yarnIntermediary ?? "-";
        row.appendChild(yarnIntermediary);
    }

    if (yarnMappingCheck.checked) {
        const yarn = document.createElement("td");
        yarn.innerHTML = classData.yarn ?? "-";
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

//class method + field display stuff
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
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += methodSignatureTransform(methodData, methodName, "mojang");
            }
            row.appendChild(mojang);
        }

        if (srgMappingCheck.checked) {
            const srg = document.createElement("td");
            srg.innerHTML = methodData.srg ?? "-";
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += methodSignatureTransform(methodData, methodName, "srg");
            }
            row.appendChild(srg);
        }

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("td");
            mcp.innerHTML = methodData.mcp ?? methodData.srg ?? "-";
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += methodSignatureTransform(methodData, methodName, "mcp");
            }
            row.appendChild(mcp);
        }

        if (yarnIntermediaryMappingCheck.checked) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = methodData.yarnIntermediary ?? "-";
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += methodSignatureTransform(methodData, methodName, "yarnIntermediary");
            }
            row.appendChild(yarnIntermediary);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("td");
            yarn.innerHTML = methodData.yarn ?? methodData.yarnIntermediary ?? "-";
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += methodSignatureTransform(methodData, methodName, "yarn");
            }
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
            child.offsetParent.scrollTo(0, child.offsetTop-(child.offsetHeight));
            child.click();
            break;
        }
    }

    //fields
    for (const [fieldName, fieldData] of fields) {
        if (!fieldName) continue;
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        obf.innerHTML = fieldName + (fieldData.desc ? `:${fieldData.desc}` : "");
        row.appendChild(obf);

        if (mojangMappingCheck.checked) {
            const mojang = document.createElement("td");
            mojang.innerHTML = fieldData.mojang ?? "-";
            if (mojang.innerHTML != "-" && mojangSignatureCheck.checked) {
                mojang.innerHTML += fieldSignatureTransform(fieldData.desc, "mojang");
            }
            row.appendChild(mojang);
        }

        if (srgMappingCheck.checked) {
            const srg = document.createElement("td");
            srg.innerHTML = fieldData.srg ?? "-";
            if (srg.innerHTML != "-" && srgSignatureCheck.checked) {
                srg.innerHTML += fieldSignatureTransform(fieldData.desc, "srg");
            }
            row.appendChild(srg);
        }

        if (mcpMappingCheck.checked) {
            const mcp = document.createElement("td");
            mcp.innerHTML = fieldData.mcp ?? fieldData.srg ?? "-";
            if (mcp.innerHTML != "-" && mcpSignatureCheck.checked) {
                mcp.innerHTML += fieldSignatureTransform(fieldData.desc, "mcp");
            }
            row.appendChild(mcp);
        }

        if (yarnIntermediaryMappingCheck.checked) {
            const yarnIntermediary = document.createElement("td");
            yarnIntermediary.innerHTML = fieldData.yarnIntermediary ?? "-";
            if (yarnIntermediary.innerHTML != "-" && yarnIntermediarySignatureCheck.checked) {
                yarnIntermediary.innerHTML += fieldSignatureTransform(fieldData.desc, "yarnIntermediary");
            }
            row.appendChild(yarnIntermediary);
        }

        if (yarnMappingCheck.checked) {
            const yarn = document.createElement("td");
            yarn.innerHTML = fieldData.yarn ?? fieldData.yarnIntermediary ?? "-";
            if (yarn.innerHTML != "-" && yarnSignatureCheck.checked) {
                yarn.innerHTML += fieldSignatureTransform(fieldData.desc, "yarn");
            }
            row.appendChild(yarn);
        }

        FieldTable.appendChild(row);
    }

}
function methodSignatureTransform(method, methodName, targetSig) {
    const m = methodName.match(/.+\((.*)\)(.+)/);
    if (m) {
        const params = m[1].match(/\[?L.+?;|\[?[ZBCSIJFDZ]/g) ?? [];
        const newParams = [];
        const retval = m[2];
        for (const param of params) {
            const mat = param.match(/(\[*)L(.+?);/);
            if (mat) {
                let cdata = combinedMap.get(mat[2]);
                if (targetSig == "yarn") {
                    newParams.push(`${mat[1]}L${cdata?.yarn ?? cdata?.yarnIntermediary ?? mat[2]};`)
                } else if (targetSig == "srg") {
                    newParams.push(`${mat[1]}L${cdata?.mcp ?? mat[2]};`);
                } else {
                    newParams.push(`${mat[1]}L${cdata ? cdata[targetSig] : mat[2]};`);
                }
            } else {
                newParams.push(param);
            }
        }
        let newRetVal = retval;
        const mat = retval.match(/(\[*)L(.+?);/);
        if (mat) {
            let cdata = combinedMap.get(mat[2]);
            if (targetSig == "yarn") {
                newRetVal = `${mat[1]}L${cdata?.yarn ?? cdata?.yarnIntermediary ?? mat[2]};`
            } else if (targetSig == "srg") {
                newRetVal = `${mat[1]}L${cdata?.mcp ?? mat[2]};`;
            } else {
                newRetVal = `${mat[1]}L${cdata ? cdata[targetSig] : mat[2]};`;
            }
        }
        return `(${newParams.join("")})${newRetVal}`;
    }
    return "";
}
function fieldSignatureTransform(fieldDesc, targetSig) {
    if (!fieldDesc) return "";
    const mat = fieldDesc.match(/(\[*)L(.+?);/);
    if (mat) {
        let cdata = combinedMap.get(mat[2]);
        if (targetSig == "yarn") {
            return `:${mat[1]}L${cdata?.yarn ?? cdata?.yarnIntermediary ?? mat[2]};`
        } else if (targetSig == "srg") {
            return `:${mat[1]}L${cdata?.mcp ?? mat[2]};`;
        } else {
            return `:${mat[1]}L${cdata ? cdata[targetSig] : mat[2]};`;
        }
    }
    return `:${fieldDesc}`;
}

//show method params
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

//show user data shit
function setLoading(bool) {
    return new Promise((res, rej) => {
        profiler("Page Rendering");
        if (bool) {
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
function updateVersionData() {
    const enabledMappings = [];
    if (mojangMappingCheck.checked) {
        enabledMappings.push("Mojang");
    }
    if (srgMappingCheck.checked) {
        enabledMappings.push("SRG");
    }
    if (mcpMappingCheck.checked) {
        enabledMappings.push("MCP");
    }
    if (yarnIntermediaryMappingCheck.checked) {
        enabledMappings.push("Yarn Intermediary");
    }
    if (yarnMappingCheck.checked) {
        enabledMappings.push("Yarn");
    }
    versionData.innerHTML = `${versionSelect.value} | ${enabledMappings.join(" | ")}`
}

//export
function updateExportMappings() {
    exportFrom.innerHTML = "";
    {
        const option = document.createElement("option");
        option.innerHTML = "Obfuscated";
        option.value = `obf`;
        exportFrom.appendChild(option);
    }
    if (mojangMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Mojang";
        option.value = `mojang`;
        exportFrom.appendChild(option);
    }
    if (srgMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Searge";
        option.value = `srg`;
        exportFrom.appendChild(option);
    }
    if (mcpMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "MCP";
        option.value = `mcp`;
        exportFrom.appendChild(option);
    }
    if (yarnIntermediaryMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Yarn Intermediary";
        option.value = `yarnIntermediary`;
        exportFrom.appendChild(option);
    }
    if (yarnMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Yarn";
        option.value = `yarn`;
        exportFrom.appendChild(option);
    }

    exportTo.innerHTML = "";
    {
        const option = document.createElement("option");
        option.innerHTML = "Obfuscated";
        option.value = `obf`;
        exportTo.appendChild(option);
    }
    if (mojangMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Mojang";
        option.value = `mojang`;
        exportTo.appendChild(option);
    }
    if (srgMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Searge";
        option.value = `srg`;
        exportTo.appendChild(option);
    }
    if (mcpMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "MCP";
        option.value = `mcp`;
        exportTo.appendChild(option);
    }
    if (yarnIntermediaryMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Yarn Intermediary";
        option.value = `yarnIntermediary`;
        exportTo.appendChild(option);
    }
    if (yarnMappingCheck.checked) {
        const option = document.createElement("option");
        option.innerHTML = "Yarn";
        option.value = `yarn`;
        exportTo.appendChild(option);
    }
}
function exportToTiny() {
    const from = exportFrom.value;
    const fromFallback = from == "yarn" ? "yarnIntermediary" : from == "mcp" ? "srg" : null;
    const to = exportTo.value;
    const toFallback = to == "yarn" ? "yarnIntermediary" : to == "mcp" ? "srg" : null;
    exportStr = [`tiny\t2\t0\t${exportFrom.value}\t${exportTo.value}`];
    combinedMap.forEach((cdata, cname) => {
        {
            let cfrom;
            switch (from) {
                case "obf":
                    cfrom = cname;
                    break;
                case "srg":
                    cfrom = cdata["mcp"];
                    break;
                default:
                    cfrom = cdata[from] ?? cdata[fromFallback];
            }
            let cto;
            switch (to) {
                case "obf":
                    cto = cname;
                    break;
                case "srg":
                    cto = cdata["mcp"];
                    break;
                default:
                    cto = cdata[to] ?? cdata[toFallback];
            }
            if (!cfrom || !cto) return;
            exportStr.push(`c\t${cfrom}\t${cto}`);
        }
        cdata.methods.forEach((mdata, mname) => {
            const mfrom = from == "obf" ? mname.split("(")[0] : mdata[from] ?? mdata[fromFallback];
            const mto = to == "obf" ? mname.split("(")[0] : mdata[to] ?? mdata[toFallback];
            const msig = from == "obf" ? "(" + mname.split("(")[1] : methodSignatureTransform(mdata, mname, from);
            if (!mfrom || !mto) return;
            exportStr.push(`\tm\t${msig}\t${mfrom}\t${mto}`);
        });

        cdata.fields.forEach((fdata, fname) => {
            const fsig = from != "obf" ? fieldSignatureTransform(fdata.desc, from).replace(":", "") : fdata.desc;
            const ffrom = from == "obf" ? fname : fdata[from] ?? fdata[fromFallback];
            const fto = to == "obf" ? fname : fdata[to] ?? fdata[toFallback];
            if (!ffrom || !fto) return;
            exportStr.push(`\tf\t${fsig}\t${ffrom}\t${fto}`);
        });
    });
    download(exportStr.join("\n").split("&lt;").join("<").split("&gt;").join(">"), "mappings.tiny", "text/plain");
}

function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
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

//import
async function importFile() {
    await setLoading(true);
    const file = customMapping.files[0];
    if (file) {
        let type = Array.from(importType.children).map(e => e.children[0]).filter(e => e.checked)[0].value;
        switch (type) {
            case "yarnIntermediary":
                {
                    if (!file.name.endsWith(".tiny")) {
                        alert("intermediary mapping must be a .tiny file.");
                        setLoading(false);
                        return;
                    }

                    yarnIntermediaryMappingCheck.disabled = false;
                    yarnIntermediaryMappingCheck.checked = true;

                    const reader = new FileReader();
                    reader.onloadend = (e) => {
                        const content = reader.result;
                        if (loadedYarnIntermediaries) {
                            yarnIntermediary.forEach((cclass) => {
                                delete cclass.combined.yarnIntermediary;
                                cclass.fields.forEach((cfield) => {
                                    delete cfield.yarnIntermediary;
                                });
                                cclass.methods.forEach((cmethod) => {
                                    delete cmethod.yarnIntermediary;
                                });
                            });
                            yarnIntermediary.clear();
                        }

                        parseYarnIntermediaries(content);
                        search(searchInput.value, parseInt(searchType.value));
                    }
                    reader.readAsText(file);
                }
                break;
            case "yarn":
                {
                    if (!file.name.endsWith(".tiny")) {
                        alert("yarn mapping must be a .tiny file.");
                        setLoading(false);
                        return;
                    } else if (!loadedYarnIntermediaries) {
                        alert("Please load yarn Intermediary mappings first");
                        setLoading(false);
                        return;
                    }

                    yarnMappingCheck.disabled = false;
                    yarnMappingCheck.checked = true;

                    const reader = new FileReader();
                    reader.onloadend = (e) => {
                        const content = reader.result;
                        if (loadedYarn) {
                            yarnIntermediary.forEach((item, i) => {
                                item.methods.forEach((item, i) => {
                                    delete item.yarnParams;
                                    delete item.yarn;
                                });
                                item.fields.forEach((item, i) => {
                                    delete item.yarn;
                                });
                            });
                        }
                        parseYarn(content);
                        search(searchInput.value, parseInt(searchType.value));
                    }
                    reader.readAsText(file);
                }
                break;
            case "srg":
                {
                    if (!file.name.endsWith(".tsrg") && !file.name.endsWith(".srg")) {
                        alert("SRG mapping must be a .tsrg or .srg file.");
                        setLoading(false);
                        return;
                    }

                    srgMappingCheck.disabled = false;
                    srgMappingCheck.checked = true;

                    const reader = new FileReader();
                    reader.onloadend = (e) => {
                        const content = reader.result;

                        mcpSrg.methods.forEach((item) => {
                            for (const methodData of item) {
                                delete methodData.mcpParams;
                                delete methodData.mcp;
                            }
                        });

                        mcpSrg.fields.forEach((item) => {
                            for (const fieldData of item) {
                                delete fieldData.mcp;
                            }
                        });

                        mcpSrg.methods.clear();
                        mcpSrg.fields.clear();
                        mcpSrg.paramDef.clear();

                        if (file.name.endsWith(".tsrg")) {
                            paraseMCPSrgsTSRG(content);
                        } else {
                            parseMCPSRGsSRG(content);
                        }
                        search(searchInput.value, parseInt(searchType.value));

                    }
                    reader.readAsText(file);
                }
                break;
            case "mcp":
                {
                    if (!file.name.endsWith(".zip")) {
                        alert("MCP mapping must be a .tsrg or .srg file.");
                        setLoading(false);
                        return;
                    } else if (!loadedSRG) {
                        alert("please load srg's first");
                        setLoading(false);
                        return;
                    }

                    mcpMappingCheck.disabled = false;
                    mcpMappingCheck.checked = true;

                    const reader = new FileReader();
                    reader.onloadend = async (e) => {
                        const content = reader.result;
                        if (loadedMCP) {
                            mcpSrg.methods.forEach((item) => {
                                for (const methodData of item) {
                                    delete methodData.mcpParams;
                                    delete methodData.mcp;
                                }
                            });

                            mcpSrg.fields.forEach((item) => {
                                for (const fieldData of item) {
                                    delete fieldData.mcp;
                                }
                            });
                        }
                        console.log(content);
                        const zipContent = await zip.loadAsync(content);
                        const fieldCSV = (await zipContent.file("fields.csv").async("string"));
                        const methodCSV = (await zipContent.file("methods.csv").async("string"));
                        const paramsCSV = (await zipContent.file("params.csv").async("string"));

                        parseMCPCSV(fieldCSV, methodCSV, paramsCSV);
                        search(searchInput.value, parseInt(searchType.value));
                    }
                    reader.readAsArrayBuffer(file);
                }
                break;
        }
    }
}

//profiler
function profiler(text) {
    const cont = document.createElement("div")
    cont.innerHTML = text;
    loadingProfiler.appendChild(cont);
}
function profilerDel(text) {
    for (const child of loadingProfiler.children) {
        if (child.innerHTML == text) {
            loadingProfiler.removeChild(child);
            break;
        }
    }
}

//init
{
    versionSelect.addEventListener("change", async (e) => {
        await setLoading(true);
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
        results.style.maxHeight = `${window.innerHeight-topbar.offsetHeight}px`
    }

    window.addEventListener('resize', windowResize);

    windowResize();

    showSnapshots.addEventListener('click', (e) => {
        loadMCVersions();
        localStorage.setItem("showSnapshots.value", showSnapshots.checked);
    });

    showSnapshots.checked = localStorage.getItem("showSnapshots.value") == "true";

    mojangMappingCheck.addEventListener('click', async (e) => {
        await setLoading(true);
        if (!mojangMappingCheck.disabled)
            localStorage.setItem("mojangMappingCheck.value", mojangMappingCheck.checked);
        if (mojangMappingCheck.checked && !loadedMojang) {
            await loadMojang(versionSelect.value);
        }

        search(searchInput.value, parseInt(searchType.value));

        if (!confirmMojang && mojangMappingCheck.checked) {
            mojangConfirmPrompt.style.display = null;
            results.style.visibility = "hidden";
        } else {
            mojangConfirmPrompt.style.display = "none";
            results.style.visibility = "visible";
        }
    });

    mojangMappingCheck.checked = localStorage.getItem("mojangMappingCheck.value") == "true";

    mojangSignatureCheck.addEventListener('click', async (e) => {
        localStorage.setItem("mojangSignatureCheck.value", mojangSignatureCheck.checked);
        if (mojangMappingCheck.checked) {
            await setLoading(true);
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    mojangSignatureCheck.checked = localStorage.getItem("mojangSignatureCheck.value") == "true";

    mojangConfirm.addEventListener("click", async () => {
        confirmMojang = true;
        mojangConfirmPrompt.style.display = "none";
        results.style.visibility = "visible";
    });

    mojangDeny.addEventListener("click", async () => {
        confirmMojang = false;

        mojangMappingCheck.checked = false;
        localStorage.setItem("mojangMappingCheck.value", false);


        await setLoading(true);
        mojangConfirmPrompt.style.visibility = "hidden";

        loadVersion(versionSelect.value);
    });

    srgMappingCheck.addEventListener('click', async (e) => {
        await setLoading(true);
        if (!srgMappingCheck.disabled)
            localStorage.setItem("srgMappingCheck.value", srgMappingCheck.checked);

        if (srgMappingCheck.checked && !loadedSRG) {
            await loadMCPSrgs(versionSelect.value);
        }

        updateVersionData();

        search(searchInput.value, parseInt(searchType.value));
    });

    srgMappingCheck.checked = localStorage.getItem("srgMappingCheck.value") == "true";

    srgSignatureCheck.addEventListener('click', async (e) => {
        localStorage.setItem("srgSignatureCheck.value", srgSignatureCheck.checked);
        if (srgMappingCheck.checked) {
            await setLoading(true);
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    srgSignatureCheck.checked = localStorage.getItem("srgSignatureCheck.value") == "true";

    mcpMappingCheck.addEventListener('click', async (e) => {
        await setLoading(true);
        if (!mcpMappingCheck.disabled)
            localStorage.setItem("mcpMappingCheck.value", mcpMappingCheck.checked);

        if (mcpMappingCheck.checked && !loadedSRG) {
            await loadMCPSrgs(versionSelect.value);
        }
        if (mcpMappingCheck.checked && !loadedMCP) {
            await loadMCP(mcpVersionSelect.value);
        }

        updateVersionData();

        search(searchInput.value, parseInt(searchType.value));
    });

    mcpMappingCheck.checked = localStorage.getItem("mcpMappingCheck.value") == "true";

    mcpSignatureCheck.addEventListener('click', async (e) => {
        localStorage.setItem("mcpSignatureCheck.value", mcpSignatureCheck.checked);
        if (mcpMappingCheck.checked) {
            await setLoading(true);
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    mcpSignatureCheck.checked = localStorage.getItem("mcpSignatureCheck.value") == "true";

    yarnIntermediaryMappingCheck.addEventListener('click', async (e) => {
        await setLoading(true);
        if (!yarnIntermediaryMappingCheck.disabled)
            localStorage.setItem("yarnIntermediaryMappingCheck.value", yarnIntermediaryMappingCheck.checked);
        if (yarnIntermediaryMappingCheck.checked && !loadedYarnIntermediaries) {
            await loadYarnIntermediaries(versionSelect.value);
        }

        updateVersionData();

        search(searchInput.value, parseInt(searchType.value));
    });

    yarnIntermediaryMappingCheck.checked = localStorage.getItem("yarnIntermediaryMappingCheck.value") == "true";

    yarnIntermediarySignatureCheck.addEventListener('click', async (e) => {
        localStorage.setItem("yarnIntermediarySignatureCheck.value", yarnIntermediarySignatureCheck.checked);
        if (yarnIntermediaryMappingCheck.checked) {
            await setLoading(true);
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    yarnIntermediarySignatureCheck.checked = localStorage.getItem("yarnIntermediarySignatureCheck.value") == "true";

    yarnMappingCheck.addEventListener('click', async (e) => {
        await setLoading(true);
        if (!yarnMappingCheck.disabled)
            localStorage.setItem("yarnMappingCheck.value", yarnMappingCheck.checked);
        if (yarnMappingCheck.checked && !loadedYarnIntermediaries) {
            await loadYarnIntermediaries(versionSelect.value);
        }
        if (yarnMappingCheck.checked && !loadedYarn) {
            await loadYarn(yarnVersionSelect.value);
        }

        updateVersionData();

        search(searchInput.value, parseInt(searchType.value));
    });

    if (localStorage.getItem("yarnMappingCheck.value") !== "false") {
        localStorage.setItem("yarnMappingCheck.value", true);
        yarnMappingCheck.checked = true;
    } else {
        yarnMappingCheck.checked = false;
    }

    yarnSignatureCheck.addEventListener('click', async (e) => {
        localStorage.setItem("yarnSignatureCheck.value", yarnSignatureCheck.checked);
        if (yarnMappingCheck.checked) {
            await setLoading(true);
            search(searchInput.value, parseInt(searchType.value));
        }
    });

    yarnSignatureCheck.checked = localStorage.getItem("yarnSignatureCheck.value") == "true";


    if (mobile.mobile()) {
        loading.style.display = "none";
        mobileConfirmPrompt.style.display = null;
    } else {
        loadMCVersions();
    }

    mobileConfirm.addEventListener("click", async () => {
        await setLoading(true);
        mobileConfirmPrompt.style.display = "none";
        loadMCVersions();
    });

    settingsBtn.addEventListener("click", () => {
        settings.style.display = null;
    });

    closeSettings.addEventListener("click", () => {
        settings.style.display = "none";
    });

    exportBtn.addEventListener("click", () => {
        updateExportMappings();
        exportPop.style.display = null;
    });

    exportConfirm.addEventListener("click", () => {
        exportToTiny();
    });

    closeExport.addEventListener("click", () => {
        exportPop.style.display = "none";
    });

    importBtn.addEventListener("click", () => {
        importPop.style.display = null;
    });

    closeImport.addEventListener("click", () => {
        importPop.style.display = "none";
    });

    confirmImport.addEventListener("click", importFile);
}
