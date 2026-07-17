import FacingDirection from "../../../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import SocketMessageTypes from "../../../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import PawnActor from "../../../shared/Actors/PawnActor.js";
import TileActor from "../../../shared/Actors/TileActor.js";
import DefenseMarchCassetteSignalsManager from "../../../shared/SignalsManagers/DefenseMarchCassetteSignalsManager.js";

/**
 * @typedef {Object} StatesManager
 * @property {{
 *    buttonUp: boolean,
 *    buttonLeft: boolean,
 *    buttonDown: boolean,
 *    buttonRight: boolean,
 *    buttonLWrapper: boolean,
 *    buttonRWrapper: boolean,
 *    buttonA: boolean,
 *    buttonB: boolean,
 * }} buttonsActive
 *
 * @property {{current: SVGElement}} consoleSvgRef
 * @property {WebSocket} webSocket
 * @property {HTMLCanvasElement} contentCanvas
 * @property {OffscreenCanvas} gameMapBackground
 * @property {{x: 0, y: 0}} cameraPosition
 * @property {{x: 0, y: 0}} cursorPosition
 * @property {Array} mapCollisions
 * @property {Array} mapTriggers
 * @property {PawnActor} playerActor
 *
 * @property {Array<PawnActor>} allyPawnActors
 * @property {Array<PawnActor>} enemyPawnActors
 * @property {Array<TileActor>} tileActors
 *
 * @property {DefenseMarchCassetteSignalsManager} signalsManager
 */

/**
 * @this {StatesManager}
 */

export default function transmitUserSignals() {
  let lastKeys = this.lastKeys;
  const keys = this.keys;

  if (!keys) return;

  let shouldIdle = true;

  for (let key in keys) {
    if (keys[key]) {
      //shouldIdle = false;

      if (key === lastKeys[key]) continue;

      switch (key) {
        case "w":
          //clientManager.playerActor.toWalkState(FacingDirection.up);
          console.log("pressed w on defensemarch...");
          break;

        case "a":
          //clientManager.playerActor.toWalkState(FacingDirection.left);
          break;

        case "s":
          //clientManager.playerActor.toWalkState(FacingDirection.down);
          break;

        case "d":
          //clientManager.playerActor.toWalkState(FacingDirection.right);
          break;

        case "q":
          break;

        case "e":
          break;

        case "p":
          console.log("p press...");
          /**
           * childHUDs = {HUD: xxx, active: true}
           */
          const CHUDMain = this.gameRootHUD?.childHUDs?.CHUDMain;
          if (CHUDMain?.active) {
            const actorName =
              CHUDMain.HUD?.UIElements?.SelectedCharacter?.elementName;
            if (!actorName) return;

            if (CHUDMain.HUD?.UIElements?.WPTop?.isFocused) {
              const pawnActor = this.signalsManager.spawnPawnActorAtLocation(
                actorName,
                {
                  dx: this.allySummonLocations[0].x,
                  dy: this.allySummonLocations[0].y,
                },
              );

              if (pawnActor) {
                this.sendMessageToServer(
                  SocketMessageTypes.userInput,
                  `spawnTop+${actorName}+${pawnActor.tempId}`,
                );

                CHUDMain.HUD.updateCurrentGoldCoinsLabel();
              }
            } else if (CHUDMain.HUD?.UIElements?.WPMiddle?.isFocused) {
              this.sendMessageToServer(
                SocketMessageTypes.userInput,
                "spawnMiddle",
              );
            } else if (CHUDMain.HUD?.UIElements?.WPBottom?.isFocused) {
              this.sendMessageToServer(
                SocketMessageTypes.userInput,
                "spawnBottom",
              );
            }
          }
          //reset the key no matter what as p key is action key (one time action)
          keys.p = false;
          break;

        case "l":
          break;
      }
    }
  }

  //   if (shouldIdle)
  //   {
  //      //send input to server
  //       clientManager.sendMessageToServer(SocketMessageTypes.userInput, "idle");

  //       //client prediction
  //       clientManager.playerActor.toIdleState();
  //   }

  this.lastKeys = { ...keys };
}
