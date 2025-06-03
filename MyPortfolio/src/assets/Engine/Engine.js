import IntroCassetteButtonsInputCheckLoop from "./InputCheckLoops/IntroCassetteButtonsInputCheckLoop";
import CharacterStateTypes from "../Standards/StringKeys/CharacterStateTypes.json";
import FacingDirections from "../Standards/StringKeys/FacingDirections.json";
import TargetTypes from "../Standards/StringKeys/TargetTypes.json";
import loadTileMap from "./loadTileMap";

export default class Engine {
  cassetteIndex = null;
  isActive = false;

  /** @type {{current: {buttonUp: SVGRectElement, buttonLeft: SVGRectElement, buttonDown: SVGRectElement, buttonRight: SVGRectElement, buttonLWrapper: SVGRectElement, buttonRWrapper: SVGRectElement, buttonA: SVGCircleElement, buttonB: SVGCircleElement}}} */
  buttonsRef = null;
  setButtonActiveBound = null;

  pointerEvents = ["pointerdown", "pointerup", "pointercancel"];
  keyEvents = ["keydown", "keyup"];

  //buttons state
  buttonsActive = {
    buttonUp: false,
    buttonLeft: false,
    buttonDown: false,
    buttonRight: false,
    buttonLWrapper: false,
    buttonRWrapper: false,
    buttonA: false,
    buttonB: false,
  };

  /** @type {{current: SVGElement}} */
  consoleSvgRef = null;

  /** @type {Websocket} */
  webSocket = null;

  /** @type {HTMLCanvasElement} */
  contentCanvas = null;

  /** @type {OffscreenCanvas} */
  fixedBackgroundOffscreenCanvas = null;

  /* data */
  cameraPosition = { x: 0, y: 0 };
  cursorPosition = { x: 0, y: 0 };

  //based on where the user has clicked on the console screen to decide which action should be taken, either moving their character or etc.
  selectedObject = null;

  fixedObjectBlockCollisionsData = [];
  fixedJumpTriggersData = [];

  playerState = {
    targetType: TargetTypes.ally,
    selectable: false,
    state: CharacterStateTypes.idle,
    facingDirection: FacingDirections.right,
    position: { dx: 0, dy: 0 },
    collision: { ddx: 0, ddy: 0, width: 0, height: 0 },
  };

  //for ally npcs
  allyPawnsState = [];

  //for enemy npcs
  enemyPawnsState = [];

  //for multiplayers
  otherPlayersState = [];

  constructor(consoleSvgRef, buttonsRef) {
    this.consoleSvgRef = consoleSvgRef;
    this.buttonsRef = buttonsRef;

    this.setButtonActiveBound = this.setButtonActive.bind(this);
  }

  startGameLoop() {
    /** @type {WebSocket} */
    const ws = this.webSocket;

    const gameLoop = () => {
      if (this.isActive) {
        let hasChanged = false;
        switch (this.cassetteIndex) {
          case 0:
            hasChanged = IntroCassetteButtonsInputCheckLoop.call(this);
            break;
        }

        if (hasChanged) {
          console.log("has changes, redrawing...");
          this.drawContentCanvas(this.fixedBackgroundOffscreenCanvas);
        }

        requestAnimationFrame(() => {
          gameLoop();
        });
      }
    };

    gameLoop();
  }

  async initCassette(cassetteIndex, shouldAbortRef) {
    if (cassetteIndex === null) {
      console.log("invalid cassette index, please try init later.");
      return;
    }

    this.cassetteIndex = cassetteIndex;

    const initCanvasContent = async () => {
      console.log("current cassette index from engine: ", this.cassetteIndex);

      try {
        this.contentCanvas = document.createElement("canvas");
        this.contentCanvas.width = 480;
        this.contentCanvas.height = 280;

        await loadTileMap.call(this, shouldAbortRef);

        //Initial draw
        this.isActive = this.drawContentCanvas(
          this.fixedBackgroundOffscreenCanvas
        );
      } catch (err) {
        throw new Error(err);
      }
    };

    await initCanvasContent();
    this.initButtons();

    //connect to websocket
    this.webSocket = new WebSocket(
      `${import.meta.env.VITE_WS_CONNECTION}//${
        import.meta.env.VITE_ORIGIN_WITHOUT_HTTP
      }/cassetteSocket`,
      `cassette-${this.cassetteIndex}`
    );

    if (this.webSocket) {
      /** @type {WebSocket} */
      const ws = this.webSocket;

      ws.onopen = (event) => {
        ws.send("hello world.");
      };

      ws.onmessage = (event) => {
        console.log("received message from server: ", event.data);
      };
    }
  }

  resetEngine() {
    //console.log("resetting engine...");

    this.cassetteIndex = null;
    this.isActive = false;

    this.resetButtons();

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    if (this.contentCanvas) {
      this.contentCanvas.remove();
      this.contentCanvas = null;
    }

    this.fixedBackgroundOffscreenCanvas = null;
    this.cameraPosition = { x: 0, y: 0 };
    this.cursorPosition = { x: 0, y: 0 };

    this.selectedObject = null;

    this.fixedObjectBlockCollisionsData = [];
    this.fixedJumpTriggersData = [];

    this.playerState = {
      targetType: TargetTypes.ally,
      selectable: false,
      state: CharacterStateTypes.idle,
      facingDirection: FacingDirections.right,
      position: { dx: 0, dy: 0 },
      collision: { ddx: 0, ddy: 0, width: 0, height: 0 },
    };

    //for ally npcs
    this.allyPawnsState = [];

    //for enemy npcs
    this.enemyPawnsState = [];

    //for multiplayers
    this.otherPlayersState = [];
  }

  getContentCanvas() {
    return this.contentCanvas;
  }

  clearContentCanvas() {
    /** @type {CanvasRenderingContext2D} */
    const context2d = this.contentCanvas?.getContext("2d");

    if (context2d) {
      context2d.clearRect(
        0,
        0,
        this.contentCanvas.width,
        this.contentCanvas.height
      );
    }
  }

  drawContentCanvas(sourceCanvas) {
    /** @type {CanvasRenderingContext2D} */
    const context2d = this.contentCanvas?.getContext("2d");

    try {
      // console.log("this.canvas: ", this.contentCanvas);
      // console.log("context2d: ", context2d);
      // console.log("source canvas: ", sourceCanvas);
      if (context2d && sourceCanvas) {
        this.sanitizeCameraPosition(false);

        context2d.drawImage(
          sourceCanvas,
          this.cameraPosition.x,
          this.cameraPosition.y,
          this.contentCanvas.width,
          this.contentCanvas.height,
          0,
          0,
          this.contentCanvas.width,
          this.contentCanvas.height
        );
        return true;
      }
    } catch (err) {
      console.log("drawContentCanvas failed: ", err);
      return false;
    }
    return false;
  }

  sanitizeCameraPosition = (printConsole) => {
    let screenWidth = 0;
    let screenHeight = 0;

    if (this.contentCanvas) {
      //screenWidth = this.contentCanvas.width.baseVal.value;
      //screenHeight = this.contentCanvas.height.baseVal.value;
      screenWidth = this.contentCanvas.width;
      screenHeight = this.contentCanvas.height;
    }

    //if the camera is on the edge of the map
    if (this.cameraPosition.x < 0) {
      this.cameraPosition.x = 0;
    } else if (
      this.cameraPosition.x + screenWidth >=
      this.fixedBackgroundOffscreenCanvas.width
    ) {
      this.cameraPosition.x =
        this.fixedBackgroundOffscreenCanvas.width - screenWidth;
    }

    if (this.cameraPosition.y < 0) {
      this.cameraPosition.y = 0;
    } else if (
      this.cameraPosition.y + screenHeight >=
      this.fixedBackgroundOffscreenCanvas.height
    ) {
      this.cameraPosition.y =
        this.fixedBackgroundOffscreenCanvas.height - screenHeight;
    }

    if (printConsole) {
      console.log(
        "offscreen canvas width: ",
        this.fixedBackgroundOffscreenCanvas.width
      );
      console.log("new sanitized camera x: ", this.cameraPosition.x);
    }
  };

  initButtons() {
    if (!this.buttonsRef) return;

    const allButtons = [
      this.buttonsRef.current.buttonUp,
      this.buttonsRef.current.buttonDown,
      this.buttonsRef.current.buttonLeft,
      this.buttonsRef.current.buttonRight,
      this.buttonsRef.current.buttonLWrapper,
      this.buttonsRef.current.buttonRWrapper,
      this.buttonsRef.current.buttonA,
      this.buttonsRef.current.buttonB,
    ];

    console.log("adding buttons listeners...", this.buttonsRef);
    allButtons.forEach((button) => {
      if (button) {
        this.pointerEvents.forEach((eventName) => {
          button.addEventListener(eventName, this.setButtonActiveBound);
        });
      }
    });
  }

  resetButtons() {
    if (!this.buttonsRef) return;

    const allButtons = [
      this.buttonsRef.current.buttonUp,
      this.buttonsRef.current.buttonDown,
      this.buttonsRef.current.buttonLeft,
      this.buttonsRef.current.buttonRight,
      this.buttonsRef.current.buttonLWrapper,
      this.buttonsRef.current.buttonRWrapper,
      this.buttonsRef.current.buttonA,
      this.buttonsRef.current.buttonB,
    ];

    console.log("removing buttons listeners...", this.buttonsRef);
    allButtons.forEach((button) => {
      if (button) {
        this.pointerEvents.forEach((eventName) => {
          //console.log("removing button listener...", button.dataset.buttonName, " ", eventName);
          button.removeEventListener(
            eventName,
            this.setButtonActiveBound
          );
          this.buttonsActive[button.dataset.buttonName] = false;
        });
      }
    });
  }

  /** @param {Event} event */
  setButtonActive(event) {
    //for pointer events
    if (this.pointerEvents.includes(event.type)) {
      if (event.pointerType === "mouse" && event.button != 0) return;
      console.log("clicking...");
      if (event.currentTarget) {
        if (event.type === "pointerdown")
          this.buttonsActive[event.currentTarget.dataset.buttonName] = true;
        else this.buttonsActive[event.currentTarget.dataset.buttonName] = false;
      }
    }
  }
}
