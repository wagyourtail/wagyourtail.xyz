const express = require('express');
const fs = require('fs');
const app = express();

const pages = {
    "Welcome": {
        "About Me" : "Whoami",
        "Contact" : "Contact details"
    },
    "Projects": {
        "Quality Bot" : "Discord bot for server management and automation written in JavaScript.",
        "Js Macros": "Minecraft Macros Mod.",
        "Minecraft Mappings Viewer": "Viewer for the various mappings for Minecraft."
    }
};

app.set('view engine', 'pug');

app.use('/static', express.static('static'));
app.use('/sw.js', express.static('sw.js'));


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
    if (req.page == null || req.section == null || !pages[req.section] || !pages[req.section][req.page]) return res.redirect("/Welcome/About Me");
    res.render(`pages/${req.page}`, {pagename:req.page, section:req.section, pages:pages});
});

app.get("/:section/:page/App", async (req, res) => {
    res.render(`Projects/${req.page}`, (err, html) => {
        if (err) return res.redirect("/Welcome/About Me");
        res.send(html);
    });
});

app.get('*', function(req, res) {
    res.redirect("/Welcome/About Me");
});

app.listen(8000, function (err) {
    if (err) return console.log(err);
    console.log('Listening at http://localhost:8000/');
});
