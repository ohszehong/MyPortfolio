//References from Engine.js
//buttons state
//   buttonsActive = {
//     buttonUp: false,
//     buttonLeft: false,
//     buttonDown: false,
//     buttonRight: false,
//     buttonLWrapper: false,
//     buttonRWrapper: false,
//     buttonA: false,
//     buttonB: false,
//   };

// /** @type {{current: SVGElement}} */
//   consoleSvgRef;

//   /** @type {{current: Websocket}} */
//   webSocketRef;

//   /** @type {{current: HTMLCanvasElement}} */
//   contentCanvasRef;

//   /** @type {HTMLCanvasElement} */
//   fixedBackgroundOffscreenCanvas;

//   /* data */
//   cameraPosition = { x: 0, y: 0 };
//   fixedObjectBlockCollisionsData = [];
//   fixedJumpTriggersData = [];

//   playerState = {
//     targetType: TargetTypes.ally,
//     state: CharacterStateTypes.idle,
//     facingDirection: FacingDirections.right,
//     position: { dx: 0, dy: 0 },
//     collision: { ddx: 0, ddy: 0, width: 0, height: 0 },
//   };

//   //for ally npcs
//   allyPawnsState = [];

//   //for enemy npcs
//   enemyPawnsState = [];

//   //otherPlayersState = [];

export default function IntroCassetteButtonsInputCheckLoop()
{
  let hasChangedFlag = false;

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

  return hasChangedFlag;
}
