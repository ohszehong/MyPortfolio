import IntroCassetteButtonsInputCheckLoop from "./InputCheckLoops/IntroCassetteButtonsInputCheckLoop";
import CharacterStateTypes from "../../../shared/Standards/StringKeys/CharacterStateTypes.json";
import FacingDirections from "../../../shared/Standards/StringKeys/FacingDirections.json";
import TargetTypes from "../../../shared/Standards/StringKeys/TargetTypes.json";
import PawnActor from "../../../shared/Actors/PawnActor";
import TileActor from "../../../shared/Actors/TileActor";

export default class ClientStatesManager {
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

  //for background tiles that don't have animation or not participate in y ordering
  /** @type {OffscreenCanvas} */
  gameMapBackground = null;

  /* data */
  cameraPosition = { x: 0, y: 0 };
  cursorPosition = { x: 0, y: 0 };

  //based on where the user has clicked on the console screen to decide which action should be taken, either moving their character or etc.
  selectedObject = null;

  mapCollisions = [];
  mapTriggers = [];

  pawnActorsBlobDictionary = {};
  tileActorsBlobDictionary = {};

  playerActor;

  //for ally npcs
  allyPawnActors = [];

  //for enemy npcs
  enemyPawnActors = [];

  //tiles that have animation or participate in y ordering
  tileActors = [];

  constructor(consoleSvgRef, buttonsRef) {
    this.consoleSvgRef = consoleSvgRef;
    this.buttonsRef = buttonsRef;

    this.contentCanvas = document.createElement("canvas");
    this.contentCanvas.width = 480;
    this.contentCanvas.height = 280;

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
          this.drawContentCanvas(this.gameMapBackground);
        }

        requestAnimationFrame(() => {
          gameLoop();
        });
      }
    };

    gameLoop();
  }

  async loadCassette(cassetteIndex) {
    if (cassetteIndex === null) {
      console.log(
        "invalid cassette index, please try with valid cassette index."
      );
      return;
    }

    this.cassetteIndex = cassetteIndex;

    console.log(
      "current cassette index from states manager: ",
      this.cassetteIndex
    );

    try {
      //load states data
      const apiEndpoint = import.meta.env.VITE_API_LOAD_CASSETTE;

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cassetteIndex: this.cassetteIndex,
          clientContentCanvasWidth: this.contentCanvas.width,
          clientContentCanvasHeight: this.contentCanvas.height,
        }),
      }).then((res) => res.json());

      if (response.data) {
        console.log("response data: ", response.data);

        //initialize states data
        await this.initRawStatesData(response.data);

        console.log("playerActor", this.playerActor);
        console.log("pawnActorsBlobDictionary: ", this.pawnActorsBlobDictionary)

        //CONTINUE FROM HERE...
      }

      //Initial draw
      this.isActive = true;
      this.drawContentCanvas();

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
    } catch (err) {
      console.log("stack trace: ", err.stack);
      throw new Error(err);
    }
  }

  resetStates() {
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

    this.gameMapBackground = null;

    this.cameraPosition = { x: 0, y: 0 };
    this.cursorPosition = { x: 0, y: 0 };

    this.selectedObject = null;

    this.mapCollisions = [];
    this.mapTriggers = [];

    this.pawnActorsBlobDictionary = {};
    this.tileActorsBlobDictionary = {};

    this.playerActor = null;
    this.allyPawnActors = [];
    this.enemyPawnActors = [];

    this.tileActors = [];
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

  drawContentCanvas() {
    /** @type {CanvasRenderingContext2D} */
    const context2d = this.contentCanvas?.getContext("2d");

    try {
      if (context2d) {
        //draw gameMapBackground first
        if(this.gameMapBackground)
        {
          context2d.drawImage(
            this.gameMapBackground,
            this.cameraPosition.x,
            this.cameraPosition.y,
            this.contentCanvas.width,
            this.contentCanvas.height,
            0,
            0,
            this.contentCanvas.width,
            this.contentCanvas.height
          );
        }
      }
    } catch (err) {
      console.log("drawContentCanvas failed: ", err);
    }
  }

  convertBlobToCanvas(base64BlobString) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = new OffscreenCanvas(img.width, img.height);

        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas);
      };

      img.onerror = reject;
      img.src = `data:image/png;base64,${base64BlobString}`;
    });
  }

  async initRawStatesData(rawStatesData) {
    const createPawnActorFromRawStates = (rawActorStates) => {
      const pawnActor = new PawnActor(
        rawActorStates.tempId,
        rawActorStates.actorName,
        rawActorStates.position,
        rawActorStates.actorStats,
        rawActorStates.actorState,
        rawActorStates.animation,
        rawActorStates.currentLevel,
        rawActorStates.maxLevel,
        rawActorStates.collision,
        rawActorStates.selectable
      );

      pawnActor.facingDirection = rawActorStates.facingDirection;

      return pawnActor;
    };

    if (rawStatesData.playerActor) {
      this.playerActor = createPawnActorFromRawStates(
        rawStatesData.playerActor
      );
    }

    if (rawStatesData.allyPawnActors?.length > 0) {
      rawStatesData.allyPawnActors.forEach((rawActorStates) => {
        this.allyPawnActors.push(createPawnActorFromRawStates(rawActorStates));
      });
    }

    if (rawStatesData.enemyPawnActors?.length > 0) {
      rawStatesData.enemyPawnActors.forEach((rawActorStates) => {
        this.enemyPawnActors.push(createPawnActorFromRawStates(rawActorStates));
      });
    }

    if (rawStatesData.tileActors?.length > 0) {
      rawStatesData.tileActors.forEach((rawActorStates) => {
        this.tileActors.push(
          new TileActor(
            rawActorStates.tempId,
            rawActorStates.position,
            rawActorStates.tiles,
            rawActorStates.selectable
          )
        );
      });
    }

    this.selectedObject = rawStatesData.selectedObject;

    this.cameraPosition = rawStatesData.cameraPosition;
    this.cursorPosition = rawStatesData.cursorPosition;

    this.gameMapBackground = await this.convertBlobToCanvas(
      rawStatesData.gameMapBackgroundBlob
    ).catch((err) => null);

    this.mapCollisions = [...rawStatesData.mapCollisions];
    this.mapTriggers = [...rawStatesData.mapTriggers];

    const actorNames = Object.keys(rawStatesData.pawnActorsBlobDictionary);

    if (actorNames) {
      const entries = await Promise.all(
        actorNames.map(async (actorName) => {
          const actorBlobDictionary =
            rawStatesData.pawnActorsBlobDictionary[actorName];

          const blobStruct = {
            defaultActorImage: null,
            animation: {},
          };

          if (actorBlobDictionary) {
            if (actorBlobDictionary.defaultActorImage) {
              blobStruct.defaultActorImage = await this.convertBlobToCanvas(
                actorBlobDictionary.defaultActorImage
              );
            }

            if (actorBlobDictionary.animation) {
              const animationNames = Object.keys(actorBlobDictionary.animation);

              const entries = await Promise.all(
                animationNames.map(async (animationName) => {
                  const animationCanvas = await this.convertBlobToCanvas(
                    actorBlobDictionary.animation[animationName]
                  );

                  return [animationName, animationCanvas];
                })
              );

              entries.forEach(([animationName, animationCanvas]) => {
                blobStruct.animation[animationName] = animationCanvas;
              });
            }
          }

          return [actorName, blobStruct];
        })
      );

      entries.forEach(([actorName, blobStruct]) => {
        this.pawnActorsBlobDictionary[actorName] = blobStruct;
      });
    }

    const tileGids = Object.keys(rawStatesData.tileActorsBlobDictionary);

    if (tileGids) {
      const entries = await Promise.all(
        tileGids.map(async (tileGid) => {
          const tileCanvas = await this.convertBlobToCanvas(
            rawStatesData.tileActorsBlobDictionary[tileGid]
          );

          return [tileGid, tileCanvas];
        })
      );

      entries.forEach(([tileGid, tileCanvas]) => {
        this.tileActorsBlobDictionary[tileGid] = tileCanvas;
      });
    }
  }

  initButtons() {
    if (!this.buttonsRef || !this.consoleSvgRef) return;

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

    //key events
    this.keyEvents.forEach((eventName) => {
      this.consoleSvgRef.current.addEventListener(
        eventName,
        this.setButtonActiveBound
      );
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
          button.removeEventListener(eventName, this.setButtonActiveBound);
          this.buttonsActive[button.dataset.buttonName] = false;
        });
      }
    });

    //key events
    this.keyEvents.forEach((eventName) => {
      this.consoleSvgRef.current.removeEventListener(
        eventName,
        this.setButtonActiveBound
      );
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
    //for key events
    else if (this.keyEvents.includes(event.type)) {
      console.log("pressing...");

      const result = event.type === "keydown" ? true : false;

      switch (event.key) {
        case "w":
          this.buttonsActive.buttonUp = result;
          break;

        case "a":
          this.buttonsActive.buttonLeft = result;
          break;

        case "s":
          this.buttonsActive.buttonDown = result;
          break;

        case "d":
          this.buttonsActive.buttonRight = result;
          break;

        case "q":
          this.buttonsActive.buttonLWrapper = result;
          break;

        case "e":
          this.buttonsActive.buttonRWrapper = result;
          break;

        case "p":
          this.buttonsActive.buttonA = result;
          break;

        case "l":
          this.buttonsActive.buttonB = result;
          break;
      }
    }
  }
}
