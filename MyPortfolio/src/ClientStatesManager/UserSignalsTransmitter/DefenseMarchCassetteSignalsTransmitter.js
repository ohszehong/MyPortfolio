import FacingDirection from "../../../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import SocketMessageTypes from "../../../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import DefenseMarchSignalTypes from "../../../shared/Standards/StringKeys/DefenseMarchSignalTypes.json" with { type: "json" };

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
  const CHUDMain = this.gameRootHUD?.childHUDs?.CHUDMain;

  if (!keys) return;

  //0 - Top, 1 - Middle, 2 - Bottom
  const summonCharacterOnWP = (walkPathIndex, actorName) => {
    const requestId = crypto.randomUUID();
    const result = this.signalsManager.spawnPawnActorAtLocation(
      requestId,
      actorName,
      {
        dx: this.allySummonLocations[walkPathIndex].x,
        dy: this.allySummonLocations[walkPathIndex].y,
      },
    );

    if (result.success) {
      const message = {
        requestId: requestId,
        actorName: actorName,
        signal: DefenseMarchSignalTypes.summonOnWP,
        walkPathIndex: walkPathIndex,
      };

      this.sendMessageToServer(SocketMessageTypes.userInput, message);
    }

    console.log(`Client: ${result.message}`);
    return result;
  };

  for (let key in keys) {
    if (keys[key]) {
      //if (key === lastKeys[key]) continue; <- only needed if the key is some kind of trigger (meaning one click then the input is continuous until it is clicked again)
      switch (key) {
        case "w":
          //clientManager.playerActor.toWalkState(FacingDirection.up);
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
          /**
           * childHUDs = {HUD: xxx, active: true}
           */
          if (!CHUDMain?.active) continue;

          const actorName =
            CHUDMain.HUD?.UIElements?.SelectedCharacter?.elementName;
          if (!actorName) return;

          let result = null;
          if (CHUDMain.HUD?.UIElements?.WPTop?.isFocused) {
            result = summonCharacterOnWP(0, actorName);
          } else if (CHUDMain.HUD?.UIElements?.WPMiddle?.isFocused) {
            result = summonCharacterOnWP(1, actorName);
          } else if (CHUDMain.HUD?.UIElements?.WPBottom?.isFocused) {
            result = summonCharacterOnWP(2, actorName);
          }
          if (result.success) {
            CHUDMain.HUD.updateCurrentGoldCoinsLabel();
            CHUDMain.HUD.updateCurrentTotalUnitsLabel();
          }

          //reset the key no matter what as p key is action key (one time action)
          keys.p = false;
          break;

        case "l":
          if (!CHUDMain?.active) continue;

          //the upgrade should not work for the current pawns on field, it should only be affecting the new generated pawns
          const selectedCharacter = CHUDMain.HUD?.UIElements?.SelectedCharacter;

          if (selectedCharacter) {
            const result = this.signalsManager.upgradePawnActor(
              selectedCharacter.elementName,
            );

            if (result.success) {
              const message = {
                actorName: selectedCharacter.elementName,
                signal: DefenseMarchSignalTypes.upgradeCharacter,
              };

              this.sendMessageToServer(SocketMessageTypes.userInput, message);

              CHUDMain.HUD.updateCharacterStatsAndCostsLabels();
              CHUDMain.HUD.updateCurrentGoldCoinsLabel();
            }

            console.log(`Client: ${result.message}`);
          }

          keys.l = false;
          break;
      }
    }
  }

  this.lastKeys = { ...keys };
}
