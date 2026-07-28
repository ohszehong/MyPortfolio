import CharacterStateTypes from "../../shared/Standards/StringKeys/CharacterStateTypes.json" with { type: "json" };
import FacingDirections from "../../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import TargetTypes from "../../shared/Standards/StringKeys/TargetTypes.json" with { type: "json" };
import CollisionTypes from "../../shared/Standards/StringKeys/CollisionTypes.json" with { type: "json" };
import SocketMessageTypes from "../../shared/Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };
import DefenseMarchSignalTypes from "../../shared/Standards/StringKeys/DefenseMarchSignalTypes.json" with { type: "json" };

import PawnActor from "../../shared/Actors/PawnActor.js";
import TileActor from "../../shared/Actors/TileActor.js";

import IntroCassetteSignalsTransmitter from "./UserSignalsTransmitter/IntroCassetteSignalsTransmitter.js";
import DefenseMarchCassetteSignalsTransmitter from "./UserSignalsTransmitter/DefenseMarchCassetteSignalsTransmitter.js";

import {
  AIsCollidedWithB,
  PawnActorIsOnTrigger,
} from "../../shared/CollisionsDetector/CollisionsDetector.js";
import processTick_General from "../../shared/TickProcesses/processTick_General.js";

import Block from "../HUDs/Block.js";
import Label from "../HUDs/Label.js";
import Button from "../HUDs/Button.js";
import UImage from "../HUDs/Image.js";
import rootHUD from "../HUDs/rootHUD.js";
import childHUD from "../HUDs/childHUD.js";

import loadImage from "../Utilities/loadImage.js";
import WalkPath from "../HUDs/WalkPath.js";

import packageSocketMessageForSingleUser from "../../shared/SignalsManagers/packageSocketMessage.js";
import DefenseMarchCassetteSignalsManager from "../../shared/SignalsManagers/DefenseMarchCassetteSignalsManager.js";

export default class ClientStatesManager {
  userId = null;
  cassetteIndex = null;
  cassetteName = null;
  isActive = false;

  /** @type {{current: {buttonUp: SVGRectElement, buttonLeft: SVGRectElement, buttonDown: SVGRectElement, buttonRight: SVGRectElement, buttonLWrapper: SVGRectElement, buttonRWrapper: SVGRectElement, buttonA: SVGCircleElement, buttonB: SVGCircleElement}}} */
  buttonsRef = null;

  pointerEvents = ["pointerdown", "pointerup", "pointerout", "pointercancel"];
  keyEvents = ["keydown", "keyup"];

  setKeyActiveBound = null;

  lastKeys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    p: false,
    l: false,
  };

  keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    p: false,
    l: false,
  };

  signalsTransmitter = null;
  signalsManager = null;

  /** @type {{current: SVGElement}} */
  consoleSvgRef = null;

  /** @type {Websocket} */
  webSocket = null;

  /** @type {HTMLCanvasElement} */
  contentCanvas = null;
  //content canvas screen base width and height, it should be the same as the value in CSS width and height for the canvas
  //any game logic that need to work with the screen width and height should use this
  //instead of the w/h that is multiplied by the dpr, because in the final output the CSS (or the display width and height) will take that into account
  contentCanvasDisplayWidth = 480;
  contentCanvasDisplayHeight = 280;

  //device screen's pixel density
  dpr = 1;

  //for background tiles that don't have animation or not participate in y ordering
  /** @type {OffscreenCanvas} */
  gameMapBackground = null;

  //for processTick_General
  gameMapBackgroundCanvasBaseWidth = 0;
  gameMapBackgroundCanvasBaseHeight = 0;

  //HUD
  /** @type { rootHUD } */
  gameRootHUD = null;

  currentCursorOverlappedUIElement = null;

  /* data */
  cameraPosition = { x: 0, y: 0 };
  cursorPosition = { x: 0, y: 0 };

  //based on where the user has clicked on the console screen to decide which action should be taken, either moving their character or etc.
  selectedObject = null;

  mapCollisions = [];
  mapJumpTriggers = [];
  mapSoundTriggers = [];

  pawnActorsBlobDictionary = {};
  tileActorsBlobDictionary = {};

  tileSoundsBlobDictionary = {};
  actorSoundsBlobDictionary = {};

  playerActor = null;

  //for ally npcs
  allyPawnActors = [];

  //for enemy npcs
  enemyPawnActors = [];

  //tiles that have animation or participate in y ordering
  tileActors = [];

  //collisions that spawn from animation
  spawnCollisions = [];

  //actors that spawn from animation
  spawnActors = [];

  //array containing all types of actors that are sorted by y position
  allActorsSortedByY = [];

  //for DefenseMarchCassette (summon locations are init via loadTileMap)
  allySummonLocations = [];
  enemySummonLocations = [];

  //considering to transmit these data from server...
  goldCoins = 0;
  currentTotalUnits = 0;
  maxTotalUnits = 50;
  currentWave = 1;
  maxWaves = 100;

  //for gameLoop specific to a cassette
  processTick_CassetteSpecific = null;

  constructor(consoleSvgRef, buttonsRef) {
    this.consoleSvgRef = consoleSvgRef;
    this.buttonsRef = buttonsRef;

    this.contentCanvas = document.createElement("canvas");
    this.contentCanvas.style.width = this.contentCanvasDisplayWidth + "px";
    this.contentCanvas.style.height = this.contentCanvasDisplayHeight + "px";
    this.contentCanvas.dataset.hoverable = "default";
    this.setupInnerContextForContentCanvas();

    this.contentCanvas.addEventListener(
      "pointermove",
      this.handlePointerMoveOnCanvas,
    );
    this.contentCanvas.addEventListener(
      "pointerdown",
      this.handlePointerDownOnCanvas,
    );

    //zooming in/out will change the value of dpr
    window.addEventListener("resize", this.setupInnerContextForContentCanvas);

    this.setKeyActiveBound = this.setKeyActive.bind(this);
  }

  destroy() {
    this.contentCanvas.removeEventListener(
      "pointermove",
      this.handlePointerMoveOnCanvas,
    );
    this.contentCanvas.removeEventListener(
      "pointerdown",
      this.handlePointerDownOnCanvas,
    );
    window.removeEventListener(
      "resize",
      this.setupInnerContextForContentCanvas,
    );

    this.resetStates();

    //reset buttons doesn't remove the reference to the buttons but only the listeners
    //explicitly remove the references here
    this.buttonsRef = null;
  }

  handlePointerMoveOnCanvas = (event) => {
    event.preventDefault();

    //update cursor
    this.cursorPosition.x = this.cameraPosition.x + event.offsetX;
    this.cursorPosition.y = this.cameraPosition.y + event.offsetY;

    if (this.gameRootHUD) {
      const previousElem = this.currentCursorOverlappedUIElement;
      this.currentCursorOverlappedUIElement =
        this.gameRootHUD.getCursorOverlappedElement(
          this.cursorPosition.x,
          this.cursorPosition.y,
        );

      if (previousElem != this.currentCursorOverlappedUIElement) {
        previousElem?.onPointerLeave();
      }
      this.currentCursorOverlappedUIElement?.onPointerEnter();
    }
  };

  handlePointerDownOnCanvas = (event) => {
    event.preventDefault();

    if (this.gameRootHUD) {
      if (this.currentCursorOverlappedUIElement) {
        this.currentCursorOverlappedUIElement.onClick();
      }
    }
  };

  //InnerContext refers to the canvas internal data instead of the CSS data from .style
  setupInnerContextForContentCanvas = () => {
    if (!this.contentCanvas) return;
    //modern screens uses multiple physical pixels to display one web pixel
    //therefore we should scale the canvas internal resolution by the device pixel ratio
    //then on the CSS side (for web), shrink it back
    this.dpr = window.devicePixelRatio <= 1 ? 1 : window.devicePixelRatio;

    const context2d = this.contentCanvas.getContext("2d");

    this.contentCanvas.width = this.contentCanvasDisplayWidth * this.dpr;
    this.contentCanvas.height = this.contentCanvasDisplayHeight * this.dpr;

    //this is needed so that you can use the values from a 480 x 280 standpoint directly in the context
    //so that you don't have to manually multiply by the dpr for every values used in the context later
    context2d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    //disable it for higher quality on pixel arts
    context2d.imageSmoothingEnabled = false;
  };

  FIXED_DELTA_TIME_FROM_SERVER = 1000 / 60;
  prevTime;
  accumulatedDeltaTime = 0;

  currentGameTick = 0;

  latestDataFromServer = null;

  startGameLoop() {
    this.prevTime = performance.now();

    const gameLoop = () => {
      const now = performance.now();
      const deltaTime = now - this.prevTime;
      this.prevTime = now;

      if (this.isActive) {
        //ensure that client has similar delta time per tick with the server
        this.accumulatedDeltaTime += deltaTime;

        while (this.accumulatedDeltaTime >= this.FIXED_DELTA_TIME_FROM_SERVER) {
          const shouldNotAcceptNewInput = this.reconcileDataFromServer();
          if (!shouldNotAcceptNewInput) {
            if (this.signalsTransmitter) {
              this.signalsTransmitter();
            }

            processTick_General(this, this.FIXED_DELTA_TIME_FROM_SERVER);

            this.processTick_CassetteGeneral();

            if (this.processTick_CassetteSpecific) {
              this.processTick_CassetteSpecific();
            }
            this.sortAllActorsByY();

            //draw canvas...
            this.drawContentCanvas();

            this.accumulatedDeltaTime -= this.FIXED_DELTA_TIME_FROM_SERVER;
          }
        }

        requestAnimationFrame(() => {
          gameLoop();
        });
      }
    };

    gameLoop();
  }

  playAllActorsAnimation(deltaTime) {
    if (this.playerActor) {
      this.spawnCollisions = [
        ...this.spawnCollisions,
        ...this.playerActor.playAnimation(deltaTime).collisions,
      ];
    }

    this.allyPawnActors.forEach((actor) => {
      this.spawnCollisions = [
        ...this.spawnCollisions,
        ...actor.playAnimation(deltaTime).collisions,
      ];
    });

    this.enemyPawnActors.forEach((actor) => {
      this.spawnCollisions = [
        ...this.spawnCollisions,
        ...actor.playAnimation(deltaTime).collisions,
      ];
    });

    this.tileActors.forEach((actor) => {
      actor.playAnimation(deltaTime);
    });

    //handle summoning later...
  }

  getAllPawnActors() {
    let pawnActors = [];

    if (this.playerActor) {
      pawnActors.push(this.playerActor);
    }

    return (pawnActors = [
      ...pawnActors,
      ...this.allyPawnActors,
      ...this.enemyPawnActors,
    ]);
  }

  getAllNonPawnActorBlockCollisions() {
    let collisions = [];

    this.tileActors.forEach((actor) => {
      if (actor.collision) {
        collisions.push(actor.collision);
      }
    });

    this.spawnActors.forEach((actor) => {
      if (actor.collision?.collisionType === CollisionTypes.blockCollision) {
        collisions.push(actor.collision);
      }
    });

    let spawnBlockCollisions = this.spawnCollisions.filter(
      (collision) => collision.collisionType === CollisionTypes.blockCollision,
    );

    let mapBlockCollisions = this.mapCollisions.filter(
      (collision) => collision.collisionType === CollisionTypes.blockCollision,
    );

    collisions = [
      ...collisions,
      ...spawnBlockCollisions,
      ...mapBlockCollisions,
    ];
    return collisions;
  }

  handleSpawnCollisionsLifetime(deltaTime) {
    this.spawnCollisions.forEach((collision, index) => {
      this.spawnCollisions[index].duration -= deltaTime;
      if (this.spawnCollisions[index].duration <= 0) {
        //remove spawnCollision
        this.spawnCollisions.splice(index, 1);
      }
    });
  }

  async loadCassette(cassetteIndex) {
    if (cassetteIndex === null) {
      console.log(
        "invalid cassette index, please try with valid cassette index.",
      );
      return;
    }

    this.cassetteIndex = cassetteIndex;

    try {
      //load states data
      const apiEndpoint = import.meta.env.VITE_API_LOAD_CASSETTE;

      //remember to divide the contentCanvas width and height by the dpr to send the actual canvas width and height
      // console.log ("canvas scaled width and height: ", this.contentCanvas.width, " ", this.contentCanvas.height);
      // console.log("dpr: ", this.dpr);
      // console.log("actual width: ", this.contentCanvas.width / this.dpr);
      // console.log("actual height: ", this.contentCanvas.height / this.dpr);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cassetteIndex: this.cassetteIndex,
          clientContentCanvasWidth: this.contentCanvasDisplayWidth,
          clientContentCanvasHeight: this.contentCanvasDisplayHeight,
        }),
      }).then((res) => res.json());

      if (response.data) {
        //console.log("response data: ", response.data);

        //initialize states data
        await this.initRawStatesData(response.data);

        //sort all the actors by y position
        this.sortAllActorsByY();
      }

      switch (this.cassetteIndex) {
        case 0:
          this.cassetteName = "IntroCassette";
          this.signalsTransmitter = IntroCassetteSignalsTransmitter.bind(this);

          this.processTick_CassetteSpecific = () => {
            //check for mapJumpTriggers with playerActor
            if (this.playerActor.actorState != CharacterStateTypes.jumping) {
              this.mapJumpTriggers.some((trigger) => {
                if (PawnActorIsOnTrigger(this.playerActor, trigger)) {
                  if (
                    this.playerActor.facingDirection ===
                      trigger.jumpDirection &&
                    this.playerActor.actorState ===
                      trigger.actionToTrigger + "ing"
                  ) {
                    console.log(
                      "is within jump trigger...",
                      trigger.jumpMagnitude,
                    );
                    this.playerActor.toJumpState(trigger.jumpMagnitude);

                    const audios =
                      this.actorSoundsBlobDictionary[this.playerActor.actorName]
                        ?.jump;
                    if (audios) {
                      this.playAudioRandomWithRandomVolume(audios);
                    }
                  }
                  return true;
                }
              });
            }

            this.moveCameraToActor(this.playerActor);
            this.sanitizeCameraPosition();
          };
          break;

        case 1:
          //default settings for ease of change
          const defaultTextAlignment = "start";
          const defaultFontFamily = "Darinia";
          const defaultMainFontColor = "rgba(73, 51, 51, 1)";
          const defaultSecondaryFontColor = "rgba(170, 74, 29, 1)";
          const defaultGoldCoinValueColor = "rgba(255, 255, 255, 1)";
          const defaultBlockPathColor = "rgba(103, 255, 136, 0.5)";

          this.cassetteName = "DefenseMarchCassette";
          this.signalsTransmitter =
            DefenseMarchCassetteSignalsTransmitter.bind(this);
          this.signalsManager = new DefenseMarchCassetteSignalsManager(this);

          //creating HUDs for DefenseMarch
          this.gameRootHUD = new rootHUD(
            "Root",
            0,
            0,
            this.contentCanvas.width,
            this.contentCanvas.height,
          );

          //StartGame child hud
          const CHUDStartGame = new childHUD(
            "CHUDStartGame",
            0,
            0,
            this.contentCanvas.width,
            this.contentCanvas.height,
          );

          const LTitleDefense = new Label(
            "LTitleDefense",
            136,
            51,
            258,
            68,
            "DEFENSE",
            defaultTextAlignment,
            "rgba(83, 206, 231, 1)",
            60,
            defaultFontFamily,
          );
          const LTitleMarch = new Label(
            "LTitleMarch",
            165,
            98.5,
            191,
            58.5,
            "MARCH",
            defaultTextAlignment,
            "rgba(75, 80, 18, 1)",
            48,
            defaultFontFamily,
          );

          const BTNStart = new Button(
            "BTNStart",
            209.17,
            212.83,
            107,
            39.67,
            null,
            null,
            "START",
          );
          BTNStart.updateLabelTextData(
            null,
            null,
            null,
            null,
            "START",
            defaultTextAlignment,
            "rgba(170, 74, 29, 0.5)",
            33,
            null,
          );
          BTNStart.onPointerEnter = () => {
            BTNStart.setLabelColor(defaultSecondaryFontColor);
            this.contentCanvas.dataset.hoverable = "pointer";
          };
          BTNStart.onPointerLeave = () => {
            BTNStart.setLabelColor("rgba(170, 74, 29, 0.5)");
            this.contentCanvas.dataset.hoverable = "default";
          };

          BTNStart.onClick = () => {
            this.gameRootHUD.setHUDActive("CHUDStartGame", false);
            this.gameRootHUD.setHUDActive("CHUDMain", true);
            this.contentCanvas.dataset.hoverable = "default";
          };

          CHUDStartGame.addUIElement(LTitleDefense);
          CHUDStartGame.addUIElement(LTitleMarch);
          CHUDStartGame.addUIElement(BTNStart);

          this.gameRootHUD.addChildHUD(CHUDStartGame);
          this.gameRootHUD.setHUDActive("CHUDStartGame", true);

          //Main child hud
          const CHUDMain = new childHUD(
            "CHUDMain",
            0,
            0,
            this.contentCanvas.width,
            this.contentCanvas.height,
          );
          this.gameRootHUD.addChildHUD(CHUDMain);

          //Properties specifics for CHUDMain
          CHUDMain.currentActiveCharacterButtonIndex = 0;
          CHUDMain.CharacterButtonArray = [];

          //UIElement for CharacterButton contain only the active one
          CHUDMain.UIElements.SelectedCharacter = null;

          //IM -> non HUD image, I -> HUD image
          const IMCharacterPortraitContainer = await loadImage(
            "/DefenseMarchCassette/Images/characterPortraitContainer.png",
          );

          const ICharacterPortraitContainer = new UImage(
            "ICharacterPortraitContainer",
            84.33,
            194.33,
            IMCharacterPortraitContainer.width,
            IMCharacterPortraitContainer.height,
            IMCharacterPortraitContainer,
            0,
            0,
            false,
            null,
          );
          ICharacterPortraitContainer.setImageDimensions(0, 0, 74.67, 84.67);
          CHUDMain.addUIElement(ICharacterPortraitContainer);

          const IMArrowButton = await loadImage(
            "/DefenseMarchCassette/Images/arrowButton.png",
          );

          const BTNArrowButtonPrev = new Button(
            "BTNArrowButtonPrev",
            61,
            230,
            IMArrowButton.width + 5.5,
            IMArrowButton.height + 5.5,
            null,
            IMArrowButton,
            null,
          );
          BTNArrowButtonPrev.flipHorizontal = true;
          BTNArrowButtonPrev.opacity = 0.5;

          BTNArrowButtonPrev.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
            BTNArrowButtonPrev.opacity = 1.0;
          };

          BTNArrowButtonPrev.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
            BTNArrowButtonPrev.opacity = 0.5;
          };

          BTNArrowButtonPrev.onClick = () => {
            CHUDMain.currentActiveCharacterButtonIndex =
              CHUDMain.currentActiveCharacterButtonIndex - 1;

            if (CHUDMain.currentActiveCharacterButtonIndex < 0) {
              CHUDMain.currentActiveCharacterButtonIndex =
                CHUDMain.CharacterButtonArray.length - 1;
            }

            CHUDMain.UIElements.SelectedCharacter =
              CHUDMain.CharacterButtonArray[
                CHUDMain.currentActiveCharacterButtonIndex
              ];
            CHUDMain.updateCharacterStatsAndCostsLabels();

            //force reset the cursor style to pointer because sometimes clicking on it will cause shifting of the layers which made the pointer temporarily leaving the canvas
            // requestAnimationFrame(() => {
            //   this.contentCanvas.style.cursor = "pointer";
            // });
            //^ don't need this anymore since we are using custom cursor
          };
          CHUDMain.addUIElement(BTNArrowButtonPrev);

          const BTNArrowButtonNext = new Button(
            "BTNArrowButtonNext",
            161.33,
            230,
            IMArrowButton.width + 5.5,
            IMArrowButton.height + 5.5,
            null,
            IMArrowButton,
            null,
          );
          BTNArrowButtonNext.opacity = 0.5;

          BTNArrowButtonNext.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
            BTNArrowButtonNext.opacity = 1.0;
          };

          BTNArrowButtonNext.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
            BTNArrowButtonNext.opacity = 0.5;
          };

          BTNArrowButtonNext.onClick = () => {
            CHUDMain.currentActiveCharacterButtonIndex =
              CHUDMain.currentActiveCharacterButtonIndex + 1;

            if (
              CHUDMain.currentActiveCharacterButtonIndex >=
              CHUDMain.CharacterButtonArray.length
            ) {
              CHUDMain.currentActiveCharacterButtonIndex = 0;
            }

            CHUDMain.UIElements.SelectedCharacter =
              CHUDMain.CharacterButtonArray[
                CHUDMain.currentActiveCharacterButtonIndex
              ];
            CHUDMain.updateCharacterStatsAndCostsLabels();
          };
          CHUDMain.addUIElement(BTNArrowButtonNext);

          //character icons as buttons for summoning
          //no prefixes and use camelCase for character button names for ease of accessing the actual character names from blobs dictionary
          const IMCleric = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/cleric/portrait.png",
          );
          const BTNCleric = new Button(
            "cleric",
            106.67,
            222,
            IMCleric.width,
            IMCleric.height,
            null,
            IMCleric,
          );
          CHUDMain.CharacterButtonArray.push(BTNCleric);

          const IMElfRangerRookie = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/elfRangerRookie/portrait.png",
          );
          const BTNElfRangerRookie = new Button(
            "elfRangerRookie",
            112.67,
            223.33,
            IMElfRangerRookie.width,
            IMElfRangerRookie.height,
            null,
            IMElfRangerRookie,
          );
          CHUDMain.CharacterButtonArray.push(BTNElfRangerRookie);

          const IMFowlGladiator = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/fowlGladiator/portrait.png",
          );
          const BTNFowlGladiator = new Button(
            "fowlGladiator",
            100,
            227.33,
            IMFowlGladiator.width,
            IMFowlGladiator.height,
            null,
            IMFowlGladiator,
          );
          CHUDMain.CharacterButtonArray.push(BTNFowlGladiator);

          const IMGolemSentinel = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/golemSentinel/portrait.png",
          );
          const BTNGolemSentinel = new Button(
            "golemSentinel",
            95,
            203.33,
            IMGolemSentinel.width,
            IMGolemSentinel.height,
            null,
            IMGolemSentinel,
          );
          CHUDMain.CharacterButtonArray.push(BTNGolemSentinel);

          const IMKnight = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/knight/portrait.png",
          );
          const BTNKnight = new Button(
            "knight",
            110.67,
            216.33,
            IMKnight.width,
            IMKnight.height,
            null,
            IMKnight,
          );
          CHUDMain.CharacterButtonArray.push(BTNKnight);

          const IMElfRangerVeteran = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/elfRangerVeteran/portrait.png",
          );
          const BTNElfRangerVeteran = new Button(
            "elfRangerVeteran",
            100.67,
            217.67,
            IMElfRangerVeteran.width,
            IMElfRangerVeteran.height,
            null,
            IMElfRangerVeteran,
          );
          CHUDMain.CharacterButtonArray.push(BTNElfRangerVeteran);

          const IMWizard = await loadImage(
            "/DefenseMarchCassette/CharacterPortraits/wizard/portrait.png",
          );
          const BTNWizard = new Button(
            "wizard",
            111.33,
            217.33,
            IMWizard.width,
            IMWizard.height,
            null,
            IMWizard,
          );
          CHUDMain.CharacterButtonArray.push(BTNWizard);

          CHUDMain.UIElements.SelectedCharacter =
            CHUDMain.CharacterButtonArray[0];

          //character stats banner and detail texts
          const IMCharacterStatsBanner = await loadImage(
            "/DefenseMarchCassette/Images/characterStatsBanner.png",
          );
          //the width and height of the element itself only affects background image, use setImageDimensions to modify the image itself
          const ICharacterStatsBanner = new UImage(
            "ICharacterStatsBanner",
            206.5,
            193.33,
            211.5,
            85,
            IMCharacterStatsBanner,
            0,
            0,
            false,
            null,
          );
          ICharacterStatsBanner.setImageDimensions(0, 0, 211.5, 85);
          CHUDMain.addUIElement(ICharacterStatsBanner);

          const LCharacterName = new Label(
            "LCharacterName",
            229,
            197.33,
            160,
            13,
            "Lorem Ipsum",
            defaultTextAlignment,
            defaultSecondaryFontColor,
            12,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LCharacterName);

          const LLevelTag = new Label(
            "LLevelTag",
            229,
            211.17,
            19.67,
            13,
            "LV:",
            defaultTextAlignment,
            defaultMainFontColor,
            10,
            defaultFontFamily,
            false,
          );
          const LCharacterLevel = new Label(
            "LCharacterLevel",
            245,
            211.17,
            19.67,
            13,
            1,
            defaultTextAlignment,
            defaultSecondaryFontColor,
            10,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LLevelTag);
          CHUDMain.addUIElement(LCharacterLevel);

          const LHPTag = new Label(
            "LHPTag",
            229.16,
            225.67,
            18.45,
            13,
            "HP:",
            defaultTextAlignment,
            defaultMainFontColor,
            10,
            defaultFontFamily,
            false,
          );
          const LCharacterHP = new Label(
            "LCharacterHP",
            248.49,
            225.67,
            31,
            13,
            100,
            defaultTextAlignment,
            defaultSecondaryFontColor,
            10,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LHPTag);
          CHUDMain.addUIElement(LCharacterHP);

          const LDefTag = new Label(
            "LDefTag",
            229.33,
            236.67,
            22.21,
            13,
            "DEF:",
            defaultTextAlignment,
            defaultMainFontColor,
            10,
            defaultFontFamily,
            false,
          );
          const LCharacterDef = new Label(
            "LCharacterDef",
            253,
            236.67,
            29,
            13,
            10,
            defaultTextAlignment,
            defaultSecondaryFontColor,
            10,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LDefTag);
          CHUDMain.addUIElement(LCharacterDef);

          const LAtkTag = new Label(
            "LAtkTag",
            314.58,
            225.67,
            25,
            13,
            "ATK:",
            defaultTextAlignment,
            defaultMainFontColor,
            10,
            defaultFontFamily,
            false,
          );
          const LCharacterAtk = new Label(
            "LCharacterAtk",
            341.33,
            225.67,
            31,
            13,
            1,
            defaultTextAlignment,
            defaultSecondaryFontColor,
            10,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LAtkTag);
          CHUDMain.addUIElement(LCharacterAtk);

          const LHealTag = new Label(
            "LHealTag",
            314.58,
            236.67,
            33,
            13,
            "HEAL:",
            defaultTextAlignment,
            defaultMainFontColor,
            10,
            defaultFontFamily,
            false,
          );
          const LCharacterHeal = new Label(
            "LCharacterHeal",
            347.66,
            236.67,
            31,
            13,
            "N/A",
            defaultTextAlignment,
            defaultSecondaryFontColor,
            10,
            defaultFontFamily,
            false,
          );
          CHUDMain.addUIElement(LHealTag);
          CHUDMain.addUIElement(LCharacterHeal);

          //create an array of characters name with space to show in the banner
          CHUDMain.charactersDisplayName = [
            "Cleric",
            "Elf Ranger Rookie",
            "Fowl Gladiator",
            "Golem Sentinel",
            "Knight",
            "Elf Ranger Veteran",
            "Wizard",
          ];

          //create functions for CHUDMain to update the labels
          CHUDMain.updateCharacterStatsAndCostsLabels = () => {
            let selectedCharacter = CHUDMain.UIElements.SelectedCharacter;

            if (selectedCharacter) {
              let selectedCharacterBlobDictionary =
                this.pawnActorsBlobDictionary[selectedCharacter.elementName];

              if (selectedCharacterBlobDictionary) {
                //character stats
                let selectedCharacterCurrentLevel =
                  selectedCharacterBlobDictionary.currentLevel;
                CHUDMain.UIElements.LCharacterName.setLabelText(
                  CHUDMain.charactersDisplayName[
                    CHUDMain.currentActiveCharacterButtonIndex
                  ],
                );
                CHUDMain.UIElements.LCharacterLevel.setLabelText(
                  selectedCharacterBlobDictionary.currentLevel,
                );

                let selectedCharacterCurrentStats =
                  selectedCharacterBlobDictionary.defaultStats;

                CHUDMain.UIElements.LCharacterHP.setLabelText(
                  selectedCharacterCurrentStats.health +
                    (selectedCharacterCurrentLevel - 1) *
                      selectedCharacterBlobDictionary.motionValues[0],
                );
                CHUDMain.UIElements.LCharacterDef.setLabelText(
                  selectedCharacterCurrentStats.defense +
                    (selectedCharacterCurrentLevel - 1) *
                      selectedCharacterBlobDictionary.motionValues[1],
                );
                CHUDMain.UIElements.LCharacterAtk.setLabelText(
                  selectedCharacterCurrentStats.attack +
                    (selectedCharacterCurrentLevel - 1) *
                      selectedCharacterBlobDictionary.motionValues[2],
                );

                let healing =
                  selectedCharacterCurrentStats.healing +
                  (selectedCharacterCurrentLevel - 1) *
                    selectedCharacterBlobDictionary.motionValues[5];
                CHUDMain.UIElements.LCharacterHeal.setLabelText(
                  healing === 0 ? "N/A" : healing,
                );

                //if character level is maxed
                if (
                  selectedCharacterCurrentLevel >=
                  selectedCharacterBlobDictionary.maxLevel
                ) {
                  CHUDMain.UIElements.LCharacterUpgradeCost.setLabelText("N/A");
                  CHUDMain.UIElements.BUpgradeCharacter.setLabelText(
                    "MAXED LV",
                  );
                } else {
                  //character and upgrade costs
                  const characterUpgradeAndDeploymentCost =
                    selectedCharacterBlobDictionary.goldCoins *
                    selectedCharacterBlobDictionary.currentLevel;

                  CHUDMain.UIElements.LCharacterUpgradeCost.setLabelText(
                    characterUpgradeAndDeploymentCost,
                    true,
                  );
                  CHUDMain.UIElements.LCharacterDeploymentCost.setLabelText(
                    characterUpgradeAndDeploymentCost,
                    true,
                  );
                }

                //update tinted canvas for walkpaths
                WPTop.setCurrentCharacterTintedDefaultImageCanvasRef(
                  selectedCharacterBlobDictionary.tintedDefaultImage,
                );
                WPMiddle.setCurrentCharacterTintedDefaultImageCanvasRef(
                  selectedCharacterBlobDictionary.tintedDefaultImage,
                );
                WPBottom.setCurrentCharacterTintedDefaultImageCanvasRef(
                  selectedCharacterBlobDictionary.tintedDefaultImage,
                );
              }
            }
          };

          CHUDMain.updateCurrentGoldCoinsLabel = () => {
            CHUDMain.UIElements.LCurrentGoldCoins.setLabelText(
              this.goldCoins,
              true,
            );
          };

          CHUDMain.updateCurrentTotalUnitsLabel = () => {
            console.log("current total units: ", this.currentTotalUnits);
            CHUDMain.UIElements.LCurrentTotalUnits.setLabelText(
              `${this.currentTotalUnits}/${this.maxTotalUnits}`,
            );
          };

          //upgrade character button
          const IMCharacterUpgradeButton = await loadImage(
            "/DefenseMarchCassette/Images/characterUpgradeButton.png",
          );
          const BTNUpgradeCharacter = new Button(
            "BTNUpgradeCharacter",
            229,
            253,
            148.33,
            18.33,
            null,
            IMCharacterUpgradeButton,
            "Upgrade",
          );
          BTNUpgradeCharacter.updateLabelTextData(
            235,
            255.83,
            82,
            13,
            "Upgrade",
            defaultTextAlignment,
            defaultSecondaryFontColor,
            12,
            defaultFontFamily,
          );

          BTNUpgradeCharacter.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
          };

          BTNUpgradeCharacter.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
          };

          BTNUpgradeCharacter.onClick = () => {
            //the upgrade should not work for the current pawns on field, it should only be affecting the new generated pawns
            const selectedCharacter = CHUDMain.UIElements.SelectedCharacter;
            if (selectedCharacter) {
              const actorBlobDictionary =
                this.pawnActorsBlobDictionary[selectedCharacter.elementName];
              if (actorBlobDictionary) {
                if (
                  actorBlobDictionary.currentLevel <
                  actorBlobDictionary.maxLevel
                ) {
                  const actorCost =
                    actorBlobDictionary.currentLevel *
                    actorBlobDictionary.goldCoins;

                  if (this.goldCoins - actorCost >= 0) {
                    this.goldCoins -= actorCost;
                    actorBlobDictionary.currentLevel += 1;

                    CHUDMain.updateCharacterStatsAndCostsLabels();
                    CHUDMain.updateCurrentGoldCoinsLabel();
                  } else {
                    console.log("insufficient gold to upgrade the character.");
                  }
                } else {
                  console.log("unable to upgrade, character is at max level.");
                }
              }
            }
          };

          CHUDMain.addUIElement(BTNUpgradeCharacter);

          //current gold coins banner and current units banner
          const IMGeneralBanner = await loadImage(
            "/DefenseMarchCassette/Images/generalBanner.png",
          );
          const ICurrentGoldCoinsBanner = new UImage(
            "ICurrentGoldCoinsBanner",
            32.91,
            10.78,
            108,
            40,
            null,
            0,
            0,
            false,
            IMGeneralBanner,
          );
          const ICurrentUnitsBanner = new UImage(
            "ICurrentUnitsBanner",
            151.54,
            10.78,
            108,
            40,
            null,
            0,
            0,
            false,
            IMGeneralBanner,
          );

          CHUDMain.addUIElement(ICurrentGoldCoinsBanner);
          CHUDMain.addUIElement(ICurrentUnitsBanner);

          //gold coin icons and their respective value labels
          const IMGoldCoinIcon = await loadImage(
            "/DefenseMarchCassette/Images/goldCoinIcon.png",
          );

          const ICUCGoldCoinIcon = new UImage(
            "ICUCGoldCoinIcon",
            327.67,
            255.67,
            12,
            12,
            null,
            0,
            0,
            false,
            IMGoldCoinIcon,
          );
          const LCharacterUpgradeCost = new Label(
            "LCharacterUpgradeCost",
            342,
            255.67,
            36.5,
            12,
            100,
            defaultTextAlignment,
            defaultGoldCoinValueColor,
            10,
            defaultFontFamily,
            false,
            null,
          );

          const ICDCGoldCoinIcon = new UImage(
            "ICDCGoldCoinIcon",
            102.65,
            262.25,
            7,
            7,
            null,
            0,
            0,
            false,
            IMGoldCoinIcon,
          );
          const LCharacterDeploymentCost = new Label(
            "LCharacterDeploymentCost",
            114,
            260.17,
            30,
            12,
            100,
            defaultTextAlignment,
            defaultGoldCoinValueColor,
            10,
            defaultFontFamily,
            false,
            null,
          );

          const ICurrentGoldCoinIcon = new UImage(
            "ICurrentGoldCoinIcon",
            54.6,
            25.5,
            16,
            16,
            null,
            0,
            0,
            false,
            IMGoldCoinIcon,
          );

          //the textAlign from context is not really the text alignment we think it is, it's more like the alignment for the textbox itself
          //for the text to start from right to left, we have to either:
          //context2d.direction = "rtl";
          //OR
          //context2d.textAlign = "end"; <- actual right alignment if direction is ltr  (have to offset the dx as the "textbox" doesn't move)
          const LCurrentGoldCoins = new Label(
            "LCurrentGoldCoins",
            117.5,
            25.1,
            44.5,
            19,
            this.goldCoins,
            "end",
            defaultMainFontColor,
            17,
            defaultFontFamily,
            false,
            null,
          );

          CHUDMain.addUIElement(ICUCGoldCoinIcon);
          CHUDMain.addUIElement(LCharacterUpgradeCost);

          CHUDMain.addUIElement(ICDCGoldCoinIcon);
          CHUDMain.addUIElement(LCharacterDeploymentCost);

          CHUDMain.addUIElement(ICurrentGoldCoinIcon);
          CHUDMain.addUIElement(LCurrentGoldCoins);

          //current units icon and label
          const IMHelmetIcon = await loadImage(
            "/DefenseMarchCassette/Images/helmetIcon.png",
          );
          const IUnitIcon = new UImage(
            "IUnitIcon",
            172.5,
            27,
            16,
            16,
            null,
            0,
            0,
            false,
            IMHelmetIcon,
          );
          const LCurrentTotalUnits = new Label(
            "LCurrentTotalUnits",
            190,
            26.33,
            49.5,
            19,
            `${this.currentTotalUnits}/${this.maxTotalUnits}`,
            defaultTextAlignment,
            defaultMainFontColor,
            17,
            defaultFontFamily,
            false,
            null,
          );

          CHUDMain.addUIElement(IUnitIcon);
          CHUDMain.addUIElement(LCurrentTotalUnits);

          //temporarily use a fixed width and height defined here
          const blockWidth = 485;
          const blockHeight = 32.5;
          //characters walkpath blocks
          const WPTop = new WalkPath(
            "WPTop",
            0,
            this.allySummonLocations[0].y - 30,
            blockWidth,
            blockHeight,
            defaultBlockPathColor,
            true,
            null,
          );
          const WPMiddle = new WalkPath(
            "WPMiddle",
            0,
            this.allySummonLocations[1].y - 30,
            blockWidth,
            blockHeight,
            defaultBlockPathColor,
            true,
            null,
          );
          const WPBottom = new WalkPath(
            "WPBottom",
            0,
            this.allySummonLocations[2].y - 30,
            blockWidth,
            blockHeight,
            defaultBlockPathColor,
            true,
            null,
          );

          WPTop.setOpacity(0);
          WPMiddle.setOpacity(0);
          WPBottom.setOpacity(0);

          WPTop.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
            WPTop.setOpacity(1);
            WPTop.isFocused = true;
          };
          WPTop.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
            WPTop.setOpacity(0);
            WPTop.isFocused = false;
          };
          WPTop.onClick = () => {
            this._setKeyValue("p", true);
          };

          WPMiddle.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
            WPMiddle.setOpacity(1);
            WPMiddle.isFocused = true;
          };
          WPMiddle.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
            WPMiddle.setOpacity(0);
            WPMiddle.isFocused = false;
          };
          WPMiddle.onClick = () => {
            this._setKeyValue("p", true);
          };

          WPBottom.onPointerEnter = () => {
            this.contentCanvas.dataset.hoverable = "pointer";
            WPBottom.setOpacity(1);
            WPBottom.isFocused = true;
          };
          WPBottom.onPointerLeave = () => {
            this.contentCanvas.dataset.hoverable = "default";
            WPBottom.setOpacity(0);
            WPBottom.isFocused = false;
          };
          WPBottom.onClick = () => {
            this._setKeyValue("p", true);
          };

          CHUDMain.addUIElement(WPTop);
          CHUDMain.addUIElement(WPMiddle);
          CHUDMain.addUIElement(WPBottom);

          //create tinted character still image (idle frame 0) on offscreen canvas for each character
          for (const characterData of Object.values(
            this.pawnActorsBlobDictionary,
          )) {
            if (characterData.targetType === "ally") {
              const spritesheetOffset =
                characterData.animations.idle.right.frames[0].spritesheetOffset;
              const canvas = new OffscreenCanvas(
                spritesheetOffset.width,
                spritesheetOffset.height,
              );
              const context2d = canvas.getContext("2d");

              context2d.save();
              context2d.drawImage(
                characterData.animationBlobs.idle,
                spritesheetOffset.x,
                spritesheetOffset.y,
                spritesheetOffset.width,
                spritesheetOffset.height,
                0,
                0,
                spritesheetOffset.width,
                spritesheetOffset.height,
              );
              context2d.globalCompositeOperation = "source-atop";
              context2d.fillStyle = defaultBlockPathColor;
              context2d.fillRect(
                0,
                0,
                spritesheetOffset.width,
                spritesheetOffset.height,
              );
              context2d.restore();

              characterData.tintedDefaultImage = canvas;
            }
          }

          //run updateCharacterStatsAndCostsLabels once to rewrite the default values
          CHUDMain.updateCharacterStatsAndCostsLabels();

          break;
      }

      //Initial draw
      this.isActive = true;
      this.drawContentCanvas();

      this.initWebSocket();
      this.initButtons();
    } catch (err) {
      console.log("stack trace: ", err.stack);
      throw new Error(err);
    }
  }

  resetStates() {
    this.cassetteIndex = null;
    this.cassetteName = null;
    this.userId = null;
    this.isActive = false;

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      q: false,
      e: false,
      p: false,
      l: false,
    };

    this.signalsTransmitter = null;
    this.signalsManager = null;

    this.resetButtons();

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    if (this.contentCanvas) {
      this.contentCanvas.getContext("2d").reset();
      this.setupInnerContextForContentCanvas();
    }

    this.gameMapBackground = null;
    this.gameRootHUD = null;

    this.currentCursorOverlappedUIElement = null;

    this.cameraPosition = { x: 0, y: 0 };
    this.cursorPosition = { x: 0, y: 0 };

    this.selectedObject = null;

    this.mapCollisions = [];
    this.mapJumpTriggers = [];
    this.mapSoundTriggers = [];

    this.pawnActorsBlobDictionary = {};
    this.actorSoundsBlobDictionary = {};

    this.tileActorsBlobDictionary = {};
    this.tileSoundsBlobDictionary = {};

    this.playerActor = null;
    this.allyPawnActors = [];
    this.enemyPawnActors = [];

    this.tileActors = [];

    //collisions that spawn from animation
    this.spawnCollisions = [];

    //actors that spawn from animation
    this.spawnActors = [];

    //array containing all types of actors that are sorted by y position
    this.allActorsSortedByY = [];

    this.allySummonLocations = [];
    this.enemySummonLocations = [];
    this.goldCoins = 0;
    this.currentTotalUnits = 0;
    this.maxTotalUnits = 50;
    this.currentWave = 1;
    this.maxWaves = 100;

    this.processTick_CassetteSpecific = null;
    this.currentGameTick = 0;
    this.latestDataFromServer = null;

    this.gameMapBackgroundCanvasBaseWidth = 0;
    this.gameMapBackgroundCanvasBaseHeight = 0;
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
        this.contentCanvas.height,
      );
    }
  }

  drawContentCanvas() {
    /** @type {CanvasRenderingContext2D} */
    const context2d = this.contentCanvas?.getContext("2d");

    try {
      if (context2d) {
        //draw gameMapBackground first
        if (this.gameMapBackground) {
          context2d.drawImage(
            this.gameMapBackground,
            this.cameraPosition.x,
            this.cameraPosition.y,
            this.contentCanvas.width,
            this.contentCanvas.height,
            0,
            0,
            this.contentCanvas.width,
            this.contentCanvas.height,
          );
        }

        const renderLastTileActors = [];

        //draw all other actors
        this.allActorsSortedByY.forEach((actor) => {
          //if actor is a TileActor, right now only tileActor has the property of renderLast
          if (actor.tiles) {
            if (actor.renderLast) {
              renderLastTileActors.push(actor);
            } else {
              /** @type {ImageBitmap} */
              const tileBitmap =
                this.tileActorsBlobDictionary[actor.currentRenderData.tileGid];
              //offset camera position as the actor.position is world space position
              context2d.drawImage(
                tileBitmap,
                actor.position.dx - this.cameraPosition.x,
                actor.position.dy - this.cameraPosition.y,
              );
            }
          }
          //PawnActor - future add-on: handle spawnActors...
          else {
            /** @type {ImageBitmap} */
            const actorBitmap =
              this.pawnActorsBlobDictionary[actor.actorName]?.animationBlobs?.[
                actor.currentRenderData.animationSpritesheetName
              ];

            const currentFrameData =
              actor.currentRenderData?.frameData?.spritesheetOffset;
            //actorCanvas is a canvas of an animation that includes all the direction, use frameData to offset to the correct section
            //frameData example:
            //  {
            //   "spritesheetOffset": {
            //     "x": 0,
            //     "y": 32,
            //     "width": 32,
            //     "height": 32
            //   },
            //   "duration": 290,
            //   "collisions": []
            // }

            //TO-DO: the drawImage method from context draw from top to bottom
            //move the summon location up
            //now only the top path has the summon feature done, do it for the rest walk path too...
            if (actorBitmap) {
              context2d.drawImage(
                actorBitmap,
                currentFrameData.x,
                currentFrameData.y,
                currentFrameData.width,
                currentFrameData.height,
                actor.position.dx - this.cameraPosition.x,
                actor.position.dy -
                  this.cameraPosition.y -
                  currentFrameData.height,
                currentFrameData.width,
                currentFrameData.height,
              );
            }
          }
        });

        if (this.gameRootHUD) {
          this.gameRootHUD.drawHUDs(context2d);
        }

        renderLastTileActors.forEach((actor) => {
          /** @type {ImageBitmap} */
          const tileBitmap =
            this.tileActorsBlobDictionary[actor.currentRenderData.tileGid];

          //offset camera position as the actor.position is world space position
          context2d.drawImage(
            tileBitmap,
            actor.position.dx - this.cameraPosition.x,
            actor.position.dy - this.cameraPosition.y,
          );
        });
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

  async convertBlobToBitmap(base64BlobString) {
    const binaryString = atob(base64BlobString);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);

    return bitmap;
  }

  async initRawStatesData(rawStatesData) {
    if (rawStatesData.userId) {
      this.userId = rawStatesData.userId;
    }

    this.goldCoins = rawStatesData.goldCoins;

    const createPawnActorFromRawStates = (rawActorStates) => {
      const pawnActor = PawnActor.constructExistingActor(
        rawActorStates.tempId,
        rawActorStates.actorName,
        rawActorStates.position,
        rawActorStates.actorState,
        rawActorStates.actorCurrentStats,
        rawStatesData.pawnActorsBlobDictionary[rawActorStates.actorName],
        rawActorStates.currentLevel,
        rawActorStates.maxLevel,
        rawActorStates.collision,
        rawActorStates.selectable,
      );

      pawnActor.facingDirection = rawActorStates.facingDirection;

      return pawnActor;
    };

    if (rawStatesData.playerActor) {
      this.playerActor = createPawnActorFromRawStates(
        rawStatesData.playerActor,
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
            rawActorStates.renderLast,
            rawActorStates.selectable,
          ),
        );
      });
    }

    this.selectedObject = rawStatesData.selectedObject;

    this.cameraPosition = rawStatesData.cameraPosition;
    this.cursorPosition = rawStatesData.cursorPosition;

    this.gameMapBackground = await this.convertBlobToBitmap(
      rawStatesData.gameMapBackgroundBlob,
    ).catch((err) => null);

    if (this.gameMapBackground) {
      this.gameMapBackgroundCanvasBaseWidth = this.gameMapBackground.width;
      this.gameMapBackgroundCanvasBaseHeight = this.gameMapBackground.height;
    }

    this.mapCollisions = [...rawStatesData.mapCollisions];
    this.mapJumpTriggers = [...rawStatesData.mapJumpTriggers];

    if (this.cassetteName) {
      rawStatesData.mapSoundTriggers.forEach((trigger) => {
        this.mapSoundTriggers.push({
          actionToTrigger: trigger.actionToTrigger,
          filename: trigger.filename,
          priority: trigger.priority,
          active: trigger.active,
          target: trigger.target,
          dx: trigger.dx,
          dy: trigger.dy,
          width: trigger.width,
          height: trigger.height,
        });

        //only add once, don't need to add if they are already exist
        if (
          !this.tileSoundsBlobDictionary[trigger.actionToTrigger]?.[
            trigger.filename
          ]
        ) {
          const audios = [];
          for (let i = 0; i < trigger.totalVariations; i++) {
            const audio = new Audio(
              `/${this.cassetteName}/TilesSFX/${trigger.actionToTrigger}/${trigger.filename}/${i}.wav`,
            );
            audios.push(audio);
          }

          this.tileSoundsBlobDictionary[trigger.actionToTrigger] = {
            ...this.tileSoundsBlobDictionary[trigger.actionToTrigger],
            [trigger.filename]: {
              audios: audios,
            },
          };
        }
      });

      this.mapSoundTriggers.sort((triggerA, triggerB) => {
        return triggerA.priority - triggerB.priority;
      });
    }

    const actorNames = Object.keys(rawStatesData.pawnActorsBlobDictionary);

    if (actorNames) {
      const entries = await Promise.all(
        actorNames.map(async (actorName) => {
          // defaultActorImage: null,
          // animations: {},
          // animationBlobs: {},
          // selectable: false,
          // targetType: "all",
          // defaultStats: {},
          // motionValues: [],
          // maxLevel: 99
          // currentLevel: 1

          const blobStruct = {
            ...rawStatesData.pawnActorsBlobDictionary[actorName],
          };

          await this.initActorAudios(actorName, "jump");
          await this.initActorAudios(actorName, "receiveDamage");
          await this.initActorAudios(actorName, "attack1");
          await this.initActorAudios(actorName, "attack2");
          await this.initActorAudios(actorName, "attack3");
          await this.initActorAudios(actorName, "heal");

          if (blobStruct.defaultActorImage) {
            blobStruct.defaultActorImage = await this.convertBlobToBitmap(
              actorBlobDictionary.defaultActorImage,
            );
          }

          if (blobStruct.animationBlobs) {
            const animationNames = Object.keys(blobStruct.animationBlobs);

            const entries = await Promise.all(
              animationNames.map(async (animationName) => {
                const animationBitmap = await this.convertBlobToBitmap(
                  blobStruct.animationBlobs[animationName],
                );

                return [animationName, animationBitmap];
              }),
            );

            entries.forEach(([animationName, animationBitmap]) => {
              blobStruct.animationBlobs[animationName] = animationBitmap;
            });
          }

          return [actorName, blobStruct];
        }),
      );

      entries.forEach(([actorName, blobStruct]) => {
        this.pawnActorsBlobDictionary[actorName] = blobStruct;
      });

      console.log("pawnActorsBlobDictionary: ", this.pawnActorsBlobDictionary);
    }

    const tileGids = Object.keys(rawStatesData.tileActorsBlobDictionary);

    if (tileGids) {
      const entries = await Promise.all(
        tileGids.map(async (tileGid) => {
          const tileCanvas = await this.convertBlobToBitmap(
            rawStatesData.tileActorsBlobDictionary[tileGid],
          );

          return [tileGid, tileCanvas];
        }),
      );

      entries.forEach(([tileGid, tileCanvas]) => {
        this.tileActorsBlobDictionary[tileGid] = tileCanvas;
      });
    }

    //for DefenseMarch
    this.allySummonLocations = rawStatesData.allySummonLocations;
    this.enemySummonLocations = rawStatesData.enemySummonLocations;

    console.log("ally summon locations: ", this.allySummonLocations);
    console.log("enemy summon locations: ", this.enemySummonLocations);
  }

  initWebSocket() {
    //connect to websocket
    this.webSocket = new WebSocket(
      `${import.meta.env.VITE_WS_CONNECTION}//${
        import.meta.env.VITE_ORIGIN_WITHOUT_HTTP
      }/cassetteSocket?userId=${this.userId}`,
      `cassette-${this.cassetteIndex}`,
    );

    if (this.webSocket) {
      /** @type {WebSocket} */
      const ws = this.webSocket;

      ws.onopen = (event) => {
        this.sendMessageToServer(SocketMessageTypes.log, "hello from client.");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        //perform reconciliation...
        if (data.type === SocketMessageTypes.clientPayload) {
          //store the result instead of reconcile immediately
          this.latestDataFromServer = data;
        }

        if (data.type === SocketMessageTypes.userSignalResponse) {
          if (
            data.value.message.signal === DefenseMarchSignalTypes.summonOnWP
          ) {
            if (!data.value.message.success) {
              const index = this.allyPawnActors.findIndex(
                (pawnActor) =>
                  pawnActor.tempId === data.value.message.requestId,
              );

              if (index !== -1) {
                //refund
                const pawnActor = this.allyPawnActors[index];
                this.goldCoins +=
                  pawnActor.currentLevel *
                  this.pawnActorsBlobDictionary[pawnActor.actorName].goldCoins;

                this.allyPawnActors.splice(index, 1);
                this.currentTotalUnits -= 1;
              }

              console.log("removing actor...");
              console.log(data.value.message.response);

              const CHUDMain = this.gameRootHUD.childHUDs.CHUDMain;

              if (CHUDMain) {
                CHUDMain.HUD?.updateCurrentGoldCoinsLabel();
                CHUDMain.HUD?.updateCurrentTotalUnitsLabel();
              }
              return;
            }

            //replace pawn actor tempId with the server entityId
            const pawnActor = this.allyPawnActors.find(
              (pawnActor) => pawnActor.tempId === data.value.message.requestId,
            );
            if (pawnActor) {
              console.log("actor old id: ", pawnActor.tempId);
              pawnActor.tempId = data.value.message.entityId;
              console.log("actor new id: ", pawnActor.tempId);
              console.log(data.value.message.response);
            }
          }
        }
      };
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

    allButtons.forEach((button) => {
      if (button) {
        this.pointerEvents.forEach((eventName) => {
          button.addEventListener(eventName, this.setKeyActiveBound);
        });
      }
    });

    //key events
    this.keyEvents.forEach((eventName) => {
      this.consoleSvgRef.current.addEventListener(
        eventName,
        this.setKeyActiveBound,
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

    allButtons.forEach((button) => {
      if (button) {
        this.pointerEvents.forEach((eventName) => {
          button.removeEventListener(eventName, this.setKeyActiveBound);
        });
      }
    });

    //key events
    if (!this.consoleSvgRef.current) return;

    this.keyEvents.forEach((eventName) => {
      this.consoleSvgRef.current.removeEventListener(
        eventName,
        this.setKeyActiveBound,
      );
    });
  }

  _setKeyValue(key, value) {
    this.keys[key] = value;
  }

  /** @param {Event} event */
  setKeyActive(event) {
    if (this.webSocket?.readyState != WebSocket.OPEN) return;

    //for pointer events
    if (this.pointerEvents.includes(event.type)) {
      if (event.pointerType === "mouse" && event.button > 0) return;
      if (event.currentTarget) {
        let value = false;
        if (event.type === "pointerdown") {
          value = true;
        }
        this._setKeyValue(event.currentTarget.dataset.buttonKeyName, value);
      }
    }
    //for key events
    else if (this.keyEvents.includes(event.type)) {
      let value = false;
      if (event.type === "keydown") {
        value = true;
      }
      this._setKeyValue(event.key, value);
    }
  }

  _checkAndTriggerWalkingStepSound(actor) {
    if (actor.actorState != CharacterStateTypes.walking) return;

    this.mapSoundTriggers.some((trigger) => {
      if (PawnActorIsOnTrigger(actor, trigger)) {
        //console.log("is within sound trigger...", trigger.filename);
        const audios =
          this.tileSoundsBlobDictionary[trigger.actionToTrigger]?.[
            trigger.filename
          ]?.audios;
        if (audios) {
          this.playAudioRandomWithRandomVolume(audios);
        }
        return true;
      }
    });
  }

  processTick_CassetteGeneral() {
    //check for sound triggers, can make use of the CollisionsDectector.js to check for the bounds
    if (this.playerActor) {
      this._checkAndTriggerWalkingStepSound(this.playerActor);
    }

    this.allyPawnActors.forEach((actor) => {
      this._checkAndTriggerWalkingStepSound(actor);
    });

    this.enemyPawnActors.forEach((actor) => {
      this._checkAndTriggerWalkingStepSound(actor);
    });
  }

  playAudio(audios, audioInstanceIndex, volume = 1.0) {
    const audio = audios[audioInstanceIndex];

    if (audio) {
      audio.volume = volume;
      audio.play();
    }
  }

  playAudioRandom(audios, volume = 1.0) {
    const max = audios.length - 1;
    const index = Math.round(Math.random() * (max - 0)) + 0;

    const audio = audios[index];

    if (audio) {
      audio.volume = volume;
      audio.play();
    }
  }

  playAudioRandomWithRandomVolume(audios) {
    const max = audios.length - 1;
    const index = Math.round(Math.random() * (max - 0)) + 0;
    const volume = Math.random() * (0.7 - 0.5) + 0.5;

    const audio = audios[index];
    if (audio) {
      audio.volume = volume;
      audio.play();
    }
  }

  reconcileDataFromServer() {
    if (!this.latestDataFromServer) return false;

    let shouldNotAcceptNewInput = true;

    const acceptedSquaredDiscrepancy = 4; //5 pixels distance, we use the formula of a^2 * b^2 = c^2

    if (
      this.getDistanceSqBetween(
        this.cameraPosition,
        this.latestDataFromServer.value.message.cameraPosition,
        "camera",
      ) > acceptedSquaredDiscrepancy
    ) {
      this.cameraPosition =
        this.latestDataFromServer.value.message.cameraPosition;
    }

    //do cursor position later...

    this.selectedObject = this.selectedObject;

    if (
      this.getDistanceSqBetween(
        this.playerActor.position,
        this.latestDataFromServer.value.message.playerActor.position,
      ) > acceptedSquaredDiscrepancy
    ) {
      this.playerActor.position = this.lerpPosition(
        this.playerActor.position,
        this.latestDataFromServer.value.message.playerActor.position,
        0.1,
      );
    } else {
      this.playerActor.position =
        this.latestDataFromServer.value.message.playerActor.position;
      shouldNotAcceptNewInput = false;
    }

    //TO-DO: see if we have to reconcile these data from PawnActor as well...
    //"actorState": "idling",
    // "facingDirection": "right",
    // "activeStateAnimationName": "idle",
    // "activeAbilityName": null,

    //for data like health and etc, replace without checking
    this.playerActor.actorCurrentStats =
      this.latestDataFromServer.value.message.playerActor.actorCurrentStats;
    this.playerActor.currentLevel =
      this.latestDataFromServer.value.message.playerActor.currentLevel;

    this.allyPawnActors.forEach((actor, index) => {
      const currentAllyPawnActor = this.allyPawnActors[index];
      const serializedActorDataFromServer =
        this.latestDataFromServer.value.message.allyPawnActors.find(
          (serializedActorData) => serializedActorData.tempId === actor.tempId,
        );
      if (serializedActorDataFromServer) {
        if (
          this.getDistanceSqBetween(
            this.allyPawnActors[index].position,
            serializedActorDataFromServer.position,
          ) > acceptedSquaredDiscrepancy
        ) {
          console.log("reconciling allyPawnActor position...");
          currentAllyPawnActor.position = this.lerpPosition(
            currentAllyPawnActor.position,
            serializedActorDataFromServer.position,
            0.1,
          );
        } else {
          currentAllyPawnActor.position =
            serializedActorDataFromServer.position;
          shouldNotAcceptNewInput = false;
        }

        currentAllyPawnActor.actorCurrentStats =
          serializedActorDataFromServer.actorCurrentStats;
        currentAllyPawnActor.currentLevel =
          serializedActorDataFromServer.currentLevel;
      }
    });

    this.enemyPawnActors.forEach((actor, index) => {
      const currentEnemyPawnActor = this.enemyPawnActors[index];
      const serializedActorDataFromServer =
        this.latestDataFromServer.value.message.enemyPawnActors.find(
          (serializedActorData) => serializedActorData.tempId === actor.tempId,
        );
      if (serializedActorDataFromServer) {
        if (
          this.getDistanceSqBetween(
            this.enemyPawnActors[index].position,
            serializedActorDataFromServer.position,
          ) > acceptedSquaredDiscrepancy
        ) {
          console.log("reconciling enemyPawnActor position...");
          currentEnemyPawnActor.position = this.lerpPosition(
            currentEnemyPawnActor.position,
            serializedActorDataFromServer.position,
            0.1,
          );
        } else {
          currentEnemyPawnActor.position =
            serializedActorDataFromServer.position;
          shouldNotAcceptNewInput = false;
        }

        currentEnemyPawnActor.actorCurrentStats =
          serializedActorDataFromServer.actorCurrentStats;
        currentEnemyPawnActor.currentLevel =
          serializedActorDataFromServer.currentLevel;
      }
    });

    return shouldNotAcceptNewInput;
  }

  lerpPosition(positionA, positionB, alpha, dimension = "both") {
    let lerpedPosition;
    if (dimension === "x") {
      lerpedPosition = {
        dx: positionA.dx + (positionB.dx - positionA.dx) * alpha,
        dy: positionA.dy,
      };
    } else if (dimension === "y") {
      lerpedPosition = {
        dx: positionA.dx,
        dy: positionA.dy + (positionB.dy - positionA.dy) * alpha,
      };
    } else {
      lerpedPosition = {
        dx: positionA.dx + (positionB.dx - positionA.dx) * alpha,
        dy: positionA.dy + (positionB.dy - positionA.dy) * alpha,
      };
    }

    return lerpedPosition;
  }

  //Squared version, as Math.sqrt is quite a non negligible computation under tons of loads
  getDistanceSqBetween(positionA, positionB, positionFrom = "actors") {
    let x_diff;
    let y_diff;

    if (positionFrom === "camera") {
      x_diff = positionA.x - positionB.x;
      y_diff = positionA.y - positionB.y;
    } else {
      x_diff = positionA.dx - positionB.dx;
      y_diff = positionA.dy - positionB.dy;
    }

    return x_diff * x_diff + y_diff * y_diff;
  }

  sortAllActorsByY() {
    this.allActorsSortedByY = this.playerActor ? [this.playerActor] : [];
    this.allActorsSortedByY = [
      ...this.allActorsSortedByY,
      ...this.allyPawnActors,
      ...this.enemyPawnActors,
      ...this.tileActors,
    ];
    this.allActorsSortedByY.sort((a, b) => {
      return a.position.y - b.position.y;
    });
  }

  sendMessageToServer(messageType, message = "") {
    if (this.webSocket?.readyState != WebSocket.OPEN) return;

    const packagedSocketMessage = JSON.stringify(
      packageSocketMessageForSingleUser(
        this.cassetteIndex,
        messageType,
        this.userId,
        message,
      ),
    );
    this.webSocket.send(packagedSocketMessage);
  }

  /** @param {Actor} actor */
  moveCameraToActor(actor) {
    this.cameraPosition.x =
      actor.position.dx - this.contentCanvasDisplayWidth / 2;
    this.cameraPosition.y =
      actor.position.dy - this.contentCanvasDisplayHeight / 2;
  }

  sanitizeCameraPosition = (printConsole = false) => {
    let screenWidth = this.contentCanvasDisplayWidth;
    let screenHeight = this.contentCanvasDisplayHeight;

    //if the camera is on the edge of the map
    if (this.cameraPosition.x < 0) {
      this.cameraPosition.x = 0;
    } else if (
      this.cameraPosition.x + screenWidth >=
      this.gameMapBackground.width
    ) {
      this.cameraPosition.x = this.gameMapBackground.width - screenWidth;
    }

    if (this.cameraPosition.y < 0) {
      this.cameraPosition.y = 0;
    } else if (
      this.cameraPosition.y + screenHeight >=
      this.gameMapBackground.height
    ) {
      this.cameraPosition.y = this.gameMapBackground.height - screenHeight;
    }

    if (printConsole) {
      console.log("game map canvas width: ", this.gameMapBackground.width);
      console.log("new sanitized camera x: ", this.cameraPosition.x);
    }
  };

  async initActorAudios(actorName, stateOrAbilityName) {
    //init character audio here as well...
    //the audio blob structure should be characterName: {stateAnimationName/abilityName: audios[]}

    //check how many files are in the folder
    let totalAudios = await fetch(
      `/${this.cassetteName}/CharactersSFX/${actorName}/${stateOrAbilityName}/length.txt`,
    );

    if (!totalAudios.ok) {
      console.log(
        "unable to read totalAudios from ",
        actorName,
        " of state/ability named ",
        stateOrAbilityName,
      );
    } else {
      totalAudios = parseInt(await totalAudios.text());

      if (isNaN(totalAudios)) {
        // console.log(
        //   "unable to parse totalAudios to integer, actor: ",
        //   actorName,
        //   "state/ability name: ",
        //   stateOrAbilityName
        // );
      } else {
        const audios = [];

        for (let i = 0; i < totalAudios; i++) {
          const audio = new Audio(
            `/${this.cassetteName}/CharactersSFX/${actorName}/${stateOrAbilityName}/${i}.wav`,
          );
          audios.push(audio);
        }

        this.actorSoundsBlobDictionary[actorName] = {
          ...this.actorSoundsBlobDictionary[actorName],
          jump: audios,
        };
      }
    }
  }
}
