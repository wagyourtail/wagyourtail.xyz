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

let intermediary = new Map();
let yarn = new Map();

let selectedClass = null;
let selectedMethod = null;

function start() {
    searchInput.value = "";

    //get minecraft game versions
    fetch("https://meta.fabricmc.net/v1/versions/game").then(async(res) => {
        const body = JSON.parse(await res.text());

        //add versions to drop down menu
        for (const match of body) {
            const option = document.createElement("option");
            option.innerHTML = match.version;
            option.value = match.version;
            versionSelect.appendChild(option);
        }

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
    intermediary.clear();

    //fetch intermediary jar to load the mappings.
    fetch(`https://maven.fabricmc.net/net/fabricmc/intermediary/${version}/intermediary-${version}-v2.jar`).then(async(res) => {
        const zipContent = await zip.loadAsync(await res.arrayBuffer());

        //mappings split by class
        const mappings = (await zipContent.file("mappings/mappings.tiny").async("string")).split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
        mappings.shift();

        for (const classdata of mappings) {
            const map = classdata.split(/\s+/);

            //store class names
            const obf = map.shift();
            const int = map.shift();

            //map of methods/fields
            const methods = new Map();
            const fields = new Map();

            //split to generate method/field map
            const lines = classdata.split("\n");
            let lastMethod = null;
            while(lines.length) {
                switch(lines[0].trim()[0]) {
                    //method
                    case "m":
                        {
                            const line = lines[0].trim().substring(1).trim().split(/\s+/);
                            const int = line.pop();
                            const obf = line.pop();
                            methods.set(int, obf);
                            lastMethod = int;
                        }
                        break;
                    //field
                    case "f":
                        {
                            const line = lines[0].trim().substring(1).trim().split(/\s+/);
                            const int = line.pop();
                            const obf = line.pop();
                            fields.set(int, obf);
                        }
                        break;
                    default:
                        break;
                }
                //next line
                lines.shift();
            }

            //add class with  gen'd field/methods to intermediary map
            intermediary.set(int, {obf:obf, methods:methods, fields:fields});
        }
        //get yarn versions
        fetch(`https://meta.fabricmc.net/v1/versions/mappings/${version}`).then(async (res) => {
            const body = JSON.parse(await res.text());

            //clear builds
            mappingSelect.innerHTML = "";

            //add options to drop down
            for (const match of body) {
                const option = document.createElement("option");
                option.innerHTML = match.version.substring(version.length + 1);
                option.value = match.version;
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
            loadMapping(mappingSelect.value);
        });
    });
}

function loadMapping(version) {
    //clear yarn mappings
    yarn.clear();

    //fetch yarn jar to load the mappings.
    fetch(`https://maven.fabricmc.net/net/fabricmc/yarn/${version}/yarn-${version}-v2.jar`).then(async(res) => {
        const zipContent = await zip.loadAsync(await res.arrayBuffer());
        let mappings = (await zipContent.file("mappings/mappings.tiny").async("string")).split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
        mappings.shift();
        mappings = mappings.sort();
        for (const classdata of mappings) {
            const map = classdata.split(/\s+/);
            const inter = map.shift();
            const named = map.shift();
            const methods = new Map();
            const fields = new Map();
            const lines = classdata.split("\n");
            let lastMethod = null;
            while(lines.length) {
                switch(lines[0].trim()[0]) {
                    case "m":
                        {
                            const line = lines[0].trim().substring(1).trim().split(/\s+/);
                            const named = line.pop();
                            const int = line.pop();
                            const desc = line.join(" ");
                            if (methods.has(int)) methods.get(int).push({named:named, obf:intermediary.get(inter)?.methods.get(int), desc:desc});
                            else methods.set(int, [{named:named, obf:intermediary.get(inter)?.methods.get(int), desc:desc, params: new Map()}]);
                            lastMethod = int;
                        }
                        break;
                    case "f":
                        {
                            const line = lines[0].trim().substring(1).trim().split(/\s+/);
                            const named = line.pop();
                            const int = line.pop();
                            const desc = line.join(" ");
                            fields.set(int, {named:named, obf:intermediary.get(inter)?.fields.get(int), desc:desc});
                        }
                        break;
                    case "p":
                        {
                            const line = lines[0].trim().substring(1).trim().split(/\s+/);
                            const num = line.shift();
                            const name = line.join(" ");
                            methods.get(lastMethod)?.[0].params.set(num, name);
                        }
                        break;
                    default:
                        break;
                }
                lines.shift();
            }

            yarn.set(inter, {named:named, obf:intermediary.get(inter)?.obf,methods:methods, fields:fields});
        }
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
    yarn.forEach((classData, className) => {
        if (query == "") return addClass(className);

        if ([0, 1].includes(type)) {
            if (classData.obf?.toLowerCase().includes(query)) return classes.push([1, className]);
            if (classData.named?.toLowerCase().includes(query)) return classes.push([2, className]);
            if (className.toLowerCase().includes(query)) return classes.push([3, className]);
        }

        if ([0, 2].includes(type)) {
            for (const [methodName, methodData] of classData.methods) {
                if (methodName.includes(query)) return classes.push([4, className]);

                for (const methodOverflowData of methodData) {
                    if (methodOverflowData.named?.toLowerCase().includes(query)) return classes.push([5, className]);
                    if (methodOverflowData.obf?.toLowerCase().includes(query)) return classes.push([6, className]);
                    if (methodOverflowData.desc?.toLowerCase().includes(query)) return classes.push([7, className]);
                }

                for (const [paramIndex, paramName] of methodData[0].params) {
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
    const classData = yarn.get(className);
    if (classData == null) return;
    const row = document.createElement("tr");
    const obf = document.createElement("td");
    const int = document.createElement("td");
    const named = document.createElement("td");
    row.classList.add("ClassRow");
    obf.innerHTML = classData.obf;
    int.innerHTML = className;
    named.innerHTML = classData.named;
    row.appendChild(obf);
    row.appendChild(int);
    row.appendChild(named);
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
    const {methods, fields} = yarn.get(className);
    //methods
    for (const [methodName, methodData] of methods) {
        for (const methodOverflowData of methodData) {
            const row = document.createElement("tr");
            const obf = document.createElement("td");
            const desc = document.createElement("td");
            const int = document.createElement("td");
            const named = document.createElement("td");
            row.classList.add("MethodRow");
            obf.innerHTML = methodOverflowData?.obf ? methodOverflowData?.obf : methodName;
            desc.innerHTML = methodOverflowData?.desc;
            desc.classList.add("MethodDescriptor");
            int.innerHTML = methodName;
            named.innerHTML = methodOverflowData?.named;
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
        const desc = document.createElement("td");
        const int = document.createElement("td");
        const named = document.createElement("td");
        obf.innerHTML = fieldData?.obf;
        desc.innerHTML = fieldData?.desc;
        int.innerHTML = fieldName;
        named.innerHTML = fieldData?.named;
        row.appendChild(obf);
        row.appendChild(desc);
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
    const params = yarn.get(className)?.methods.get(methodName)?.[0].params;
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
    loadMapping(e.target.value);
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
