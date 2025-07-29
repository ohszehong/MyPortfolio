import CharacterStateTypes from "../../shared/Standards/StringKeys/CharacterStateTypes.json";
import FacingDirections from "../../shared/Standards/StringKeys/FacingDirections.json";
import TargetTypes from "../../shared/Standards/StringKeys/TargetTypes.json";
import CollisionTypes from "../../shared/Standards/StringKeys/CollisionTypes.json";
import SocketMessageTypes from "../../shared/Standards/StringKeys/SocketMessageTypes.json";

import PawnActor from "../../shared/Actors/PawnActor";
import TileActor from "../../shared/Actors/TileActor";

import IntroCassetteKeysHandler from "./InputCheckers/IntroCassetteButtonsInputChecker";
import DefenseMarchKeysHandler from "./InputCheckers/DefenseMarchCassetteButtonsInputChecker";

import {
  AIsCollidedWithB,
  PawnActorIsOnTrigger,
} from "../../shared/CollisionsDetector/CollisionsDetector";
import processTick_General from "../../shared/TickProcess/processTick_General";

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

  keysHandler = null;

  /** @type {{current: SVGElement}} */
  consoleSvgRef = null;

  /** @type {Websocket} */
  webSocket = null;

  /** @type {HTMLCanvasElement} */
  contentCanvas = null;

  //for background tiles that don't have animation or not participate in y ordering
  /** @type {OffscreenCanvas} */
  gameMapBackground = null;

  //for processTick_General
  gameMapBackgroundCanvasBaseWidth = 0;
  gameMapBackgroundCanvasBaseHeight = 0;

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

  //for DefenseMarchCassette
  allySummonLocations = [];
  enemySummonLocations = [];

  //for gameLoop specific to a cassette
  processTick_CassetteSpecific = null;

  constructor(consoleSvgRef, buttonsRef) {
    this.consoleSvgRef = consoleSvgRef;
    this.buttonsRef = buttonsRef;

    this.contentCanvas = document.createElement("canvas");
    this.contentCanvas.width = 480;
    this.contentCanvas.height = 280;

    this.setKeyActiveBound = this.setKeyActive.bind(this);
  }

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
            this.keysHandler();

            processTick_General(this, this.FIXED_DELTA_TIME_FROM_SERVER);

            this.processTick_CassetteGeneral();
            this.processTick_CassetteSpecific();
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
      (collision) => collision.collisionType === CollisionTypes.blockCollision
    );

    let mapBlockCollisions = this.mapCollisions.filter(
      (collision) => collision.collisionType === CollisionTypes.blockCollision
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
        "invalid cassette index, please try with valid cassette index."
      );
      return;
    }

    this.cassetteIndex = cassetteIndex;

    switch (this.cassetteIndex) {
      case 0:
        this.cassetteName = "IntroCassette";
        this.keysHandler = IntroCassetteKeysHandler.bind(this);

        this.processTick_CassetteSpecific = () => {
          //check for mapJumpTriggers with playerActor
          if (this.playerActor.actorState != CharacterStateTypes.jumping) {
            this.mapJumpTriggers.some((trigger) => {
              if (PawnActorIsOnTrigger(this.playerActor, trigger)) {
                if (
                  this.playerActor.facingDirection === trigger.jumpDirection &&
                  this.playerActor.actorState ===
                    trigger.actionToTrigger + "ing"
                ) {
                  console.log("is within jump trigger...");
                  this.playerActor.toJumpState(trigger.jumpMagnitude);

                  const audios = this.actorSoundsBlobDictionary[this.playerActor.actorName]?.jump;
                  if(audios)
                  {
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
        this.cassetteName = "DefenseMarchCassette";
        this.keysHandler = DefenseMarchKeysHandler.bind(this);
        break;
    }

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
        //console.log("response data: ", response.data);

        //initialize states data
        await this.initRawStatesData(response.data);

        //sort all the actors by y position
        this.sortAllActorsByY();
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

    this.keysHandler = null;

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
            this.contentCanvas.height
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
              /** @type {OffscreenCanvas} */
              const tileCanvas =
                this.tileActorsBlobDictionary[actor.currentRenderData.tileGid];

              //offset camera position as the actor.position is world space position
              context2d.drawImage(
                tileCanvas,
                actor.position.dx - this.cameraPosition.x,
                actor.position.dy - this.cameraPosition.y
              );
            }
          }
          //PawnActor - future add-on: handle spawnActors...
          else {
            /** @type {OffscreenCanvas} */
            const actorCanvas =
              this.pawnActorsBlobDictionary[actor.actorName]?.animation?.[
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

            if (actorCanvas) {
              context2d.drawImage(
                actorCanvas,
                currentFrameData.x,
                currentFrameData.y,
                currentFrameData.width,
                currentFrameData.height,
                actor.position.dx - this.cameraPosition.x,
                actor.position.dy - this.cameraPosition.y,
                currentFrameData.width,
                currentFrameData.height
              );
            }
          }
        });

        renderLastTileActors.forEach((actor) => {
          /** @type {OffscreenCanvas} */
          const tileCanvas =
            this.tileActorsBlobDictionary[actor.currentRenderData.tileGid];

          //offset camera position as the actor.position is world space position
          context2d.drawImage(
            tileCanvas,
            actor.position.dx - this.cameraPosition.x,
            actor.position.dy - this.cameraPosition.y
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

  async initRawStatesData(rawStatesData) {
    if (rawStatesData.userId) {
      this.userId = rawStatesData.userId;
    }

    const createPawnActorFromRawStates = (rawActorStates) => {
      const pawnActor = new PawnActor(
        rawActorStates.tempId,
        rawActorStates.actorName,
        rawActorStates.position,
        rawActorStates.actorDefaultStats,
        rawActorStates.actorCurrentStats,
        rawActorStates.actorState,
        rawActorStates.actorDefaultData.animation,
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
              `/${this.cassetteName}/TilesSFX/${trigger.actionToTrigger}/${trigger.filename}/${i}.wav`
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
          const actorBlobDictionary =
            rawStatesData.pawnActorsBlobDictionary[actorName];

          const blobStruct = {
            defaultActorImage: null,
            animation: {},
          };

          await this.initActorAudios(actorName, "jump");
          await this.initActorAudios(actorName, "receiveDamage");
          await this.initActorAudios(actorName, "attack1");
          await this.initActorAudios(actorName, "attack2");
          await this.initActorAudios(actorName, "attack3");
          await this.initActorAudios(actorName, "heal");

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

    //for DefenseMarch
    this.allySummonLocations = rawStatesData.allySummonLocations;
    this.enemySummonLocations = rawStatesData.enemySummonLocations;

    console.log("allySummonLocations: ", this.allySummonLocations);
    console.log("enemySummonLocations: ", this.enemySummonLocations);
  }

  initWebSocket() {
    //connect to websocket
    this.webSocket = new WebSocket(
      `${import.meta.env.VITE_WS_CONNECTION}//${
        import.meta.env.VITE_ORIGIN_WITHOUT_HTTP
      }/cassetteSocket?userId=${this.userId}`,
      `cassette-${this.cassetteIndex}`
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

    console.log("adding buttons listeners...", this.buttonsRef);
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
        this.setKeyActiveBound
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
        this.setKeyActiveBound
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
        this.latestDataFromServer.value.cameraPosition,
        "camera"
      ) > acceptedSquaredDiscrepancy
    ) {
      this.cameraPosition = this.latestDataFromServer.value.cameraPosition;
    }

    //do cursor position later...

    this.selectedObject = this.selectedObject;

    if (
      this.getDistanceSqBetween(
        this.playerActor.position,
        this.latestDataFromServer.value.playerActor.position
      ) > acceptedSquaredDiscrepancy
    ) {
      this.playerActor.position = this.lerpPosition(
        this.playerActor.position,
        this.latestDataFromServer.value.playerActor.position,
        0.1
      );
    } else {
      this.playerActor.position =
        this.latestDataFromServer.value.playerActor.position;
      shouldNotAcceptNewInput = false;
    }

    //TO-DO: see if we have to reconcile these data from PawnActor as well...
    //"actorState": "idling",
    // "facingDirection": "right",
    // "activeStateAnimationName": "idle",
    // "activeAbilityName": null,

    //for data like health and etc, replace without checking
    this.playerActor.actorCurrentStats =
      this.latestDataFromServer.value.playerActor.actorCurrentStats;
    this.playerActor.currentLevel =
      this.latestDataFromServer.value.playerActor.currentLevel;

    this.allyPawnActors.forEach((actor, index) => {
      const currentAllyPawnActor = this.allyPawnActors[index];
      const serializedActorDataFromServer =
        this.latestDataFromServer.value.allyPawnActors.find(
          (serializedActorData) => serializedActorData.tempId === actor.tempId
        );
      if (serializedActorDataFromServer) {
        if (
          this.getDistanceSqBetween(
            this.allyPawnActors[index].position,
            serializedActorDataFromServer.position
          ) > acceptedSquaredDiscrepancy
        ) {
          console.log("reconciling allyPawnActor position...");
          currentAllyPawnActor.position = this.lerpPosition(
            currentAllyPawnActor.position,
            serializedActorDataFromServer.position,
            0.1
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
        this.latestDataFromServer.value.enemyPawnActors.find(
          (serializedActorData) => serializedActorData.tempId === actor.tempId
        );
      if (serializedActorDataFromServer) {
        if (
          this.getDistanceSqBetween(
            this.enemyPawnActors[index].position,
            serializedActorDataFromServer.position
          ) > acceptedSquaredDiscrepancy
        ) {
          console.log("reconciling enemyPawnActor position...");
          currentEnemyPawnActor.position = this.lerpPosition(
            currentEnemyPawnActor.position,
            serializedActorDataFromServer.position,
            0.1
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
    this.allActorsSortedByY = [
      this.playerActor,
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

    this.webSocket.send(
      JSON.stringify({
        userId: this.userId,
        type: messageType,
        message: message,
      })
    );
  }

  /** @param {Actor} actor */
  moveCameraToActor(actor) {
    this.cameraPosition.x = actor.position.dx - this.contentCanvas.width / 2;
    this.cameraPosition.y = actor.position.dy - this.contentCanvas.height / 2;
  }

  sanitizeCameraPosition = (printConsole = false) => {
    let screenWidth = 0;
    let screenHeight = 0;

    if (this.contentCanvas) {
      screenWidth = this.contentCanvas.width;
      screenHeight = this.contentCanvas.height;
    }

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
      `/${this.cassetteName}/CharactersSFX/${actorName}/${stateOrAbilityName}/length.txt`
    );

    if (!totalAudios.ok) {
      console.log("unable to read totalAudios from ", actorName, " of state/ability named ", stateOrAbilityName);
    } else {
      totalAudios = parseInt(await totalAudios.text());

      if (isNaN(totalAudios)) {
        console.log(
          "unable to parse totalAudios to integer, actor: ",
          actorName,
          "state/ability name: ",
          stateOrAbilityName
        );
      } else {
        const audios = [];

        for (let i = 0; i < totalAudios; i++) {
          const audio = new Audio(
            `/${this.cassetteName}/CharactersSFX/${actorName}/${stateOrAbilityName}/${i}.wav`
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
