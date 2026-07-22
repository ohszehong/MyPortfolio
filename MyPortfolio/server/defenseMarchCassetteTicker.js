import { parentPort } from "worker_threads";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import FacingDirections from "../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
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
    switch (message.type) {
      case SocketMessageTypes.serializedClientManager:
        if (!message.value) return;
        console.log("adding new client to defenseMarchCassetteTicker...");

        const gameStatesManager = GameStatesManager.constructFromSerializedJSON(
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

        const clientSimulator = clients[message.value.userId];
        if (!clientSimulator) return;

        const [signal, actorName, tempId] = message.value.message.split("+");
        if (signal === "a") {
          //clientManager.playerActor.toWalkState(FacingDirections.left);
        } else if (signal === "d") {
          //clientManager.playerActor.toWalkState(FacingDirections.right);
        } else if (signal === "w") {
          //clientManager.playerActor.toWalkState(FacingDirections.up);
        } else if (signal === "s") {
          //clientManager.playerActor.toWalkState(FacingDirections.down);
        } else if (signal === "idle") {
          //clientManager.playerActor.toIdleState();
        } else if (signal === "spawnTop") {
          /** @type {GameStatesManager} */
          const gameStatesManager = clientSimulator.gameStatesManager;

          if (!gameStatesManager) {
            console.log("client simulator does not contains statesManager.");
            return;
          }

          /** @type {DefenseMarchCassetteSignalsManager} */
          const signalsManager = gameStatesManager.signalsManager;

          if (signalsManager) {
            //pawnActor position format: {dx: xxx, dy: xxx}
            const pawnActor = signalsManager.spawnPawnActorAtLocation(
              actorName,
              {
                dx: gameStatesManager.allySummonLocations[0].x,
                dy: gameStatesManager.allySummonLocations[0].y,
              },
              tempId,
            );

            let message;
            if (pawnActor) {
              message = `server: successfully spawn ${actorName} at location ${clientSimulator.gameStatesManager.allySummonLocations[0]}`;
            } else {
              message = `server: failed to spawn ${actorName} at location ${clientSimulator.gameStatesManager.allySummonLocations[0]}`;
            }

            const packagedSocketMessage = packageSocketMessageForSingleUser(
              clientSimulator.gameStatesManager.cassetteIndex,
              SocketMessageTypes.userSignalResponse,
              clientSimulator.gameStatesManager.userId,
              message,
            );
            parentPort.postMessage(packagedSocketMessage);
          }
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
