import express = require("express");
import { Server } from "http";
import { addYoutubeCatcher } from "./youtube";

/**
 * class that collects all catchers for all services and holds the http server
 *
 * @export
 * @class Catcher
 */
export class Catcher {

    server: Server;

    /**
     * Creates an instance of Catcher and loads all gets all catchers to start the server
     * 
     * @param {number} port
     * @memberof Catcher
     */
    constructor(port: number) {
        var app = express();
        addYoutubeCatcher(app); // youtube catcher
        this.server = app.listen(port, () => {
            console.log(`catcher listening to port ${port}`);
        });
    }

    /**
     * closes the http server
     *
     * @memberof Catcher
     */
    close() {
        this.server.close();
    }
}