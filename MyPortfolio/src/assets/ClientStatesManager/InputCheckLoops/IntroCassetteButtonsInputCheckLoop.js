import TargetTypes from "../../../../shared/Standards/StringKeys/TargetTypes.json";
import CharacterStateTypes from "../../../../shared/Standards/StringKeys/CharacterStateTypes.json";
import FacingDirection from "../../../../shared/Standards/StringKeys/FacingDirections.json";

/**
 * @typedef {Object} Engine
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
 * @property {OffscreenCanvas} fixedBackgroundOffscreenCanvas
 * @property {{x: 0, y: 0}} cameraPosition
 * @property {{x: 0, y: 0}} cursorPosition
 * @property {Array} fixedObjectBlockCollisionsData
 * @property {Array} fixedJumpTriggersData
 * @property {{
 *    targetType: TargetTypes,
 *    state: CharacterStateTypes,
 *    facingDirection: FacingDirection,
 *    position: {dx: 0, dy: 0},
 *    collision: {ddx: 0, ddy: 0, width: 0, height: 0}
 * }} playerState
 *
 * @property {Array} allyPawnsState
 * @property {Array} enemyPawnsState
 * @property {Array} otherPlayersState
 */

/**
 * @this {Engine}
 * @return {boolean}
 */

export default function IntroCassetteButtonsInputCheckLoop() {
  let hasChangedFlag = false;
  const ws = this.webSocket;

  if (ws) {
    if (this.buttonsActive.buttonUp) {
      //default behavior
      if (!this.selectedObject) {
        //console.log("button up is pressed...");
        this.cameraPosition.y -= 10;
      }
      hasChangedFlag = true;
    }

    if (this.buttonsActive.buttonDown) {
      //default behavior
      if (!this.selectedObject) {
        //console.log("button down is pressed...");
        this.cameraPosition.y += 10;
      }
      hasChangedFlag = true;
    }

    if (this.buttonsActive.buttonLeft) {
      //default behavior
      if (!this.selectedObject) {
        //console.log("button left is pressed...");
        this.cameraPosition.x -= 10;
      }
      hasChangedFlag = true;
    }

    if (this.buttonsActive.buttonRight) {
      //default behavior
      if (!this.selectedObject) {
        //console.log("button right is pressed...");
        this.cameraPosition.x += 10;
      }
      hasChangedFlag = true;
    }

    if (this.buttonsActive.buttonLWrapper) {
    }

    if (this.buttonsActive.buttonRWrapper) {
    }

    if (this.buttonsActive.buttonA) {
    }

    if (this.buttonsActive.buttonB) {
    }
  }

  return hasChangedFlag;
}
