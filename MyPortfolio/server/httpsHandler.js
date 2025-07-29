import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import AddCharacterData from "./Utilities/addCharacterData.js";
import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with {type: "json"};

export default function httpsInit(__serverDirPath, gameStatesTickers) {
  const app = express();
  const defaultAllowedOrigin = process.env.SERVER_DEFAULT_ALLOWED_ORIGIN;

  //middlewares
  app.use(
    cors({
      origin: defaultAllowedOrigin,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookiesParser);

  app.post("/api/load-cassette", async (req, res) => {
    if(!req.body?.clientContentCanvasWidth || !req.body?.clientContentCanvasHeight)
    {
      sendResponse(res, statusCode.invalidRequest, "missing clientContentCanvasWidth/clientContentCanvasHeight.");
      return;
    }

    if (req.body?.cassetteIndex >= 0) {
        try {
          let uuidCookieHeaderName;
          let cassetteTicker;

          switch(req.body.cassetteIndex)
          {
            case 0:
              uuidCookieHeaderName = "introcassette-uuid";
              cassetteTicker = gameStatesTickers.introCassetteTicker;
              break;

            case 1:
              uuidCookieHeaderName = "defensemarchcassette-uuid";
              cassetteTicker = gameStatesTickers.defenseMarchCassetteTicker;
              break;
          }

          if(!uuidCookieHeaderName || !cassetteTicker)
          {
            throw new Error("{statusCode: 400, message: 'invalid cassette index.'}");
          }

          let clientGameStates = new GameStatesManager(req.body.cassetteIndex, req.headers.cookie[uuidCookieHeaderName], req.body.clientContentCanvasWidth, req.body.clientContentCanvasHeight);
          await clientGameStates.init();

          //post message to the ticker to insert the client manager to the thread
          cassetteTicker.postMessage({
            type: SocketMessageTypes.serializedClientManager,
            value: clientGameStates.toJSON()
          });

          sendHttpOnlyCookie(res, uuidCookieHeaderName, clientGameStates.userId, (365 * 24 * 60 * 60 * 1000)); //1 year
          sendResponse(res, statusCode.success, "successfully loaded cassette.", clientGameStates.toJSON());
          return;
        }
        catch (err) {
          console.log("stack trace: ", err.stack);
          console.log("error occured when loading cassette: ", err);
          const parsedError = JSON.parse(err.message);

          sendResponse(res, parsedError.statusCode, parsedError.message);
          return;
        }
      }
    else {
        sendResponse(res, statusCode.invalidRequest, "missing cassetteIndex.");
        return;
    }
});

  app.get("/images/*imagepath", (req, res) => {
    const pathParam = req.params?.imagepath;
    if (pathParam) {
      sendFile(
        res,
        path.join(__serverDirPath, ...pathParam),
        "Image not found."
      );
    }
  });

  app.get("/sfx/*sfxpath", (req, res) => {
    const pathParam = req.params?.sfxpath;
    const totalVariations = req.query?.totalVariations;
    if(pathParam && totalVariations)
    {
      try
      {
        const SFXFolderPath = path.join(__serverDirPath, ...pathParam);
      
        const data = {
          sfxBase64s: []
        }
      
        for(let i = 0; i < totalVariations; i++)
        {
          const filename = i.toString() + ".wav";
          const SFXFilePath = path.join(SFXFolderPath, filename);
          const sfxBase64 = fs.readFileSync(SFXFilePath).toString("base64");

          data.sfxBase64s.push(sfxBase64);
        }

        sendResponse(res, statusCode.success, "successfully retrieved audio contents.", data);
      }
      catch (err)
      {
        sendResponse(res, statusCode.invalidRequest, "invalid path.");
      }
    }
    else {
      sendResponse(res, statusCode.invalidRequest, "missing totalVariations param.");
    }
  })

  app.get("/inject-api-key", (req, res) => {
    const apiKey = process.env.SERVER_API_KEY;

    if (apiKey) {
      sendHttpOnlyCookie(res, "api-key", apiKey, (7 * 24 * 60 * 60 * 1000)); //1 week
      sendResponse(res, statusCode.success, "Success.");
      return;
    }

    sendResponse(res, statusCode.forbiddenAccess, "Forbidden access.");
  });

  app.get("/add-character-data-form", (req, res) => {
    const cookies = req.headers.cookie;

    if (cookies) {
      console.log("api key sent: ", cookies["api-key"]);

      if (cookies["api-key"] === process.env.SERVER_API_KEY) {
        sendFile(
          res,
          path.join(__serverDirPath, "AddCharacter.html"),
          "File not found."
        );
        return;
      }
    }

    sendResponse(res, statusCode.unauthorizedAccess, "Unauthorized access.");
  });

  app.post("/add-character-data", (req, res) => {
    console.log("req body: ", req.body);

    const selectable = req.body?.selectable ? true : false;
    const characterStats = {
      health: parseFloat(req.body?.health),
      defense: parseFloat(req.body?.defense),
      attack: parseFloat(req.body?.attack),
      movespeed: parseFloat(req.body?.movespeed),
      attackspeed: parseFloat(req.body?.attackspeed),
      healing: parseFloat(req.body?.healing),
    }

    if (
      AddCharacterData(
        req.body?.characterName,
        req.body?.characterTargetType,
        req.body?.animationName,
        req.body?.sourceAnimationPath,
        req.body?.destinationDataPath,
        selectable,
        characterStats,
        parseInt(req.body?.maxLevel)
      )
    ) {
      sendResponse(res, statusCode.success, "Added successfully.");
      return;
    }

    sendResponse(res, statusCode.invalidRequest, "Missing data.");
  });

  return app;
}

function sendResponse(resObject, statusCode, message, data = null) {
  resObject.status(statusCode).json({
    statusCode: statusCode,
    message: message,
    data: data,
  });
}

function sendFile(resObject, dir, errMessage) {
  resObject.sendFile(dir, (err) => {
    if (err) {
      resObject.status(statusCode.notFound).json({
        statusCode: statusCode.notFound,
        message: errMessage,
        err: err,
      });
    }
  });
}

function cookiesParser(req, res, next) {
  const cookies = req.headers.cookie || "";
  req.headers.cookie = cookies.split(";").reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    cookies[name] = rest.join("=");
    return cookies;
  }, {});

  next();
}

function sendHttpOnlyCookie(res, cookieName, cookieData, cookieMaxAge)
{
  res.cookie(cookieName, cookieData, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: cookieMaxAge,
              });
}

const statusCode = {
  success: 200,
  invalidRequest: 400,
  unauthorizedAccess: 401,
  forbiddenAccess: 403,
  notFound: 404,
  serverError: 500,
};
