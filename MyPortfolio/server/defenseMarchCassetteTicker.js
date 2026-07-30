import { parentPort } from "worker_threads";
import crypto from "node:crypto";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import FacingDirections from "../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import DefenseMarchSignalTypes from "../shared/Standards/StringKeys/DefenseMarchSignalTypes.json" with { type: "json" };

import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import { PawnActorIsOnTrigger } from "../shared/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../shared/TickProcesses/processTick_General.js";

import packageSocketMessageForSingleUser from "../shared/SignalsManagers/packageSocketMessage.js";
import DefenseMarchCassetteSignalsManager from "../shared/SignalsManagers/DefenseMarchCassetteSignalsManager.js";

let clientIds = [];

/** @type {Object<string, DefenseMarchClientSimulator>} */
let clients = {};

const FIXED_DELTA_TIME_PER_TICK = 1000 / 60; //60 FPS
class DefenseMarchClientSimulator {
  /** @type {GameStatesManager} */
  gameStatesManager;
  prevTime;

  constructor(gameStatesManager) {
    this.gameStatesManager = gameStatesManager;
    this.prevTime = performance.now();
  }

  simulateGame() {
    const now = performance.now();
    const timeDiff = now - this.prevTime;

    //max-step: 5
    const step = Math.max(Math.trunc(timeDiff / FIXED_DELTA_TIME_PER_TICK), 5);
    const totalDelta = FIXED_DELTA_TIME_PER_TICK * step;
    const remainder = timeDiff - totalDelta;
    this.prevTime = now + remainder;

    //simulate ticks
    processTick_General(this.gameStatesManager, totalDelta);
  }
}

function init() {
  parentPort.on("message", (message) => {
    let gameStatesManager;
    let clientSimulator;
    let signalsManager;

    switch (message.type) {
      case SocketMessageTypes.serializedClientManager:
        if (!message.value) return;
        console.log("adding new client to defenseMarchCassetteTicker...");

        gameStatesManager = GameStatesManager.constructFromSerializedJSON(
          message.value,
        );
        clients[message.value.userId] = new DefenseMarchClientSimulator(
          gameStatesManager,
        );
        clientIds.push(message.value.userId);
        break;

      //userInput format {type: xxx, value: {userId: xxx, input: xxx}}
      case SocketMessageTypes.userInput:
        if (!message.value?.userId || !message.value?.message) return;

        clientSimulator = clients[message.value.userId];

        /** @type {GameStatesManager} */
        gameStatesManager = clientSimulator?.gameStatesManager;
        if (!clientSimulator || !gameStatesManager) {
          const responseMessage = {
            response: "Something is wrong with the server.",
            signal: signal,
            requestId: requestId,
            success: false,
          };
          console.log(responseMessage);

          const packagedSocketMessage = packageSocketMessageForSingleUser(
            message.cassetteIndex,
            SocketMessageTypes.userSignalResponse,
            message.value.userId,
            responseMessage,
          );

          parentPort.postMessage(packagedSocketMessage);
          return;
        }

        /** @type {DefenseMarchCassetteSignalsManager} */
        signalsManager = clientSimulator.gameStatesManager.signalsManager;

        if (!signalsManager) {
          const responseMessage = {
            response: "Signals manager is not working.",
            signal: signal,
            success: false,
          };

          console.log(responseMessage);

          const packagedSocketMessage = packageSocketMessageForSingleUser(
            message.cassetteIndex,
            SocketMessageTypes.userSignalResponse,
            message.value.userId,
            responseMessage,
          );

          parentPort.postMessage(packagedSocketMessage);
          return;
        }

        const signal = message.value.message.signal;
        if (signal === "a") {
          //clientManager.playerActor.toWalkState(FacingDirections.left);
        } else if (signal === "d") {
          //clientManager.playerActor.toWalkState(FacingDirections.right);
        } else if (signal === "w") {
          //clientManager.playerActor.toWalkState(FacingDirections.up);
        } else if (signal === "s") {
          //clientManager.playerActor.toWalkState(FacingDirections.down);
        } else if (signal === DefenseMarchSignalTypes.summonOnWP) {
          const requestId = message.value.message.requestId;
          const actorName = message.value.message.actorName;
          const walkPathIndex = message.value.message.walkPathIndex;

          let responseMessage;

          if (
            !requestId ||
            !actorName ||
            isNaN(walkPathIndex) ||
            walkPathIndex >
              clientSimulator.gameStatesManager.allySummonLocations.length
          ) {
            responseMessage = {
              response:
                "Server: Invalid requestId or actorName or walkPathIndex",
              requestId: requestId,
              signal: signal,
              success: false,
            };
            console.log(responseMessage);
          } else {
            //pawnActor position format: {dx: xxx, dy: xxx}
            const actorId = crypto.randomUUID();

            const result = signalsManager.spawnPawnActorAtLocation(
              actorId,
              actorName,
              {
                dx: gameStatesManager.allySummonLocations[walkPathIndex].x,
                dy: gameStatesManager.allySummonLocations[walkPathIndex].y,
              },
            );

            if (result.success) {
              responseMessage = {
                response: `Server: ${result.message}`,
                requestId: requestId,
                entityId: actorId,
                signal: signal,
                success: true,
              };
            } else {
              responseMessage = {
                response: `Server: ${result.message}`,
                requestId: requestId,
                signal: signal,
                success: false,
              };
            }
          }

          const packagedSocketMessage = packageSocketMessageForSingleUser(
            clientSimulator.gameStatesManager.cassetteIndex,
            SocketMessageTypes.userSignalResponse,
            clientSimulator.gameStatesManager.userId,
            responseMessage,
          );
          parentPort.postMessage(packagedSocketMessage);
        } else if (signal === DefenseMarchSignalTypes.upgradeCharacter) {
          const actorName = message.value.message.actorName;
          let responseMessage;

          if (!actorName) {
            responseMessage = {
              response:
                "Server: Invalid actor name. Unable to upgrade character.",
              signal: signal,
              success: false,
            };
          } else {
            const result = signalsManager.upgradePawnActor(actorName);

            if (!result.success) {
              responseMessage = {
                response: `Server: ${result.message}`,
                signal: signal,
                success: false,
              };
            } else {
              responseMessage = {
                response: `Server: ${result.message}`,
                signal: signal,
                success: true,
              };
            }
          }

          const packagedSocketMessage = packageSocketMessageForSingleUser(
            clientSimulator.gameStatesManager.cassetteIndex,
            SocketMessageTypes.userSignalResponse,
            clientSimulator.gameStatesManager.userId,
            responseMessage,
          );

          parentPort.postMessage(packagedSocketMessage);
        }
        break;

      case SocketMessageTypes.removeClientManager:
        console.log(`removing client with userId of ${message.value.userId}`);
        const index = clientIds.findIndex(
          (clientId) => clientId === message.value,
        );
        clientIds.splice(index, 1);
        delete clients[message.value];
    }
  });

  function tick() {
    updateClients();
    setTimeout(tick, FIXED_DELTA_TIME_PER_TICK);
  }

  tick();
}

function updateClients() {
  let payloads = {};

  if (clientIds.length > 0) {
    clientIds.forEach((clientId) => {
      const currentClient = clients[clientId];

      if (currentClient) {
        currentClient.simulateGame();
        // payloads[clientId] =
        //   currentClient.gameStatesManager.toJSON("client_payload");
      }
    });

    //TO-DO: don't have to send payload every single frame for a single player game
    //only send for things that actually matters, like saving the game and etc...
    //we can temporarily use it to test the latency
    //broadcast payloads to all clients
    // parentPort.postMessage({
    //   type: SocketMessageTypes.clientsPayload,
    //   value: payloads,
    // });
  }
}

init();
