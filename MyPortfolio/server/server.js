import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import fs from "fs";
import httpsInit from "./httpsHandler.js";
import wsInit from "./wsHandler.js";

const __serverFilePath = fileURLToPath(import.meta.url);
const __serverDirPath = path.dirname(__serverFilePath);

const envFile = process.env.NODE_ENV === "production" ? "../.env.production" : "../.env.development";
dotenv.config({path: envFile});

const port = process.env.SERVER_PORT;

const app = httpsInit(__serverDirPath);
const httpsServer = https.createServer({
    key: fs.readFileSync(process.env.SERVER_KEY_PATH),
    cert: fs.readFileSync(process.env.SERVER_CERT_PATH),
    ca: fs.readFileSync(process.env.SERVER_CA_CERT_PATH),
    requestCert: false,
    rejectUnauthorized: false
}, app);
wsInit(httpsServer);

httpsServer.listen(port, () => {
    console.log(`app is listening on port ${port}`);
})