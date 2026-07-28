import { WebSocketServer } from "ws";
import url from "url";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import { Worker } from "worker_threads";

import packageSocketMessageForSingleUser from "../shared/SignalsManagers/packageSocketMessage.js";

export default function wsInit(
  httpsServer,
  gameStatesTickers,
  clientWebSockets,
) {
  const wss = new WebSocketServer({ server: httpsServer });

  /** @type {Worker} */
  const introCassetteTicker = gameStatesTickers.introCassetteTicker;

  /** @type {Worker} */
  const defenseMarchCassetteTicker =
    gameStatesTickers.defenseMarchCassetteTicker;

  const handleMessageFromTicker = (message) => {
    let selectedClientWebSockets;

    if (
      isNaN(message.cassetteIndex) ||
      message.cassetteIndex >= clientWebSockets.length
    ) {
      console.log("Invalid cassette index: ", message.cassetteIndex);
      return;
    }

    selectedClientWebSockets = clientWebSockets[message.cassetteIndex];
    if (!selectedClientWebSockets) {
      console.log(
        `cassette index of ${message.cassetteIndex} does not contain any client web sockets.`,
      );
      return;
    }

    if (message.type === SocketMessageTypes.clientsPayload) {
      Object.keys(message.value).forEach((clientId) => {
        /** @type {WebSocket} */
        const ws = selectedClientWebSockets[clientId]?.ws;

        if (ws) {
          const packagedSocketMessage = packageSocketMessageForSingleUser(
            message.cassetteIndex,
            SocketMessageTypes.clientPayload,
            clientId,
            message.value[clientId],
          );
          ws.send(JSON.stringify(packagedSocketMessage));
        }
      });
      return;
    }

    const ws = selectedClientWebSockets[message.value?.userId].ws;
    if (ws) {
      if (message.type === SocketMessageTypes.userSignalResponse) {
        ws.send(JSON.stringify(message));
      }
    }
  };

  //broadcast payloads received from ticker to all client...
  introCassetteTicker.on("message", (message) =>
    handleMessageFromTicker(message),
  );
  defenseMarchCassetteTicker.on("message", (message) =>
    handleMessageFromTicker(message),
  );

  wss.on("connection", (ws, req) => {
    const parsedURL = url.parse(req.url, true);
    console.log("WebSocket connection opened.");

    if (!parsedURL.query.userId) {
      ws.close(4001, "missing userId parameter.");
      return;
    }

    if (parsedURL.pathname === "/cassetteSocket") {
      let selectedTicker;
      let selectedClientWebSockets;
      let cassetteIndex;
      if (ws.protocol === "cassette-0") {
        selectedTicker = introCassetteTicker;
        cassetteIndex = 0;
      } else if (ws.protocol === "cassette-1") {
        selectedTicker = defenseMarchCassetteTicker;
        cassetteIndex = 1;
      }

      selectedClientWebSockets = clientWebSockets[cassetteIndex];

      if (!selectedTicker || !selectedClientWebSockets) {
        ws.close(4002, "invalid web socket protocol.");
        return;
      }

      selectedClientWebSockets[parsedURL.query.userId] = {
        ws: ws,
      };

      //the message is of Buffer type
      ws.on("message", (message) => {
        const parsedMessage = JSON.parse(message.toString());
        if (!parsedMessage?.value?.userId) return;

        if (parsedMessage.type === SocketMessageTypes.userInput) {
          selectedTicker.postMessage(parsedMessage);
        } else if (parsedMessage.type === SocketMessageTypes.log) {
          console.log(
            "log from client with userId of ",
            parsedMessage.value.userId,
            " message: ",
            parsedMessage.value,
          );
        }
      });

      ws.on("close", () => {
        console.log(
          "WebSocket connection closed. request url: /cassetteSocket",
        );

        delete selectedClientWebSockets[parsedURL.query.userId];
        const packagedSocketMessage = packageSocketMessageForSingleUser(
          cassetteIndex,
          SocketMessageTypes.removeClientManager,
          parsedURL.query.userId,
          `Connection closed. Remove client with Id of ${parsedURL.query.userId}`,
        );
        selectedTicker.postMessage(packagedSocketMessage);
      });
      ws.on("error", (err) => {
        console.log(
          "WebSocket error: ",
          err.message,
          "\n",
          "cause: ",
          err.cause,
          " request url: /cassetteSocket",
        );

        delete selectedClientWebSockets[parsedURL.query.userId];
        const packagedSocketMessage = packageSocketMessageForSingleUser(
          cassetteIndex,
          SocketMessageTypes.removeClientManager,
          parsedURL.query.userId,
          `Error occured. Remove client with Id of ${parsedURL.query.userId}`,
        );
        selectedTicker.postMessage(packagedSocketMessage);
      });
    } else {
      ws.on("close", () =>
        console.log("WebSocket connection closed with invalid request url."),
      );
      ws.on("error", (err) =>
        console.log(
          "WebSocket error: ",
          err.message,
          "\n",
          "cause: ",
          err.cause,
        ),
      );
    }
  });
}
