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

let srgMappings = new Map();
let mcpMappings = new Map();

let selectedClass = null;
let selectedMethod = null;

let versionsMCP = null;

function start() {
    searchInput.value = "";

    //get minecraft game versions
    fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/versions.json`).then(async(res) => {
        const body = JSON.parse(await res.text());

        //add versions to drop down menu
        for (const match of Object.keys(body).sort((a, b) => {
            a = a.split(".").map(e => parseInt(e));
            b = b.split(".").map(e => parseInt(e));
            const min = Math.min(a.length, b.length);
            for (let c = 0; c < min; ++c) {
                if (a[c] != b[c]) return  b[c] - a[c];
            }
            return b.length - a.length;
        })) {
            const option = document.createElement("option");
            option.innerHTML = match;
            option.value = match;
            versionSelect.appendChild(option);
        }

        versionsMCP = body;

        //set default version from localstorage if exists
        const prev = localStorage.getItem("versionSelect.value");
        if (prev && Array.from(versionSelect.options).map(e => e.value).includes(prev)) {
            versionSelect.value = prev;
        } else {
            localStorage.setItem("versionSelect.value", versionSelect.value);
        }

        //load default version
        loadVersion(versionSelect.value);
    });
}

function loadVersion(version) {
    //clear intermediary map to load a different minecraft version.
    srgMappings.clear();

    const pre13 = (() => {
        const a = version.split(".").map(e => parseInt(e));
        const b = "1.13".split(".").map(e => parseInt(e));
        const min = Math.min(a.length, b.length);
        for (let c = 0; c < min; ++c) {
            if (a[c] != b[c]) return  b[c] - a[c];
        }
        return b.length - a.length;
    })() > 0;

    if (!pre13) {
        fetch(`${NO_CORS_BYPASS}/https://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp_config/${version}/mcp_config-${version}.zip`).then(async(res) => {
            const zipContent = await zip.loadAsync(await res.arrayBuffer());

            //mappings split by class
            const mappings = (await zipContent.file("config/joined.tsrg").async("string")).split("\n\t").join("\t").split("\n");

            for (const classdata of mappings) {
                const map = classdata.split("\t");

                //store class names
                const obfsrg = map.shift().split(" ");
                const obf = obfsrg[0];
                const srg = obfsrg[1];

                //map of methods/fields
                const methods = new Map();
                const fields = new Map();

                //gen method/fields maps
                while(map.length) {
                    //next line
                    line = map.shift().split(" ");
                    //method
                    if (line.length == 3) {
                        const obf = line.shift();
                        const desc = line.shift();
                        const srg = line.shift();

                        methods.set(srg, {obf:obf, desc:desc});
                    //field
                    } else {
                        const obf = line.shift();
                        const srg = line.shift();

                        fields.set(srg, obf);
                    }
                }

                //add class with  gen'd field/methods to srgMappings map
                srgMappings.set(srg, {obf:obf, methods:methods, fields:fields});
            }

            //clear builds
            mappingSelect.innerHTML = "";

            //add options to drop down
            for (const match of versionsMCP[version]["stable"]) {
                const option = document.createElement("option");
                option.innerHTML = `stable-${match}`;
                option.value = `stable-${match}`;
                mappingSelect.appendChild(option);
            }
            for (const match of versionsMCP[version]["snapshot"]) {
                const option = document.createElement("option");
                option.innerHTML = `snapshot-${match}`;
                option.value = `snapshot-${match}`;
                mappingSelect.appendChild(option);
            }

            //load default value from storage
            const prev = localStorage.getItem("mappingSelect.value");
            if (prev && Array.from(mappingSelect.options).map(e => e.value).includes(prev)) {
                mappingSelect.value = prev;
            } else {
                localStorage.setItem("mappingSelect.value", mappingSelect.value);
            }

            //make mapping drop-down visible
            mappingSelect.style.visibility = "visible";

            //load default build
            loadMapping(version, mappingSelect.value);
        });
    } else {
        console.log(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp/${version}/mcp-${version}-srg.zip`);
        fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp/${version}/mcp-${version}-srg.zip`).then(async(res) => {
            const zipContent = await zip.loadAsync(await res.arrayBuffer());

            const mappings = (await zipContent.file("joined.srg").async("string")).split("\n");
            for (let line of mappings) {
                line = line.split(" ");
                switch(line.shift()) {
                    case "CL:":
                    {
                        const obf = line.shift();
                        const srg = line.shift().trim();
                        console.log(srg);
                        srgMappings.set(srg, {obf:obf, methods:new Map(), fields:new Map()});
                        break;
                    }
                    case "FD:":
                    {
                        const obf = line.shift().split("/")[1];
                        const rest = line.shift().split("/");
                        const srg = rest.pop();
                        const srgClass = rest.join("/");
                        console.log(srgClass + " " + srgMappings.get(srgClass));
                        srgMappings.get(srgClass.trim())?.fields.set(srg.trim(), obf);
                        break;
                    }
                    case "MD:":
                    {
                        const obf = line.shift().split("/")[1];
                        const desc = line.shift();
                        const rest = line.shift().split("/");
                        const srg = rest.pop();
                        const srgClass = rest.join("/");
                        srgMappings.get(srgClass.trim())?.methods.set(srg.trim(), {obf:obf, desc:desc});
                        break;
                    }
                    default:
                }
            }

            //clear builds
            mappingSelect.innerHTML = "";

            //add options to drop down
            for (const match of versionsMCP[version]["stable"]) {
                const option = document.createElement("option");
                option.innerHTML = `stable-${match}`;
                option.value = `stable-${match}`;
                mappingSelect.appendChild(option);
            }
            for (const match of versionsMCP[version]["snapshot"]) {
                const option = document.createElement("option");
                option.innerHTML = `snapshot-${match}`;
                option.value = `snapshot-${match}`;
                mappingSelect.appendChild(option);
            }

            //load default value from storage
            const prev = localStorage.getItem("mappingSelect.value");
            if (prev && Array.from(mappingSelect.options).map(e => e.value).includes(prev)) {
                mappingSelect.value = prev;
            } else {
                localStorage.setItem("mappingSelect.value", mappingSelect.value);
            }

            //make mapping drop-down visible
            mappingSelect.style.visibility = "visible";

            //load default build
            loadMapping(version, mappingSelect.value);
        });
    }
}

function loadMapping(version, mapping) {
    //clear mcpMappings mappings
    mcpMappings.clear();

    //fetch mcpMappings jar to load the mappings.
    fetch(`${NO_CORS_BYPASS}/http://export.mcpbot.bspk.rs/mcp_${mapping.split("-")[0]}/${mapping.split("-")[1]}-${version}/mcp_${mapping}-${version}.zip`).then(async(res) => {
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        fieldCSV = (await zipContent.file("fields.csv").async("string")).split("\n");
        methodCSV = (await zipContent.file("methods.csv").async("string")).split("\n");
        paramsCSV = (await zipContent.file("params.csv").async("string")).split("\n");

        fieldCSV.shift();
        methodCSV.shift();

        const methods = new Map();
        const fields = new Map();
        const params = new Map();

        for (let field of fieldCSV) {
            field = field.split(",");
            const srg = field.shift();
            const named = field.shift();
            fields.set(srg.trim(), named);
        }

        for (let param of paramsCSV) {
            param = param.split(",");
            const token = param.shift();
            const name = param.shift();
            if (!params.has(token.split("_")[1])) params.set(token.split("_")[1], []);
            params.get(token.split("_")[1]).push({token:token, name:name});
        }

        for (let method of methodCSV) {
            method = method.split(",");
            const srg = method.shift();
            const named = method.shift();

            const methodParams = new Map();
            if (params.get(srg.split("_")[1])) for (const param of params.get(srg.split("_")[1])) {
                methodParams.set(param.token, param.name);
            }

            methods.set(srg.trim(), {named:named, params:methodParams});
        }

        srgMappings.forEach((val, key) => {
            const classMethods = new Map();
            const classFields = new Map();

            val.methods.forEach((data, srg) => {
                const methodData = Object.assign({named:undefined, params:new Map()}, methods.get(srg.trim()));
                classMethods.set(srg, Object.assign({named:methodData.named, params:methodData.params}, data));
            });

            val.fields.forEach((obf, srg) => {
                classFields.set(srg, {named:fields.get(srg.trim()), obf:obf});
            });

            mcpMappings.set(key, {obf:val.obf, methods:classMethods, fields:classFields});
        });

        selectedClass = null;
        selectedMethod = null;
        search(searchInput.value);
        loading.style.visibility = "hidden";
        results.style.visibility = "visible";
    });
}

function search(query, type=0) {
    query = query.toLowerCase().trim();

    //clear all tables
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";
    let classes = [];

    // search and sort by where it finds the query
    mcpMappings.forEach((classData, className) => {
        if (query == "") return addClass(className);

        if ([0, 1].includes(type)) {
            if (classData.obf?.toLowerCase().includes(query)) return classes.push([1, className]);
            if (classData.named?.toLowerCase().includes(query)) return classes.push([2, className]);
            if (className?.toLowerCase().includes(query)) return classes.push([3, className]);
        }

        if ([0, 2].includes(type)) {
            for (const [methodName, methodData] of classData.methods) {
                if (methodName.includes(query)) return classes.push([4, className]);

                if (methodData.named?.toLowerCase().includes(query)) return classes.push([5, className]);
                if (methodData.obf?.toLowerCase().includes(query)) return classes.push([6, className]);
                if (methodData.desc?.toLowerCase().includes(query)) return classes.push([7, className]);

                for (const [paramIndex, paramName] of methodData.params) {
                    if (paramName.toLowerCase().includes(query)) return classes.push([8, className]);
                }
            }
        }

        if ([0, 3].includes(type)) {
            for (const [fieldName, fieldData] of classData.fields) {
                if (fieldName.toLowerCase().includes(query)) return classes.push([9, className]);
                if (fieldData.named?.toLowerCase().includes(query)) return classes.push([10, className]);
                if (fieldData.obf?.toLowerCase().includes(query)) return classes.push([11, className]);
                if (fieldData.desc?.toLowerCase().includes(query)) return classes.push([12, className]);
            }
        }
    });

    //sort
    classes = classes.sort((a,b) => a[0]-b[0]);

    //add classes
    for (const [key, className] of classes) {
        addClass(className, query);
    }
}

function addClass(className, query) {
    const classData = mcpMappings.get(className);
    if (classData == null) return;
    const row = document.createElement("tr");
    const obf = document.createElement("td");
    const int = document.createElement("td");
    row.classList.add("ClassRow");
    obf.innerHTML = classData.obf;
    int.innerHTML = className;
    row.appendChild(obf);
    row.appendChild(int);
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
    const {methods, fields} = mcpMappings.get(className);
    //methods
    for (const [methodName, methodData] of methods) {
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        const desc = document.createElement("td");
        const int = document.createElement("td");
        const named = document.createElement("td");
        row.classList.add("MethodRow");
        obf.innerHTML = methodData?.obf ? methodData?.obf : methodName;
        desc.innerHTML = methodData?.desc;
        desc.classList.add("MethodDescriptor");
        int.innerHTML = methodName;
        named.innerHTML = methodData?.named ?? methodName;
        row.appendChild(obf);
        row.appendChild(desc);
        row.appendChild(int);
        row.appendChild(named);
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
        const row = document.createElement("tr");
        const obf = document.createElement("td");
        const int = document.createElement("td");
        const named = document.createElement("td");
        obf.innerHTML = fieldData?.obf;
        int.innerHTML = fieldName;
        named.innerHTML = fieldData?.named ?? fieldName;
        row.appendChild(obf);
        row.appendChild(int);
        row.appendChild(named);
        FieldTable.appendChild(row);
    }
    if (query != "") for (const child of FieldTable.children) {
        if (child.innerText.toLowerCase().includes(query)) {
            child.offsetParent.scrollTo(0, child.offsetTop-child.offsetHeight);
            break;
        }
    }
}

function loadMethod(className, methodName) {
    ParamsTable.innerHTML = "";
    const params = mcpMappings.get(className)?.methods.get(methodName).params;
    for (const [paramNum, paramName] of params) {
        const row = document.createElement("tr");
        const num = document.createElement("td");
        const name = document.createElement("td");
        num.innerHTML = paramNum;
        name.innerHTML = paramName;
        row.appendChild(num);
        row.appendChild(name);
        ParamsTable.appendChild(row);
    }
}

versionSelect.addEventListener("change", (e) => {
    mappingSelect.style.visibility = "hidden";
    loading.style.visibility = "visible";
    results.style.visibility = "hidden";
    loadVersion(e.target.value);
    localStorage.setItem("versionSelect.value", e.target.value);
});

mappingSelect.addEventListener("change", (e) => {
    loading.style.visibility = "visible";
    results.style.visibility = "hidden";
    loadMapping(versionSelect.value, e.target.value);
    localStorage.setItem("mappingSelect.value", e.target.value);
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



if (mobile.mobile()) {
    loading.style.visibility = "hidden";
    mobileConfirmPrompt.style.visibility = "visible";
} else {
    start();
}

mobileConfirm.addEventListener("click", () => {
    loading.style.visibility = "visible";
    mobileConfirmPrompt.style.visibility = "hidden";
    start();
});
