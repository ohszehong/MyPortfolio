import fs, { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Canvas, createCanvas } from "canvas";

import FacingDirections from "../../shared/Standards/StringKeys/FacingDirections.json" with { type: "json" };
import CharacterStateTypes from "../../shared/Standards/StringKeys/CharacterStateTypes.json" with { type: "json" };
import CollisionTypes from "../../shared/Standards/StringKeys/CollisionTypes.json" with { type: "json" };
import loadTileMap from "../Utilities/TileMapLoader/loadTileMap.js";
import loadImage from "../Utilities/ImgLoader/loadImage.js";
import PawnActor from "../../shared/Actors/PawnActor.js";
import TileActor from "../../shared/Actors/TileActor.js";
import DefenseMarchCassetteSignalsManager from "../../shared/SignalsManagers/DefenseMarchCassetteSignalsManager.js";

export default class GameStatesManager {
  cassetteIndex;
  cassetteName;
  userId;

  //client websocket instance
  /** @type {WebSocket} */
  ws;

  dirToCassetteContentData;
  dirToPawnActorsDataJSONFile;
  dirToSummonActorsDataJSONFile;
  dirToDataStorageFolder;

  clientContentCanvasBaseWidth;
  clientContentCanvasBaseHeight;

  /** @type {Canvas} */
  gameMapBackgroundCanvas;

  //for Worker usage
  gameMapBackgroundCanvasBaseWidth;
  gameMapBackgroundCanvasBaseHeight;

  mapCollisions = [];
  mapJumpTriggers = [];
  mapSoundTriggers = [];

  cameraPosition = { x: 0, y: 0 };
  cursorPosition = { x: 0, y: 0 };

  //based on where the user has clicked on the console screen to decide which action should be taken, either moving their character or etc.
  selectedObject = null;

  pawnActorsBlobDictionary = {};
  summonActorsBlobDictionary = {};
  tileActorsBlobDictionary = {};

  /** @type {PawnActor} */
  playerActor;

  //for ally npcs
  /** @type {Array<PawnActor>} */
  allyPawnActors = [];

  //for enemy npcs
  /** @type {Array<PawnActor>} */
  enemyPawnActors = [];

  //tiles that have animation or participate in y ordering
  /** @type {Array<TileActor>} */
  tileActors = [];

  //collisions that spawn from animation
  spawnCollisions = [];

  //actors that spawn from animation
  spawnActors = [];

  //for DefenseMarchCassette (summon locations are init via loadTileMap)
  allySummonLocations = [];
  enemySummonLocations = [];
  goldCoins = 0;
  currentTotalUnits = 0;
  maxTotalUnits = 50;
  currentWave = 1;
  maxWaves = 100;

  currentGameTick = 0;

  signalsManager = null;

  getSerializedActors() {
    let serializedPlayerActor;
    let serializedAllyPawnActors = [];
    let serializedEnemyPawnActors = [];
    let serializedTileActors = [];

    serializedPlayerActor = this.playerActor ? this.playerActor.toJSON() : null;

    this.allyPawnActors.forEach((actor) => {
      let serializedData = actor.toJSON();
      serializedAllyPawnActors.push(serializedData);
    });

    this.enemyPawnActors.forEach((actor) => {
      let serializedData = actor.toJSON();
      serializedAllyPawnActors.push(serializedData);
    });

    this.tileActors.forEach((actor) => {
      serializedTileActors.push(actor.toJSON());
    });

    return [
      serializedPlayerActor,
      serializedAllyPawnActors,
      serializedEnemyPawnActors,
      serializedTileActors,
    ];
  }

  toJSON(mode = "init") {
    const [
      playerActor,
      serializedAllyPawnActors,
      serializedEnemyPawnActors,
      serializedTileActors,
    ] = this.getSerializedActors();

    const data = {
      cassetteIndex: this.cassetteIndex,
      cassetteName: this.cassetteName,
      userId: this.userId,
      mapCollisions: this.mapCollisions,
      mapJumpTriggers: this.mapJumpTriggers,
      mapSoundTriggers: this.mapSoundTriggers,
      cameraPosition: this.cameraPosition,
      cursorPosition: this.cursorPosition,
      selectedObject: this.selectedObject,
      playerActor: playerActor,
      allyPawnActors: serializedAllyPawnActors,
      enemyPawnActors: serializedEnemyPawnActors,
      tileActors: serializedTileActors,
    };

    //DefenseMarchCassette specific data
    if (this.cassetteIndex === 1) {
      data.allySummonLocations = this.allySummonLocations;
      data.enemySummonLocations = this.enemySummonLocations;
      data.goldCoins = this.goldCoins;
      data.currentTotalUnits = this.currentTotalUnits;
      data.maxTotalUnits = this.maxTotalUnits;
      data.currentWave = this.currentWave;
      data.maxWaves = this.maxWaves;
    }

    if (mode === "init") {
      const gameMapBackgroundBlob = this.gameMapBackgroundCanvas
        .toBuffer()
        .toString("base64");

      data.pawnActorsBlobDictionary = this.pawnActorsBlobDictionary;
      data.tileActorsBlobDictionary = this.tileActorsBlobDictionary;
      data.gameMapBackgroundBlob = gameMapBackgroundBlob;
      data.clientContentCanvasBaseWidth = this.clientContentCanvasBaseWidth;
      data.clientContentCanvasBaseHeight = this.clientContentCanvasBaseHeight;
      data.gameMapBackgroundCanvasBaseWidth =
        this.gameMapBackgroundCanvas.width;
      data.gameMapBackgroundCanvasBaseHeight =
        this.gameMapBackgroundCanvas.height;
      data.dirToCassetteContentData = this.dirToCassetteContentData;
      data.dirToPawnActorsDataJSONFile = this.dirToPawnActorsDataJSONFile;
      data.dirToSummonActorsDataJSONFile = this.dirToSummonActorsDataJSONFile;
      data.dirToDataStorageFolder = this.dirToDataStorageFolder;
    }

    return data;
  }

  constructor(
    cassetteIndex,
    userId,
    clientContentCanvasWidth,
    clientContentCanvasHeight,
    workerMode = false, //for worker
  ) {
    if (!workerMode) {
      this.cassetteIndex = cassetteIndex;

      if (userId) {
        this.userId = userId;
      }

      const __currentFilePath = fileURLToPath(import.meta.url);
      const __currentDirPath = path.dirname(__currentFilePath);

      const __serverDirPath = __currentDirPath.split("GameStatesManager")[0];

      this.dirToCassetteContentData = path.join(
        __serverDirPath,
        "CassetteContentData",
      );

      this.dirToSummonActorsDataJSONFile = null;

      switch (cassetteIndex) {
        case 0:
          this.cassetteName = "IntroCassette";
          break;

        case 1:
          this.cassetteName = "DefenseMarchCassette";
          this.signalsManager = new DefenseMarchCassetteSignalsManager(this);
          this.dirToSummonActorsDataJSONFile = path.join(
            this.dirToCassetteContentData,
            this.cassetteName,
            "DataStorage",
            "SummonActorsData.json",
          );
          break;
      }

      this.dirToPawnActorsDataJSONFile = path.join(
        this.dirToCassetteContentData,
        this.cassetteName,
        "DataStorage",
        "PawnActorsData.json",
      );

      this.dirToDataStorageFolder = path.join(
        this.dirToCassetteContentData,
        this.cassetteName,
        "DataStorage",
      );

      this.clientContentCanvasBaseWidth = clientContentCanvasWidth;
      this.clientContentCanvasBaseHeight = clientContentCanvasHeight;
    }
  }

  //using serializedJSON to construct instead
  //this is for the worker thread
  static constructFromSerializedJSON(serializedJSON) {
    const clientManager = new GameStatesManager(null, null, null, null, true);

    clientManager.cassetteIndex = serializedJSON.cassetteIndex;
    clientManager.cassetteName = serializedJSON.cassetteName;

    if (clientManager.cassetteIndex === 0) {
    } else if (clientManager.cassetteIndex === 1) {
      clientManager.signalsManager = new DefenseMarchCassetteSignalsManager(
        clientManager,
      );

      clientManager.allySummonLocations = serializedJSON.allySummonLocations;
      clientManager.enemySummonLocations = serializedJSON.enemySummonLocations;
      clientManager.goldCoins = serializedJSON.goldCoins;
      clientManager.currentTotalUnits = serializedJSON.currentTotalUnits;
      clientManager.maxTotalUnits = serializedJSON.maxTotalUnits;
      clientManager.currentWave = serializedJSON.currentWave;
      clientManager.maxWaves = serializedJSON.maxWaves;
    }

    clientManager.userId = serializedJSON.userId;
    clientManager.pawnActorsBlobDictionary =
      serializedJSON.pawnActorsBlobDictionary;
    clientManager.tileActorsBlobDictionary =
      serializedJSON.tileActorsBlobDictionary;
    clientManager.mapCollisions = serializedJSON.mapCollisions;
    clientManager.mapJumpTriggers = serializedJSON.mapJumpTriggers;
    clientManager.mapSoundTriggers = serializedJSON.mapSoundTriggers;
    clientManager.cameraPosition = serializedJSON.cameraPosition;
    clientManager.cursorPosition = serializedJSON.cursorPosition;
    clientManager.selectedObject = serializedJSON.selectedObject;
    clientManager.clientContentCanvasBaseWidth =
      serializedJSON.clientContentCanvasBaseWidth;
    clientManager.clientContentCanvasBaseHeight =
      serializedJSON.clientContentCanvasBaseHeight;
    clientManager.gameMapBackgroundCanvasBaseWidth =
      serializedJSON.gameMapBackgroundCanvasBaseWidth;
    clientManager.gameMapBackgroundCanvasBaseHeight =
      serializedJSON.gameMapBackgroundCanvasBaseHeight;
    clientManager.dirToCassetteContentData =
      serializedJSON.dirToCassetteContentData;
    clientManager.dirToPawnActorsDataJSONFile =
      serializedJSON.dirToPawnActorsDataJSONFile;
    clientManager.dirToSummonActorsDataJSONFile =
      serializedJSON.dirToSummonActorsDataJSONFile;
    clientManager.dirToDataStorageFolder =
      serializedJSON.dirToDataStorageFolder;

    if (serializedJSON.playerActor) {
      clientManager.playerActor = PawnActor.constructExistingActor(
        serializedJSON.playerActor.tempId,
        serializedJSON.playerActor.actorName,
        serializedJSON.playerActor.position,
        serializedJSON.playerActor.actorState,
        serializedJSON.playerActor.actorCurrentStats,
        clientManager.pawnActorsBlobDictionary[
          serializedJSON.playerActor.actorName
        ],
        serializedJSON.playerActor.currentLevel,
        serializedJSON.playerActor.maxLevel,
        serializedJSON.playerActor.collision,
        serializedJSON.playerActor.selectable,
      );
    }

    serializedJSON.allyPawnActors.forEach((actorJSON) => {
      clientManager.allyPawnActors.push(
        PawnActor.constructExistingActor(
          actorJSON.playerActor.tempId,
          actorJSON.playerActor.actorName,
          actorJSON.playerActor.position,
          actorJSON.playerActor.actorState,
          actorJSON.playerActor.actorCurrentStats,
          clientManager.pawnActorsBlobDictionary[
            actorJSON.playerActor.actorName
          ].animations,
          actorJSON.playerActor.currentLevel,
          actorJSON.playerActor.maxLevel,
          actorJSON.playerActor.collision,
          actorJSON.playerActor.selectable,
        ),
      );
    });

    serializedJSON.enemyPawnActors.forEach((actorJSON) => {
      clientManager.enemyPawnActors.push(
        PawnActor.constructExistingActor(
          actorJSON.playerActor.tempId,
          actorJSON.playerActor.actorName,
          actorJSON.playerActor.position,
          actorJSON.playerActor.actorState,
          actorJSON.playerActor.actorCurrentStats,
          clientManager.pawnActorsBlobDictionary[
            actorJSON.playerActor.actorName
          ].animations,
          actorJSON.playerActor.currentLevel,
          actorJSON.playerActor.maxLevel,
          actorJSON.playerActor.collision,
          actorJSON.playerActor.selectable,
        ),
      );
    });

    serializedJSON.tileActors.forEach((actorJSON) => {
      clientManager.tileActors.push(
        new TileActor(
          actorJSON.tempId,
          actorJSON.position,
          actorJSON.tiles,
          actorJSON.selectable,
        ),
      );
    });

    return clientManager;
  }

  playAllActorsAnimation(deltaTime) {
    if (this.playerActor) {
      const animationResult = this.playerActor.playAnimation(deltaTime);
      //console.log("animationData: ", animationResult);

      if (animationResult.collisions) {
        this.spawnCollisions = [
          ...this.spawnCollisions,
          ...animationResult.collisions,
        ];
      }
    }

    this.allyPawnActors.forEach((actor) => {
      const animationResult = actor.playAnimation(deltaTime);

      if (animationResult.collisions) {
        this.spawnCollisions = [
          ...this.spawnCollisions,
          ...animationResult.collisions,
        ];
      }
    });

    this.enemyPawnActors.forEach((actor) => {
      const animationResult = actor.playAnimation(deltaTime);

      if (animationResult.collisions) {
        this.spawnCollisions = [
          ...this.spawnCollisions,
          ...animationResult.collisions,
        ];
      }
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

  async init() {
    if (this.cassetteIndex === null) {
      console.log("invalid cassette index, please try init later.");
      return;
    }

    let shouldAbortRef = { current: false };

    try {
      console.log("init game states, cassette index: ", this.cassetteIndex);
      const userExists = await this.loadGeneralGameStates(shouldAbortRef);

      if (shouldAbortRef.current) return;

      switch (this.cassetteIndex) {
        case 0:
          if (!userExists) {
            this.createNewIntroCassetteGameStates();
          }
          //load cassette specific things here...
          return;

        case 1:
          if (!userExists) {
            this.createNewDefenseMarchCassetteGameStates();
          }
          //load cassette specific things here...
          else {
            let loadedUserData = JSON.parse(
              fs.readFileSync(
                path.join(this.dirToDataStorageFolder, `${this.userId}.json`),
                "utf-8",
              ),
            );

            if (loadedUserData.pawnActorsBlobDictionary) {
              Object.keys(loadedUserData.pawnActorsBlobDictionary).forEach(
                (actorName) => {
                  this.pawnActorsBlobDictionary[actorName].currentLevel =
                    loadedUserData.pawnActorsBlobDictionary[
                      actorName
                    ].currentLevel;
                },
              );
            }
          }
          return;

        default:
          shouldAbortRef.current = true;
          throw new Error(
            `{statusCode: 400, message: "invalid cassette index."}`,
          );
      }
    } catch (err) {
      shouldAbortRef.current = true;
      console.log("stack trace: ", err.stack);
      console.log("throwing error from init.");
      throw new Error(`{statusCode: 500, message: ${err}}`);
    }
  }

  async loadGeneralGameStates(shouldAbortRef) {
    try {
      await loadTileMap.call(this, shouldAbortRef);

      if (shouldAbortRef.current) return;

      //load all actors blob into pawnActorsBlobDictionary
      await this.loadAllActorsBlob();

      let loadedGameStates = null;
      if (this.userId) {
        const userDataFilePath = path.join(
          this.dirToDataStorageFolder,
          `${this.userId}.json`,
        );
        if (fs.existsSync(userDataFilePath)) {
          loadedGameStates = JSON.parse(
            fs.readFileSync(userDataFilePath),
            "utf-8",
          );
        }
      }

      //user doesn't exists
      if (!this.initExistingGameStates(loadedGameStates)) {
        return false;
      }
      return true;
    } catch (err) {
      console.log("throwing error from load general game states.");
      throw new Error(err);
    }
  }

  convertImgToBlob(img) {
    if (img) {
      const canvas = createCanvas(img.width, img.height);
      canvas.getContext("2d").drawImage(img, 0, 0);
      const blob = canvas.toBuffer().toString("base64");
      return blob;
    }
  }

  //actorName is the unique key of the actors collection object
  //there's Allies or Enemies folder before the actorName in DefenseMarchCassette, use extraDirectoryBeforeActorName for that
  async addDefaultActorImageAndAnimationBlobsToPawnActorBlobDictionary(
    actorName,
    actorBlobDictionary,
    extraDirectoryBeforeActorName,
  ) {
    //motion values are used to calculate the current stats based on the current level
    actorBlobDictionary.animationBlobs = {};

    /** DEFAULT IMAGES AND ANIMATIONS **/
    const serverFolderToCharacterAssets = `CassetteContentData/${this.cassetteName}/CharacterAssets/${extraDirectoryBeforeActorName != null ? extraDirectoryBeforeActorName + "/" : ""}`;

    const defaultActorImage = await loadImage(
      `${serverFolderToCharacterAssets}${actorName}/defaultImage/defaultImage.png`,
    )
      .then((img) => img)
      .catch((err) => null);

    if (defaultActorImage) {
      let blob = this.convertImgToBlob(defaultActorImage);
      if (blob) actorBlobDictionary.defaultActorImage = blob;
    }

    if (actorBlobDictionary.animations) {
      const pathToSpritesheetFolder = `${serverFolderToCharacterAssets}${actorName}/spritesheets/`;
      const keys = Object.keys(actorBlobDictionary.animations);

      for (let i = 0; i < keys.length; i++) {
        const spritesheetImg = await loadImage(
          `${pathToSpritesheetFolder}${keys[i]}/${actorBlobDictionary.animations[keys[i]]?.spritesheetFile}`,
        )
          .then((img) => img)
          .catch((err) => null);

        if (spritesheetImg) {
          try {
            let blob = this.convertImgToBlob(spritesheetImg);
            if (blob) actorBlobDictionary.animationBlobs[keys[i]] = blob;
          } catch (err) {
            console.log("stack trace: ", err.stack);
            console.log(
              "error occurred while converting spritesheetImg to blob: ",
              err,
            );
          }
        }
      }
    }
    return actorBlobDictionary;
  }

  async loadAllActorsBlob() {
    /* pawn actors */
    const allPawnActorsDefaultData = JSON.parse(
      fs.readFileSync(this.dirToPawnActorsDataJSONFile, "utf-8"),
    );

    const allPawnActorsName = Object.keys(allPawnActorsDefaultData);
    if (allPawnActorsName.length > 0) {
      const entries = await Promise.all(
        allPawnActorsName.map(async (actorName) => {
          //There's Allies or Enemies folder before the actorName in DefenseMarchCassette (cassetteIndex of 1)
          //Use extraDirectoryBeforeActorName param from getActorBlobDictionary method

          let extraDirectoryBeforeActorName = null;

          if (this.cassetteIndex === 1) {
            const targetType = allPawnActorsDefaultData[actorName].targetType;
            if (targetType === "ally") {
              extraDirectoryBeforeActorName = "Allies";
            } else if (targetType === "enemy") {
              extraDirectoryBeforeActorName = "Enemies";
            }
          }

          const blobDictionary =
            await this.addDefaultActorImageAndAnimationBlobsToPawnActorBlobDictionary(
              actorName,
              allPawnActorsDefaultData[actorName],
              extraDirectoryBeforeActorName,
            )
              .then((blobDictionary) => blobDictionary)
              .catch((err) => null);

          return [actorName, blobDictionary];
        }),
      );

      entries.forEach(([actorName, blobDictionary]) => {
        this.pawnActorsBlobDictionary[actorName] = blobDictionary;
      });
    }

    /* summon actors (e.g. projectiles/VFX) */
    if (!this.dirToSummonActorsDataJSONFile) return;

    const allSummonActorsDefaultData = JSON.parse(
      fs.readFileSync(this.dirToSummonActorsDataJSONFile, "utf-8"),
    );

    const allProjectilesName = Object.keys(allSummonActorsDefaultData.projectiles);
    const allHitVFXSName = Object.keys(allSummonActorsDefaultData.hitVFXs);
    const allVFXSName = Object.keys(allSummonActorsDefaultData.vfxs);

    if(allProjectilesName.length > 0)
    {
      allProjectilesName.map((projectileName) => {
        allSummonActorsDefaultData.projectiles.projectileName.animationBlobs = //cont...
      })
    }

      const defaultActorImage = await loadImage(
      `${serverFolderToCharacterAssets}${actorName}/defaultImage/defaultImage.png`,
    )
      .then((img) => img)
      .catch((err) => null);

    if (defaultActorImage) {
      let blob = this.convertImgToBlob(defaultActorImage);
      if (blob) actorBlobDictionary.defaultActorImage = blob;
    }
  }

  initExistingGameStates(loadedGameStates) {
    if (loadedGameStates) {
      //if playerActor exists
      if (loadedGameStates.playerActor) {
        //get actor animation data
        const defaultPlayerActorData =
          this.pawnActorsBlobDictionary[loadedGameStates.playerActor.actorName];

        this.playerActor = PawnActor.constructExistingActor(
          loadedGameStates.playerActor.tempId,
          loadedGameStates.playerActor.actorName,
          loadedGameStates.playerActor.position,
          loadedGameStates.playerActor.actorState,
          loadedGameStates.playerActor.actorCurrentStats,
          defaultPlayerActorData,
          loadedGameStates.playerActor.currentLevel,
          loadedGameStates.playerActor.maxLevel,
          loadedGameStates.playerActor.collision,
          loadedGameStates.playerActor.selectable,
        );
      }

      for (const allyPawnActor of loadedGameStates.allyPawnActors) {
        const defaultAllyPawnActorData =
          this.pawnActorsBlobDictionary[allyPawnActor.actorName];

        const pawnActor = PawnActor.constructExistingActor(
          allyPawnActor.tempId,
          allyPawnActor.actorName,
          allyPawnActor.position,
          allyPawnActor.actorState,
          allyPawnActor.actorCurrentStats,
          defaultAllyPawnActorData,
          allyPawnActor.currentLevel,
          allyPawnActor.maxLevel,
          allyPawnActor.collision,
          allyPawnActor.selectable,
        );

        this.allyPawnActors.push(pawnActor);
      }

      for (const enemyPawnActor of loadedGameStates.enemyPawnActors) {
        const defaultEnemyPawnActorData =
          this.pawnActorsBlobDictionary[enemyPawnActor.actorName];

        const pawnActor = PawnActor.constructExistingActor(
          enemyPawnActor.tempId,
          enemyPawnActor.actorName,
          enemyPawnActor.position,
          enemyPawnActor.actorState,
          enemyPawnActor.actorCurrentStats,
          defaultEnemyPawnActorData,
          enemyPawnActor.currentLevel,
          enemyPawnActor.maxLevel,
          enemyPawnActor.collision,
          enemyPawnActor.selectable,
        );

        this.enemyPawnActors.push(pawnActor);
      }

      this.cameraPosition = { ...loadedGameStates.cameraPosition };
      this.goldCoins = loadedGameStates.goldCoins;
      return true;
    }
    return false;
  }

  createNewIntroCassetteGameStates() {
    //create new data and save it immediately
    const uuid = randomUUID();
    const actorBlobDictionary = this.pawnActorsBlobDictionary.mainCharacter;

    this.userId = uuid;

    const playerStartingPosition = {
      dx: 10.36,
      dy: 260.64,
    };

    //move the camera so that the character stay in the middle of the camera
    this.cameraPosition.x =
      playerStartingPosition.dx - this.clientContentCanvasBaseWidth / 2;
    this.cameraPosition.y =
      playerStartingPosition.dy - this.clientContentCanvasBaseHeight / 2;

    this.sanitizeCameraPosition();

    this.playerActor = PawnActor.constructNewActor(
      uuid,
      "mainCharacter",
      playerStartingPosition,
      actorBlobDictionary,
    );

    this.playerActor.facingDirection = FacingDirections.right;
    this.saveGameStatesData();
  }

  createNewDefenseMarchCassetteGameStates() {
    //create new data and save it immediately
    const uuid = randomUUID();

    this.userId = uuid;

    //add currentLevel to each pawnActor in pawnActorsBlobDictionary
    Object.values(this.pawnActorsBlobDictionary).forEach((pawnActorBlob) => {
      pawnActorBlob.currentLevel = 1;
    });

    this.saveGameStatesData();
  }

  saveGameStatesData() {
    const [
      playerActor,
      serializedAllyPawnActors,
      serializedEnemyPawnActors,
      serializedTileActors,
    ] = this.getSerializedActors();

    if (playerActor) {
      //default stats are not needed for now, they are in pawnActorsBlobDictionary
      delete playerActor.actorDefaultStats;
    }

    let pawnActorsBlobDictionaryCopy = {};

    for (const [actorName, actorBlobDictionary] of Object.entries(
      this.pawnActorsBlobDictionary,
    )) {
      const { animations, animationBlobs, ...rest } = actorBlobDictionary;
      pawnActorsBlobDictionaryCopy[actorName] = rest;
    }

    /** CODE BELOW CAUSE AN ISSUE WHERE IT AFFECTS THE ORIGINAL VALUE AS .animations and .animationBlobs ARE NESTED OBJECT **/
    // const pawnActorsName = Object.keys(pawnActorsBlobDictionaryCopy);
    // if(pawnActorsName.length > 0)
    // {
    //   //remove animations data as they are not needed in the save file
    //   pawnActorsName.forEach((pawnActorName) => {
    //     delete pawnActorsBlobDictionaryCopy[pawnActorName].animations;
    //     delete pawnActorsBlobDictionaryCopy[pawnActorName].animationBlobs;
    //   })
    // }

    let gameStatesData = {
      cameraPosition: this.cameraPosition,
      playerActor: playerActor,
      allyPawnActors: serializedAllyPawnActors,
      enemyPawnActors: serializedEnemyPawnActors,
      pawnActorsBlobDictionary: pawnActorsBlobDictionaryCopy,
    };

    //DefenseMarchCassette specific data
    if (this.cassetteIndex === 1) {
      gameStatesData.goldCoins = 500; //initial gold coins
      gameStatesData.currentTotalUnits = this.currentTotalUnits;
      gameStatesData.maxTotalUnits = this.maxTotalUnits;
      gameStatesData.currentWave = this.currentWave;
      gameStatesData.maxWaves = this.maxWaves;
    }

    fs.writeFileSync(
      path.join(this.dirToDataStorageFolder, `${this.userId}.json`),
      JSON.stringify(gameStatesData),
    );

    console.log(
      `successfully updated ${this.cassetteName} data for ${this.userId}.json`,
    );
  }

  /** @param {Actor} actor */
  moveCameraToActor(actor) {
    this.cameraPosition.x =
      actor.position.dx - this.clientContentCanvasBaseWidth / 2;
    this.cameraPosition.y =
      actor.position.dy - this.clientContentCanvasBaseHeight / 2;
  }

  sanitizeCameraPosition = (printConsole = false) => {
    let screenWidth = 0;
    let screenHeight = 0;

    screenWidth = this.clientContentCanvasBaseWidth;
    screenHeight = this.clientContentCanvasBaseHeight;

    //if the camera is on the edge of the map
    if (this.cameraPosition.x < 0) {
      this.cameraPosition.x = 0;
    } else if (
      this.cameraPosition.x + screenWidth >=
      this.gameMapBackgroundCanvasBaseWidth
    ) {
      this.cameraPosition.x =
        this.gameMapBackgroundCanvasBaseWidth - screenWidth;
    }

    if (this.cameraPosition.y < 0) {
      this.cameraPosition.y = 0;
    } else if (
      this.cameraPosition.y + screenHeight >=
      this.gameMapBackgroundCanvasBaseHeight
    ) {
      this.cameraPosition.y =
        this.gameMapBackgroundCanvasBaseHeight - screenHeight;
    }

    if (printConsole) {
      console.log(
        "game map canvas width: ",
        this.gameMapBackgroundCanvasBaseWidth,
      );
      console.log("new sanitized camera x: ", this.cameraPosition.x);
    }
  };
}
