import FacingDirection from "../../../shared/Standards/StringKeys/FacingDirections.json";
import SocketMessageTypes from "../../../shared/Standards/StringKeys/SocketMessageTypes.json";
import PawnActor from "../../../shared/Actors/PawnActor";
import TileActor from "../../../shared/Actors/TileActor";

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
 * @property {Array<PawnActor>} allyPawnsActors
 * @property {Array<PawnActor>} enemyPawnsActors
 * @property {Array<TileActor>} tileActors
 */

/**
 * @this {StatesManager}
 */

export default function handleKeys()
{
  let lastKeys = this.lastKeys;
  const keys = this.keys;

  if(!keys) return;

  let shouldIdle = true;

  for(let key in keys)
  {
    if(keys[key])
    {
      shouldIdle = false;

      if(key === lastKeys[key]) continue;

      //send input to server
      this.sendMessageToServer(SocketMessageTypes.userInput, key);

      switch(key)
      {
        case "w":
          this.playerActor.toWalkState(FacingDirection.up);
          break;

        case "a":
          this.playerActor.toWalkState(FacingDirection.left);
          break;

        case "s":
          this.playerActor.toWalkState(FacingDirection.down);
          break;

        case "d":
          this.playerActor.toWalkState(FacingDirection.right);
          break;

        case "q":
          break;

        case "e":
          break;

        case "p":
          break;

        case "l":
          break;
      }
    }
  }

  if (shouldIdle)
  {
     //send input to server
      this.sendMessageToServer(SocketMessageTypes.userInput, "idle");

      //client prediction
      this.playerActor.toIdleState();
  }

  this.lastKeys = {...keys};
}