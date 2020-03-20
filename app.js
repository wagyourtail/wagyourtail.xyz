const express = require('express');
const app = express();

const pages = {
    "Welcome": {
        "About Me" : "Whoami",
        "Contact" : "Contact details"
    },
    "Projects": {
        "Quality Bot" : "Discord bot for server management and automation written in JavaScript."
    }
}

app.set('view engine', 'pug');

app.use('/static', express.static('static'));

app.param('section', (req, res, next, section) => {
    req.section = section;
    next();
});

app.param('page', (req, res, next, page) => {
    req.page = page;
    next();
});

app.param('var1', (req, res, next, var1) => {
    req.var1 = var1;
    next();
});

app.get('/', async (req, res) => {
    res.redirect("/Welcome/About Me");
});

app.get("/:section/:page", async (req, res) => {
    if (req.page == null || req.section == null || !pages[req.section] || !pages[req.section][req.page]) res.redirect("/Welcome/About Me");
    res.render(`pages/${req.page}`, {pagename:req.page, section:req.section, pages:pages});
});

app.get("/:section/:page/App", async (req, res) => {
    res.render(`Projects/${req.page}`);
});

app.get("/Projects/Yarn Mappings Viewer/App/api", async (req, res) => {
    if (req.query.type == "list") {

    } else if (req.query.type == "get" && req.query.version) {

    }
});

app.get('*', function(req, res) {
    res.redirect("/Welcome/About Me");
});

app.listen(8000, function (err) {
    if (err) return console.log(err);
    console.log('Listening at http://localhost:8000/');
});
