import express from "express";
import cors from "cors";
import path from "path";

import AddAnimDataApiVer from "./Utilities/AddAnimationDataApiVer.js"

export default function httpsInit(__serverDirPath) {
  const app = express();
  const defaultAllowedOrigin = process.env.SERVER_DEFAULT_ALLOWED_ORIGIN;

  //middlewares
  app.use(
    cors({
      origin: defaultAllowedOrigin,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));

  app.get("/api/retrieve-cassette-content-data", (req, res) => {
    if (req.query.cassetteIndex) {
      const cert = req.socket.getPeerCertificate();

      if (cert && Object.keys(cert).length > 0) {
        console.log("client cert serial number: ", cert.serialNumber);
      }

      if (req.query.dataType === "MapData") {
        const dirToCassetteContentData = path.join(
          __serverDirPath,
          "CassetteContentData"
        );

        switch (req.query.cassetteIndex) {
          case "0":
            sendFile(res, path.join(dirToCassetteContentData, "IntroCassette", "MapData", "IntroMapV2.json"), "File not found.");
            return;

          default:
            sendResponse(res, 404, "invalid cassette index.");
            return;
        }
      } else {
            sendResponse(res, 400, "dataType is required.");
      }
    }

    sendResponse(res, 400, "cassetteIndex param is required to retrieve cassette content data.");
  });

  app.get("/images/*imagepath", (req, res) => {
    const pathParam = req.params?.imagepath;
    if (pathParam) {
      sendFile(res, path.join(__serverDirPath, ...pathParam), "Image not found.");
    }
  });

  app.get("/inject-api-key", (req, res) => {
    const apiKey = process.env.SERVER_API_KEY;

    if (apiKey) {
      res.cookie("api-key", apiKey, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, //1 week
      });
      sendResponse(res, 200, "Success.");
      return;
    }

    sendResponse(res, 403, "Forbidden access.");
  });

  app.get("/add-anim-form", (req, res) => {
    const cookies = req.headers.cookie || "";

    const parsedCookies = cookies.split(";").reduce((cookies, cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        cookies[name] = rest.join("=");
        return cookies;
    }, {})

    console.log("api key sent: ", parsedCookies["api-key"]);

    if(parsedCookies["api-key"] === process.env.SERVER_API_KEY)
    {
        sendFile(res, path.join(__serverDirPath, "AddAnim.html"), "File not found.");
        return;
    }
    
    sendResponse(res, 401, "Unauthorized access.");
  });

  app.post("/add-anim", (req, res) => {

    console.log("req body: ", req.body);
 
    if(AddAnimDataApiVer(
        req.body?.characterName, 
        req.body?.characterTargetType,
        req.body?.animationName,
        req.body?.animationFacingDirection,
        req.body?.sourceAnimationPath,
        req.body?.destinationDataPath
    ))
    {
        sendResponse(res, 200, "Added successfully.");
        return;
    }
    
    sendResponse(res, 400, "Missing data.");
  })

  return app;
}

function sendResponse(resObject, statusCode, message) {
  resObject.status(statusCode).json({
      statusCode: statusCode,
      message: message,
  })
}

function sendFile(resObject, dir, errMessage) {
  resObject.sendFile(dir, (err) => {
    if (err) {
      resObject.status(404).json({
        statusCode: 404,
        message: errMessage,
        err: err
      });
    }
  });
}
