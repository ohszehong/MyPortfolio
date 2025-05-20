import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import httpInit from "./httpHandler.js";
import wsInit from "./wsHandler.js";

const __serverFilePath = fileURLToPath(import.meta.url);
const __serverDirPath = path.dirname(__serverFilePath);

const envFile = process.env.NODE_ENV === "production" ? "../.env.production" : "../.env.development";
dotenv.config({path: envFile});

const port = process.env.SERVER_PORT;

const app = httpInit(__serverDirPath);
const httpServer = http.createServer(app);
wsInit(httpServer);

httpServer.listen(port, () => {
    console.log(`app is listening on port ${port}`);
})