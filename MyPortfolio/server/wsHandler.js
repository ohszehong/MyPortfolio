import { WebSocketServer } from "ws";

export default function wsInit(httpServer) {
    const wss = new WebSocketServer({server: httpServer});

    wss.on("connection", (ws, req) => {
        console.log("WebSocket connection opened.");

        if(req.url === "/cassetteSocket")
        {
             if(ws.protocol === "cassette-0")
            {
                ws.on("message", message => {
                    console.log("message from client: ", message.toString());
                    ws.send(`message received. using protocol: ${ws.protocol}`);
                });
            
                ws.on("close", () => console.log("WebSocket connection closed. request url: /cassetteSocket"));
                ws.on("error", err => console.log("WebSocket error: ", err.message, "\n", "cause: ", err.cause, " request url: /cassetteSocket"));
            }
        }
        else
        {
            ws.on("close", () => console.log("WebSocket connection closed with invalid request url."));
            ws.on("error", err => console.log("WebSocket error: ", err.message, "\n", "cause: ", err.cause));
        }
    })
}