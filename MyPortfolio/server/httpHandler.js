import express from "express";
import cors from "cors";
import path from "path";

export default function httpInit(__serverDirPath) {
const app = express();
const defaultAllowedOrigin = process.env.SERVER_DEFAULT_ALLOWED_ORIGIN;

app.use(cors({
    origin: defaultAllowedOrigin
}))
app.use(express.json());

app.get("/api/retrieve-cassette-content-data", (req, res) => {
    if(req.query.cassetteIndex)
    { 
        if(req.query.dataType === "MapData")
        {
            const dirToCassetteContentData = path.join(__serverDirPath, "CassetteContentData");

            switch(req.query.cassetteIndex)
            {
                case "0":
                    res.sendFile(path.join(dirToCassetteContentData, "IntroCassette", "MapData", "IntroMapV2.json"), (err) => {
                         if (err) {
                            res.status(404).json({
                            statusCode: 404,
                            message: "File not found.",
                            });
                        }
                    }
                    );
                    return;

                default:
                    res.status(404).json({
                        statusCode: 404,
                        message: "invalid cassette index."
                    });
                    return;
            }
        }
        else
        {
            res.status(400).json({statusCode: 400, message: "dataType is required."});
        }
    }

    res.status(400).send(JSON.stringify({
        statusCode: 400,
        message: "cassetteIndex param is required to retrieve cassette content data."
    }))
  
})

app.get("/images/*imagepath", (req, res) => {
    const pathParam = req.params?.imagepath;
    if(pathParam)
    {
        res.sendFile(path.join(__serverDirPath, ...pathParam), (err) => {
            if(err)
            {
                res.status(404).json({
                    statusCode: 404,
                    message: `Image not found. ${err.message}`,
                });
            }
        })
    }
})

return app;
}