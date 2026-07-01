import { parentPort } from "worker_threads";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import FacingDirections from "../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import { PawnActorIsOnTrigger } from "../shared/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../shared/TickProcess/processTick_General.js";

let clientIds = [];

/** @type {Object<string, DefenseMarchClient>} */
let clients = {};

const FIXED_DELTA_TIME_PER_TICK = 1000 / 60; //60 FPS
class DefenseMarchClient {
  /** @type {GameStatesManager} */
  gameStateManager;
  prevTime;

  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
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
    processTick_General(this.gameStateManager, totalDelta);
  }
}

function init() {
  parentPort.on("message", (message) => {
    switch (message.type) {
      case SocketMessageTypes.serializedClientManager:
        ow = performance.now();
        console.log("adding new client to defenseMarchCassetteTicker...");
        const gameStateManager = GameStatesManager.constructFromSerializedJSON(
          message.value,
        );
        clients[message.value.userId] = new DefenseMarchClient(
          gameStateManager,
        );
        clientIds.push(message.value.userId);
        break;

      case SocketMessageTypes.userInput:
        const clientManager = clients[message.value.userId];
        if (!clientManager) return;

        if (message.value.inputName === "a") {
          //clientManager.playerActor.toWalkState(FacingDirections.left);
        } else if (message.value.inputName === "d") {
          //clientManager.playerActor.toWalkState(FacingDirections.right);
        } else if (message.value.inputName === "w") {
          //clientManager.playerActor.toWalkState(FacingDirections.up);
        } else if (message.value.inputName === "s") {
          //clientManager.playerActor.toWalkState(FacingDirections.down);
        } else if (message.value.inputName === "idle") {
          //clientManager.playerActor.toIdleState();
        }
        break;

      case SocketMessageTypes.removeClientManager:
        console.log(`removing client with userId of ${message.value}`);
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
        payloads[clientId] =
          currentClient.gameStateManager.toJSON("client_payload");
      }
    });

    //TO-DO: don't have to send payload every single frame for a single player game
    //only send for things that actually matters, like saving the game and etc...
    //we can temporarily use it to test the latency
    //broadcast payloads to all clients
    parentPort.postMessage({
      type: SocketMessageTypes.clientsPayload,
      value: payloads,
    });
  }
}

init();
