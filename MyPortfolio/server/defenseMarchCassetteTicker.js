import { parentPort } from "worker_threads";

import SocketMessageTypes from "../shared/Standards/StringKeys/SocketMessageTypes.json" with {type: "json"};
import FacingDirections from "../shared/Standards/StringKeys/FacingDirections.json" with {type: "json"};
import GameStatesManager from "./GameStatesManager/GameStatesManager.js";
import { PawnActorIsOnTrigger } from "../shared/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../shared/TickProcess/processTick_General.js";

/** @type {Object<string, GameStatesManager>} */
let clients = {

};

let clientIds = [];

const fixedDeltaTimePerTick = 1000 / 60; //60 FPS
let prevTime = performance.now();

function init()
{
    parentPort.on("message", (message) => {
        switch(message.type)
        {
            case SocketMessageTypes.serializedClientManager:
                console.log("adding new client to defenseMarchCassetteTicker...");
                clients[message.value.userId] = GameStatesManager.constructFromSerializedJSON(message.value);
                clientIds.push(message.value.userId);
                break;

            case SocketMessageTypes.userInput:
                const clientManager = clients[message.value.userId];
                if(!clientManager) return;

                if(message.value.inputName === "a")
                {
                    //clientManager.playerActor.toWalkState(FacingDirections.left);
                }
                else if(message.value.inputName === "d")
                {
                    //clientManager.playerActor.toWalkState(FacingDirections.right);
                }
                else if(message.value.inputName === "w")
                {
                    //clientManager.playerActor.toWalkState(FacingDirections.up);
                }
                else if(message.value.inputName === "s")
                {
                    //clientManager.playerActor.toWalkState(FacingDirections.down);
                }
                else if(message.value.inputName === "idle")
                {
                    //clientManager.playerActor.toIdleState();
                }
                break;

            case SocketMessageTypes.removeClientManager:
                console.log(`removing client with userId of ${message.value}`);
                const index = clientIds.findIndex((clientId) => clientId === message.value);
                clientIds.splice(index, 1);
                delete clients[message.value];
        }
    });

    function tick()
    {
        const now = performance.now();
        prevTime = now;

        updateGame(fixedDeltaTimePerTick);

        const drift = performance.now() - now;
        setTimeout(tick, Math.max(0, fixedDeltaTimePerTick - drift));
    }

    tick();
}

function updateGame(deltaTime)
{
    let payloads = {};

    if(clientIds.length > 0)
    {
        clientIds.forEach((clientId) => {
            const currentClient = clients[clientId];

            if(currentClient)
            {
                //console.log("current client: ", currentClient.userId);
                processTick_General(currentClient, deltaTime);
                payloads[clientId] = currentClient.toJSON("client_payload");
            }
        });

        //broadcast payloads to all clients
        parentPort.postMessage({
            type: SocketMessageTypes.clientsPayload,
            value: payloads
        })
    }
}

init();