import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import fs from "fs";
import httpsInit from "./httpsHandler.js";
import wsInit from "./wsHandler.js";
import { Worker } from "worker_threads";

const __serverFilePath = fileURLToPath(import.meta.url);
const __serverDirPath = path.dirname(__serverFilePath);

const envFile =
  process.env.NODE_ENV === "production"
    ? "../.env.production"
    : "../.env.development";
dotenv.config({ path: envFile });

const port = process.env.SERVER_PORT;

// Initialize a worker threads for handling ticks
const introCassetteTicker = new Worker("./introCassetteTicker.js", {
  type: "module",
});

const defenseMarchCassetteTicker = new Worker(
  "./defenseMarchCassetteTicker.js",
  {
    type: "module",
  },
);

let gameStatesTickers = {
  introCassetteTicker: introCassetteTicker,
  defenseMarchCassetteTicker: defenseMarchCassetteTicker,
};

let introCassetteWebSockets = {};
let defenseMarchCassetteWebSockets = {};

let clientWebSockets = [
  introCassetteWebSockets,
  defenseMarchCassetteWebSockets,
];

const app = httpsInit(__serverDirPath, gameStatesTickers);
const httpsServer = https.createServer(
  {
    key: fs.readFileSync(process.env.SERVER_KEY_PATH),
    cert: fs.readFileSync(process.env.SERVER_CERT_PATH),
    //ca: fs.readFileSync(process.env.SERVER_CA_CERT_PATH),
    requestCert: false,
    rejectUnauthorized: false,
  },
  app,
);
wsInit(httpsServer, gameStatesTickers, clientWebSockets);

httpsServer.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});
