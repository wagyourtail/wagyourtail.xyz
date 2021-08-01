import { Express } from "express";

export class PageListener {
    readonly pageTitle: string;
    readonly pageDescription: string;

    constructor(title: string, description: string) {
        this.pageTitle = title;
        this.pageDescription = description;
    }

    registerExtraListeners(app: Express) {}
}