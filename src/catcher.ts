import express = require("express");
import { Server } from "http";
import { addYoutubeCatcher } from "./youtube";

export class Catcher {

    server: Server;

    constructor(port: number) {
        var app = express();
        addYoutubeCatcher(app);
        this.server = app.listen(port, () => {
            console.log(`catcher listening to port ${port}`);
        });
    }

    close() {
        this.server.close();
    }
}