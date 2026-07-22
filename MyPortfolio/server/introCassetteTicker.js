import { parentPort } from "worker_threads";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import FacingDirections from "../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import { PawnActorIsOnTrigger } from "../shared/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../shared/TickProcesses/processTick_General.js";
import { packageSocketMessageForAllUsers } from "../shared/SignalsManagers/packageSocketMessage.js";

/** @type {Object<string, GameStatesManager>} */
let clients = {};

let clientIds = [];

const fixedDeltaTimePerTick = 1000 / 60; //60 FPS
let prevTime = performance.now();

function init() {
  parentPort.on("message", (message) => {
    switch (message.type) {
      case SocketMessageTypes.serializedClientManager:
        console.log("adding new client to introCassetteTicker...");
        clients[message.value.userId] =
          GameStatesManager.constructFromSerializedJSON(message.value);
        clientIds.push(message.value.userId);
        break;

      case SocketMessageTypes.userInput:
        const clientManager = clients[message.value.userId];
        if (!clientManager) return;

        if (message.value.message === "a") {
          clientManager.playerActor.toWalkState(FacingDirections.left);
        } else if (message.value.message === "d") {
          clientManager.playerActor.toWalkState(FacingDirections.right);
        } else if (message.value.message === "w") {
          clientManager.playerActor.toWalkState(FacingDirections.up);
        } else if (message.value.message === "s") {
          clientManager.playerActor.toWalkState(FacingDirections.down);
        } else if (message.value.message === "idle") {
          clientManager.playerActor.toIdleState();
        }
        break;

      case SocketMessageTypes.removeClientManager:
        console.log(message.value?.message);
        const index = clientIds.findIndex(
          (clientId) => clientId === message.value.userId,
        );
        clientIds.splice(index, 1);
        delete clients[message.value.userId];
    }
  });

  function tick() {
    const now = performance.now();
    prevTime = now;

    updateGame(fixedDeltaTimePerTick);

    const drift = performance.now() - now;
    setTimeout(tick, Math.max(0, fixedDeltaTimePerTick - drift));
  }

  tick();
}

function updateGame(deltaTime) {
  let payloads = {};

  if (clientIds.length > 0) {
    clientIds.forEach((clientId) => {
      const currentClient = clients[clientId];

      if (currentClient) {
        //console.log("current client: ", currentClient.userId);
        processTick_General(currentClient, deltaTime);

        //check for mapJumpTriggers with playerActor
        currentClient.mapJumpTriggers.some((trigger) => {
          if (PawnActorIsOnTrigger(currentClient.playerActor, trigger)) {
            if (
              currentClient.playerActor.facingDirection ===
                trigger.jumpDirection &&
              currentClient.playerActor.actorState ===
                trigger.actionToTrigger + "ing"
            ) {
              currentClient.playerActor.toJumpState(trigger.jumpMagnitude);
            }
            return true;
          }
        });
        currentClient.moveCameraToActor(currentClient.playerActor);
        currentClient.sanitizeCameraPosition();
        payloads[clientId] = currentClient.toJSON("client_payload");
      }
    });

    //broadcast payloads to all clients
    const packagedSocketMessage = packageSocketMessageForAllUsers(
      0,
      SocketMessageTypes.clientsPayload,
      payloads,
    );
    parentPort.postMessage(packagedSocketMessage);
  }
}

init();
