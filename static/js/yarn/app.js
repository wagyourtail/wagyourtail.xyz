const zip = new JSZip();
let contents = [];

let selectedClass = null;
let selectedMethod = null;

// list versions and put in version select
fetch("https://meta.fabricmc.net/v1/versions/game").then(async (res) => {
    const body = JSON.parse(await res.text());
    for (const match of body) {
        const option = document.createElement("option");
        option.innerHTML = match.version;
        option.value = match.version;
        versionSelect.appendChild(option);
    }
    const prev = localStorage.getItem("versionSelect.value");
    if (prev && Array.from(versionSelect.options).map(e=>e.value).includes(prev)) {
        versionSelect.value = prev;
    } else {
        localStorage.setItem("versionSelect.value", versionSelect.value);
    }
    loadVersion(versionSelect.value);
});

function loadVersion(v) {
    fetch(`https://meta.fabricmc.net/v1/versions/mappings/${v}`).then(async (res) => {
        const body = JSON.parse(await res.text());
        for (const match of body) {
            const option = document.createElement("option");
            option.innerHTML = match.version;
            option.value = match.version;
            mappingSelect.appendChild(option);
        }
        const prev = localStorage.getItem("mappingSelect.value");
        if (prev && Array.from(mappingSelect.options).map(e=>e.value).includes(prev)) {
            mappingSelect.value = prev;
        } else {
            localStorage.setItem("mappingSelect.value", mappingSelect.value);
        }
        loadMapping(mappingSelect.value);
    });
    mappingSelect.style.visibility = "visible";
}

function loadMapping(m) {
    fetch(`https://maven.fabricmc.net/net/fabricmc/yarn/${m}/yarn-${m}-v2.jar`).then(async(res) => {
        const z = await zip.loadAsync(await res.arrayBuffer());
        contents = (await z.file("mappings/mappings.tiny").async("string")).split("<").join("&lt;").split(">").join("&gt;").split("\nc").map(e => e.trim());
        contents.shift();
        contents = contents.sort();
        loading.style.visibility = "hidden";
        results.style.visibility = "visible";
        loadMatchingClasses("");
    });
}

function loadMatchingClasses(q) {
    selectedClass = null;
    selectedMethod = null;
    ClassTable.innerHTML = "";
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";
    if (q == "") {
        for (const c of contents) {
            const m = c.split(/\s+/);
            const row = document.createElement("tr");
            const obf = document.createElement("td");
            const named = document.createElement("td");
            row.classList.add("ClassRow");
            obf.innerHTML = m.shift();
            row.appendChild(obf);
            named.innerHTML = m.shift();
            row.appendChild(named);
            row.onclick = () => {
                if (selectedClass) selectedClass.classList.remove("selectedClass");
                row.classList.add("selectedClass");
                selectedClass = row;
                loadClass(c.split("\n"));
            };
            ClassTable.appendChild(row);
        }
    } else {
        for (const c of contents) {
            if (!c.includes(q)) continue;
            const m = c.split(/\s+/);
            const row = document.createElement("tr");
            const obf = document.createElement("td");
            const named = document.createElement("td");
            row.classList.add("ClassRow");
            obf.innerHTML = m.shift();
            row.appendChild(obf);
            named.innerHTML = m.shift();
            row.appendChild(named);
            row.onclick = () => {
                if (selectedClass) selectedClass.classList.remove("selectedClass");
                row.classList.add("selectedClass");
                selectedClass = row;
                loadClass(c.split("\n"));
            };
            ClassTable.appendChild(row);
        }
    }
}

function loadClass(c) {
    selectedMethod = null;
    MethodTable.innerHTML = "";
    ParamsTable.innerHTML = "";
    FieldTable.innerHTML = "";
    const methods = []
    const fields = []
    while (c.length) {
        switch(c[0].trim()[0]) {
            case "m":
                methods.push({m:c[0].trim(), p:[]});
                break;
            case "f":
                fields.push(c[0].trim());
                break;
            case "p":
                methods[methods.length-1].p.push(c[0].trim());
                break;
        }
        c.shift();
    }
    for (const m of methods) {
        methodData = m.m.split(/\s+/);
        methodData.shift();
        const row = document.createElement("tr");
        const desc = document.createElement("td");
        const obf = document.createElement("td");
        const named = document.createElement("td");
        row.classList.add("MethodRow");
        named.innerHTML = methodData.pop();
        obf.innerHTML = methodData.pop();
        desc.innerHTML = methodData.join(" ");
        row.appendChild(desc);
        row.appendChild(obf);
        row.appendChild(named);
        row.onclick = () => {
            if (selectedMethod) selectedMethod.classList.remove("selectedMethod");
            row.classList.add("selectedMethod");
            selectedMethod = row;
            loadParams(m.p);
        };
        MethodTable.appendChild(row);
    }
    for (const f of fields) {
        fieldData = f.split(/\s+/);
        fieldData.shift();
        const row = document.createElement("tr");
        const desc = document.createElement("td");
        const obf = document.createElement("td");
        const named = document.createElement("td");
        named.innerHTML = fieldData.pop();
        obf.innerHTML = fieldData.pop();
        desc.innerHTML = fieldData.join(" ");
        row.appendChild(desc);
        row.appendChild(obf);
        row.appendChild(named);
        FieldTable.appendChild(row);
    }
}

function loadParams(p) {
    ParamsTable.innerHTML = "";
    for (const param of p) {
        const pa = param.split(/\s+/);
        pa.shift();
        const row = document.createElement("tr");
        const num = document.createElement("td");
        const name = document.createElement("td");
        num.innerHTML = pa.shift();
        name.innerHTML = pa.join(" ");
        row.appendChild(num);
        row.appendChild(name);
        ParamsTable.appendChild(row);
    }
}

versionSelect.addEventListener("change", (e) => {
    mappingSelect.style.visibility = "hidden";
    loading.style.visibility = "visible";
    results.style.visibility = "hidden";
    mappingSelect.innerHTML = "";
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
        loadMatchingClasses(searchInput.value);
    }
});

searchButton.addEventListener("click", () => {
    loadMatchingClasses(searchInput.value);
});

window.addEventListener('resize', windowResize);

function windowResize() {
    results.style.maxHeight = `${window.innerHeight-120}px`
}

windowResize();
