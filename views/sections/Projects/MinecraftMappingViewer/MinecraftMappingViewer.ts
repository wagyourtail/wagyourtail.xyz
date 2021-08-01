import { PageListener } from "../../../../sitepage";
import { Express } from "express";

class MappingViewerListener extends PageListener {
    registerExtraListeners(app: Express) {
        app.get("/Projects/MinecraftMappingViewer/App", (req, res) => {
            res.render("sections/Projects/MinecraftMappingViewer/App");
        })
    }
}

export const page = new MappingViewerListener("Minecraft Mappings Viewer", "Minecraft Macros Mod.");