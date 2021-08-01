import express from 'express';
import { readdirSync } from 'fs';
import { PageListener } from "./sitepage";


class Website {
    readonly app = express();
    readonly sections: Map<string, Map<string, PageListener>> = new Map();
    constructor() {
        this.app.set('view engine', 'pug')

        this.app.use('/static', express.static('views/static'));
        this.app.use('/sw.js', express.static('sw.js'));

        this.app.param('section', (req, res, next, section) => {
            req.params.section = section;
            next();
        });

        this.app.param('page', (req, res, next, page) => {
            req.params.page = page;
            next();
        });

        for (const section of readdirSync("./views/sections/")) {
            const pages = readdirSync(`./views/sections/${section}/`);
            const listeners: Map<string, PageListener> = new Map();
            for (const page of pages) {
                const listener: PageListener = require(`./views/sections/${section}/${page}/${page}.js`).page;
                listeners.set(page, listener);
                listener.registerExtraListeners(this.app);
            }
            this.sections.set(section, listeners);
        }

        this.app.get('/', async (req, res) => {
            res.redirect("/Welcome/AboutMe");
        });

        this.app.get('/:section/:page', async (req, res) => {
            if (!this.sections.has(req.params.section) || !this.sections.get(req.params.section)?.has(req.params.page)) res.redirect("/Welcome/AboutMe");
            res.render(`sections/${req.params.section}/${req.params.page}/view`, {site: this, page: this.sections.get(req.params.section)?.get(req.params.page)});
        })

        this.app.get('*', function(req, res) {
            res.redirect("/Welcome/AboutMe");
        });
    }
}

const site = new Website();

site.app.listen(8000, () => {
    console.log('Listening at http://localhost:8000/');
});