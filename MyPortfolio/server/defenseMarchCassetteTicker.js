import { parentPort } from "worker_threads";
import crypto from "node:crypto";

import SocketMessageTypes from "../shared/Standards/SocketMessageTypes.json" with { type: "json" };
import FacingDirections from "../shared/Standards/FacingDirections.json" with { type: "json" };
import DefenseMarchSignalTypes from "../shared/Standards/DefenseMarchSignalTypes.json" with { type: "json" };

import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import { PawnActorIsOnTrigger } from "../shared/TickProcesses/Utilities/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../shared/TickProcesses/Utilities/Generals/processTick_General.js";

import packageSocketMessageForSingleUser from "../shared/SignalsManagers/packageSocketMessage.js";
import DefenseMarchCassetteSignalsManager from "../shared/SignalsManagers/DefenseMarchCassetteSignalsManager.js";
import ProjectileActor from "../shared/Actors/ProjectileActor.js";
import VFXHitBoxActor from "../shared/Actors/VFXHitBoxActor.js";

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
    processTick_General(
      this.gameStatesManager,
      totalDelta,
      false,
      false,
      false,
      false,
    );
  }
}

function constructBasicResponseMessage(
  responseMessage,
  fromUserSignal,
  success,
) {
  return {
    response: responseMessage,
    signal: fromUserSignal,
    success: success,
  };
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

        const signal = message.value.message.signal;
        let responseMessage;

        /** @type {GameStatesManager} */
        gameStatesManager = clientSimulator?.gameStatesManager;
        if (!clientSimulator || !gameStatesManager) {
          responseMessage = constructBasicResponseMessage(
            "Something is wrong with the server.",
            signal,
            false,
          );
        }

        /** @type {DefenseMarchCassetteSignalsManager} */
        signalsManager = clientSimulator.gameStatesManager.signalsManager;

        if (!signalsManager && !responseMessage) {
          responseMessage = constructBasicResponseMessage(
            "Signals manager is not working",
            signal,
            false,
          );
        }

        //if there's response at this point meaning error occured
        if (responseMessage) {
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

        if (signal === "a") {
          //clientManager.playerActor.toWalkState(FacingDirections.left);
        } else if (signal === "d") {
          //clientManager.playerActor.toWalkState(FacingDirections.right);
        } else if (signal === "w") {
          //clientManager.playerActor.toWalkState(FacingDirections.up);
        } else if (signal === "s") {
          //clientManager.playerActor.toWalkState(FacingDirections.down);
        } else if (signal === DefenseMarchSignalTypes.spawnNewPawnOnWP) {
          const requestId = message.value.message.requestId;
          const actorName = message.value.message.actorName;
          const walkPathIndex = message.value.message.walkPathIndex;

          if (
            !requestId ||
            !actorName ||
            isNaN(walkPathIndex) ||
            walkPathIndex >
              clientSimulator.gameStatesManager.allySummonLocations.length
          ) {
            responseMessage = constructBasicResponseMessage(
              "Server: Invalid requestId or actorName or walkPathIndex",
              signal,
              false,
            );

            responseMessage.requestId = requestId;
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

            responseMessage = constructBasicResponseMessage(
              `Server: ${result.message}`,
              signal,
              result.success,
            );
            responseMessage.requestId = requestId;

            if (responseMessage.success) {
              responseMessage.entityId = actorId;
            }
          }
        } else if (signal === DefenseMarchSignalTypes.upgradePawn) {
          const actorName = message.value.message.actorName;

          if (!actorName) {
            responseMessage = constructBasicResponseMessage(
              "Server: Invalid actor name. Unable to upgrade character.",
              signal,
              false,
            );
          } else {
            const result = signalsManager.upgradePawnActor(actorName);

            responseMessage = constructBasicResponseMessage(
              `Server: ${result.message}`,
              signal,
              result.success,
            );
          }
        }

        const packagedSocketMessage = packageSocketMessageForSingleUser(
          clientSimulator.gameStatesManager.cassetteIndex,
          SocketMessageTypes.userSignalResponse,
          clientSimulator.gameStatesManager.userId,
          responseMessage,
        );

        parentPort.postMessage(packagedSocketMessage);
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
