import { WebSocketServer } from "ws";
import url from "url";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with {type: "json"};
import { Worker } from "worker_threads";

export default function wsInit(httpsServer, gameStatesTickers, clientWebSockets) {
    const wss = new WebSocketServer({server: httpsServer});

    /** @type {Worker} */
    const introCassetteTicker = gameStatesTickers.introCassetteTicker;

    //broadcast payloads received from ticker to all client...
    introCassetteTicker.on("message", (message) => {
        if(message.type === SocketMessageTypes.clientsPayload)
        {
            Object.keys(message.value).forEach((clientId) => {
                //console.log("clientId: ", clientId);
                //console.log("clientWebSockets: ", clientWebSockets.introCassetteWebSockets);
                /** @type {WebSocket} */
                const ws = clientWebSockets.introCassetteWebSockets[clientId]?.ws;
                
                if(ws)
                {
                    ws.send(JSON.stringify({
                        type: SocketMessageTypes.clientPayload,
                        value: message.value[clientId]
                    }));
                }
            })
        }
    })

    wss.on("connection", (ws, req) => {
        const parsedURL = url.parse(req.url, true);
        console.log("WebSocket connection opened.");

        if(parsedURL.pathname === "/cassetteSocket")
        {
             if(ws.protocol === "cassette-0")
            {
                
                if(!parsedURL.query.userId)
                {
                    ws.close(400, "missing userId parameter.");
                    return;
                }
                    
                //add client websocket to the socket dictionary
                clientWebSockets.introCassetteWebSockets[parsedURL.query.userId] = {
                    ws: ws
                }

                //console.log("userId: ", parsedURL.query.userId);
                //console.log("newly added client sockets: ", clientWebSockets.introCassetteWebSockets);

                ws.on("message", message => {
                    const parsedMessage = JSON.parse(message.toString());
 
                    if(!parsedMessage.userId) return;

                    if(parsedMessage.type === SocketMessageTypes.userInput)
                    {
                        introCassetteTicker.postMessage({
                            type: SocketMessageTypes.userInput,
                            value: {
                                userId: parsedMessage.userId,
                                inputName: parsedMessage.message
                            }
                        });
                    }
                    else if(parsedMessage.type === SocketMessageTypes.log)
                    {
                        console.log("log from client with userId of ", parsedMessage.userId, " message: ", parsedMessage.message);
                    }
                });
            
                ws.on("close", () => {
                    console.log("WebSocket connection closed. request url: /cassetteSocket");

                    delete clientWebSockets.introCassetteWebSockets[parsedURL.query.userId];
                    introCassetteTicker.postMessage({
                        type: SocketMessageTypes.removeClientManager,
                        value: parsedURL.query.userId
                    })
                });
                ws.on("error", (err) => {
                    console.log("WebSocket error: ", err.message, "\n", "cause: ", err.cause, " request url: /cassetteSocket");

                    delete clientWebSockets.introCassetteWebSockets[parsedURL.query.userId];
                    introCassetteTicker.postMessage({
                        type: SocketMessageTypes.removeClientManager,
                        value: parsedURL.query.userId
                    })
                });
            }
        }
        else
        {
            ws.on("close", () => console.log("WebSocket connection closed with invalid request url."));
            ws.on("error", err => console.log("WebSocket error: ", err.message, "\n", "cause: ", err.cause));
        }
    })
}