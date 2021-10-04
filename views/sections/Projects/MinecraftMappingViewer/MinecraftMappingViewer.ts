import { PageListener } from "../../../../sitepage";
import { Express } from "express";

if (!globalThis.fetch) {
    globalThis.fetch = require("node-fetch");
}

class MappingViewerListener extends PageListener {
    registerExtraListeners(app: Express) {
        app.get("/Projects/MinecraftMappingViewer/App", (req, res) => {
            res.render("sections/Projects/MinecraftMappingViewer/App");
        })
        app.get("/Projects/CORS-Bypass/App/*", async (req, res) => {
            console.log(req.url);
            const requrl = req.url.split("App/")[1];
            try {
                const response = await fetch(requrl, { headers: {"User-Agent": "Wagyourtail/CorsProxy"}});
                if (response == null || response.body == null || response.status != 200) {
                    res.status(response.status).send(response.statusText);
                    return;
                }
                response.headers.forEach((val, key) => {
                    if (["set-cookie", "content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) return;
                    res.setHeader(key, val);
                });
                const host = req.header("Host");
                if (host) {
                    res.setHeader("Host", host);
                }
                // @ts-ignore
                res.send(Buffer.from(await (await response.blob()).arrayBuffer()));
                return;
            } catch (e) {
                res.status(500).send(e);
            }
        })
    }
}

export const page = new MappingViewerListener("Minecraft Mappings Viewer", "Minecraft Macros Mod.");