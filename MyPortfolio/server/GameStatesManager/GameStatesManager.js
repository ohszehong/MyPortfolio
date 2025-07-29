import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Canvas, createCanvas } from "canvas";

import FacingDirections from "../../shared/Standards/StringKeys/FacingDirections.json" with {type: "json"};
import CharacterStateTypes from "../../shared/Standards/StringKeys/CharacterStateTypes.json" with {type: "json"};
import CollisionTypes from "../../shared/Standards/StringKeys/CollisionTypes.json" with {type: "json"};
import loadTileMap from "../Utilities/TileMapLoader/loadTileMap.js";
import loadImage from "../Utilities/ImgLoader/loadImage.js";
import PawnActor from "../../shared/Actors/PawnActor.js";
import TileActor from "../../shared/Actors/TileActor.js";

export default class GameStatesManager {
  cassetteIndex;
  cassetteName;
  userId;

  //client websocket instance
  /** @type {WebSocket} */
  ws;

  dirToCassetteContentData;
  dirToPawnActorsDataJSONFile;
  dirToGameStatesJSONFile;

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

  //for DefenseMarchCassette
  allySummonLocations = [];
  enemySummonLocations = [];

  currentGameTick = 0;

  getSerializedActorsData(withActorDefaultData = false)
  {
    let actorDefaultData;
    if(withActorDefaultData)
    {
      actorDefaultData = JSON.parse(
        fs.readFileSync(this.dirToPawnActorsDataJSONFile, "utf-8")
      );
    }

     let serializedPlayerActor;
     let serializedAllyPawnActors = [];
     let serializedEnemyPawnActors = [];
     let serializedTileActors = [];

     serializedPlayerActor = this.playerActor ? this.playerActor.toJSON() : null;

     if(serializedPlayerActor && withActorDefaultData)
     {
        serializedPlayerActor.actorDefaultData = actorDefaultData[this.playerActor.actorName];
     }
     
     this.allyPawnActors.forEach((actor) => {
      let serializedData = actor.toJSON();

      if(withActorDefaultData)
      {
        serializedData.actorDefaultData = actorDefaultData[actor.actorName];
      }
      serializedAllyPawnActors.push(serializedData);
    });

    this.enemyPawnActors.forEach((actor) => {
      let serializedData = actor.toJSON();

      if(withActorDefaultData)
      {
        serializedData.actorDefaultData = actorDefaultData[actor.actorName];
      }
      serializedAllyPawnActors.push(serializedData);
    });

    this.tileActors.forEach((actor) => {
        serializedTileActors.push(actor.toJSON());
    });
    
    return [serializedPlayerActor, serializedAllyPawnActors, serializedEnemyPawnActors, serializedTileActors];
  }

  toJSON(mode = "init") {
    const withActorDefaultData = mode === "init" ? true : false;
    const [playerActor, serializedAllyPawnActors, serializedEnemyPawnActors, serializedTileActors] = this.getSerializedActorsData(withActorDefaultData);

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
      allySummonLocations: this.allySummonLocations,
      enemySummonLocations: this.enemySummonLocations
    };

    if(mode === "init")
    {
      const gameMapBackgroundBlob = this.gameMapBackgroundCanvas.toBuffer().toString("base64");

      data.pawnActorsBlobDictionary = this.pawnActorsBlobDictionary;
      data.tileActorsBlobDictionary = this.tileActorsBlobDictionary;
      data.gameMapBackgroundBlob = gameMapBackgroundBlob;
      data.clientContentCanvasBaseWidth = this.clientContentCanvasBaseWidth;
      data.clientContentCanvasBaseHeight = this.clientContentCanvasBaseHeight;
      data.gameMapBackgroundCanvasBaseWidth = this.gameMapBackgroundCanvas.width;
      data.gameMapBackgroundCanvasBaseHeight = this.gameMapBackgroundCanvas.height;
      data.dirToCassetteContentData = this.dirToCassetteContentData;
      data.dirToPawnActorsDataJSONFile = this.dirToPawnActorsDataJSONFile;
      data.dirToGameStatesJSONFile = this.dirToGameStatesJSONFile;
    }

    return data;
  }

  constructor(
    cassetteIndex,
    userId,
    clientContentCanvasWidth,
    clientContentCanvasHeight,
    workerMode = false //for worker
  ) {
    if(!workerMode)
    {
      this.cassetteIndex = cassetteIndex;
      this.userId = userId;


      const __currentFilePath = fileURLToPath(import.meta.url);
      const __currentDirPath = path.dirname(__currentFilePath);
  
      const __serverDirPath = __currentDirPath.split("GameStatesManager")[0];
  
      this.dirToCassetteContentData = path.join(
        __serverDirPath,
        "CassetteContentData"
      );
    

      switch (cassetteIndex) {
        case 0:
          this.cassetteName = "IntroCassette";
          break;

        case 1:
          this.cassetteName = "DefenseMarchCassette";
          break;
      }

      this.dirToPawnActorsDataJSONFile = path.join(
        this.dirToCassetteContentData,
        this.cassetteName,
        "DataStorage",
        "PawnActorsData.json"
      );

      this.dirToGameStatesJSONFile = path.join(
        this.dirToCassetteContentData,
        this.cassetteName,
        "DataStorage",
        "GameStates.json"
      );

      this.clientContentCanvasBaseWidth = clientContentCanvasWidth;
      this.clientContentCanvasBaseHeight = clientContentCanvasHeight;
    }
  }

  //using serializedJSON to construct instead
  //this is for the worker thread
  static constructFromSerializedJSON(serializedJSON)
  {
    const clientManager = new GameStatesManager(null, null, null, null, true);
    
    clientManager.cassetteIndex = serializedJSON.cassetteIndex;
    clientManager.cassetteName = serializedJSON.cassetteName;
    clientManager.userId = serializedJSON.userId;
    clientManager.pawnActorsBlobDictionary = serializedJSON.pawnActorsBlobDictionary;
    clientManager.tileActorsBlobDictionary = serializedJSON.tileActorsBlobDictionary;
    clientManager.mapCollisions = serializedJSON.mapCollisions;
    clientManager.mapJumpTriggers = serializedJSON.mapJumpTriggers;
    clientManager.mapSoundTriggers = serializedJSON.mapSoundTriggers;
    clientManager.cameraPosition = serializedJSON.cameraPosition;
    clientManager.cursorPosition = serializedJSON.cursorPosition;
    clientManager.selectedObject = serializedJSON.selectedObject;
    clientManager.clientContentCanvasBaseWidth = serializedJSON.clientContentCanvasBaseWidth;
    clientManager.clientContentCanvasBaseHeight = serializedJSON.clientContentCanvasBaseHeight;
    clientManager.gameMapBackgroundCanvasBaseWidth = serializedJSON.gameMapBackgroundCanvasBaseWidth;
    clientManager.gameMapBackgroundCanvasBaseHeight = serializedJSON.gameMapBackgroundCanvasBaseHeight;
    clientManager.dirToCassetteContentData = serializedJSON.dirToCassetteContentData;
    clientManager.dirToPawnActorsDataJSONFile = serializedJSON.dirToPawnActorsDataJSONFile;
    clientManager.dirToGameStatesJSONFile = serializedJSON.dirToGameStatesJSONFile;
        
    clientManager.playerActor = new PawnActor(
      serializedJSON.playerActor.tempId, 
      serializedJSON.playerActor.actorName, 
      serializedJSON.playerActor.position, 
      serializedJSON.playerActor.actorDefaultStats,
      serializedJSON.playerActor.actorCurrentStats, 
      serializedJSON.playerActor.actorState, 
      serializedJSON.playerActor.actorDefaultData.animation, 
      serializedJSON.playerActor.currentLevel, 
      serializedJSON.playerActor.maxLevel, 
      serializedJSON.playerActor.collision, 
      serializedJSON.playerActor.selectable);

    serializedJSON.allyPawnActors.forEach((actorJSON) => {
      clientManager.allyPawnActors.push(new PawnActor(
        actorJSON.tempId,
        actorJSON.actorName,
        actorJSON.position,
        actorJSON.actorDefaultStats,
        actorJSON.actorCurrentStats,
        actorJSON.actorState,
        actorJSON.actorDefaultData.animation,
        actorJSON.currentLevel,
        actorJSON.maxLevel,
        actorJSON.collision,
        actorJSON.selectable
      ));
    });

    serializedJSON.enemyPawnActors.forEach((actorJSON) => {
      clientManager.enemyPawnActors.push(new PawnActor(
        actorJSON.tempId,
        actorJSON.actorName,
        actorJSON.position,
        actorJSON.actorDefaultStats,
        actorJSON.actorCurrentStats,
        actorJSON.actorState,
        actorJSON.actorDefaultData.animation,
        actorJSON.currentLevel,
        actorJSON.maxLevel,
        actorJSON.collision,
        actorJSON.selectable
      ));
    });

    serializedJSON.tileActors.forEach((actorJSON) => {
      clientManager.tileActors.push(new TileActor(actorJSON.tempId, actorJSON.position, actorJSON.tiles, actorJSON.selectable));
    });

    return clientManager;
  }

  playAllActorsAnimation(deltaTime) {
    if(this.playerActor)
    {
      const animationResult = this.playerActor.playAnimation(deltaTime);
      //console.log("animationData: ", animationResult);

      if(animationResult.collisions)
      {
        this.spawnCollisions = [...this.spawnCollisions, ...animationResult.collisions];
      }
    }

    this.allyPawnActors.forEach((actor) => {
      const animationResult = actor.playAnimation(deltaTime);
      
      if(animationResult.collisions)
      {
        this.spawnCollisions = [...this.spawnCollisions, ...animationResult.collisions];
      }
    });

    this.enemyPawnActors.forEach((actor) => {
      const animationResult = actor.playAnimation(deltaTime);

      if(animationResult.collisions)
      {
        this.spawnCollisions = [...this.spawnCollisions, ...animationResult.collisions];
      }
    });

    this.tileActors.forEach((actor) => {
      actor.playAnimation(deltaTime);
    });

    //handle summoning later...
  }

  getAllPawnActors()
  {
    let pawnActors = [];

    if(this.playerActor)
    {
      pawnActors.push(this.playerActor);
    }

    return pawnActors = [...pawnActors, ...this.allyPawnActors, ...this.enemyPawnActors];
  }

  getAllNonPawnActorBlockCollisions()
  {
    let collisions = [];

    this.tileActors.forEach((actor) => {
      if(actor.collision)
      {
        collisions.push(actor.collision);
      }
    })

    this.spawnActors.forEach((actor) => {
      if(actor.collision?.collisionType === CollisionTypes.blockCollision)
      {
        collisions.push(actor.collision);
      }
    })

    let spawnBlockCollisions = this.spawnCollisions.filter((collision) => collision.collisionType === CollisionTypes.blockCollision);

    let mapBlockCollisions = this.mapCollisions.filter(
      (collision) => collision.collisionType === CollisionTypes.blockCollision
    );

    collisions = [...collisions, ...spawnBlockCollisions, ...mapBlockCollisions];

    return collisions;
  }

  handleSpawnCollisionsLifetime(deltaTime)
  {
    this.spawnCollisions.forEach((collision, index) => {
      this.spawnCollisions[index].duration -= deltaTime; 
      if(this.spawnCollisions[index].duration <= 0)
      {
        //remove spawnCollision
        this.spawnCollisions.splice(index, 1);
      }
    })
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
          if(!userExists) {
            this.createNewDefenseMarchCassetteGameStates();
          }
          return;

        default:
          shouldAbortRef.current = true;
          throw new Error(
            `{statusCode: 400, message: "invalid cassette index."}`
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

      const allActorsDefaultData = JSON.parse(
        fs.readFileSync(this.dirToPawnActorsDataJSONFile, "utf-8")
      );

      //something is wrong
      if (Object.keys(allActorsDefaultData).length <= 0) {
        shouldAbortRef.current = true;
        return;
      }

      //load all actors blob
      await this.loadAllActorsBlob(allActorsDefaultData);

      let loadedGameStates = null;
      if (this.userId) {
        loadedGameStates = JSON.parse(
          fs.readFileSync(this.dirToGameStatesJSONFile, "utf-8")
        )?.[this.userId];
      }

      //user doesn't exists
      if (!this.initExistingGameStates(loadedGameStates, allActorsDefaultData)) {
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
  async getActorBlobDictionary(actorName, actorStruct) {
    let actorBlobDictionary = {
      defaultActorImage: null,
      animation: {},
    };

    const serverFolderToCharacterAssets =
      `CassetteContentData/${this.cassetteName}/CharacterAssets/`;
    const actorAnimationData = actorStruct.animation;

    const defaultActorImage = await loadImage(
      `${serverFolderToCharacterAssets}${actorName}/defaultImage/defaultImage.png`
    )
      .then((img) => img)
      .catch((err) => null);

    if (defaultActorImage) {
      let blob = this.convertImgToBlob(defaultActorImage);
      if (blob) actorBlobDictionary.defaultActorImage = blob;
    }

    if (actorAnimationData) {
      const pathToSpritesheetFolder = `${serverFolderToCharacterAssets}${actorName}/spritesheets/`;

      const keys = Object.keys(actorAnimationData);

      for(let i = 0; i < keys.length; i++)
      {
        const spritesheetImg = await loadImage(
          `${pathToSpritesheetFolder}${keys[i]}/${actorAnimationData[keys[i]]?.spritesheetFile}`
        ).then((img) => img).catch((err) => null);

        if (spritesheetImg) {
          try {
            let blob = this.convertImgToBlob(spritesheetImg);
            if (blob) actorBlobDictionary.animation[keys[i]] = blob;
          }
          catch(err)
          {
            console.log("stack trace: ", err.stack);
            console.log("error occurred while converting spritesheetImg to blob: ", err);
          }
        }
      }
    }
    return actorBlobDictionary;
  }

  async loadAllActorsBlob(allActorsDefaultData) {
    const entries = await Promise.all(Object.keys(allActorsDefaultData).map(async (actorName) => {
       const blobDictionary = await this.getActorBlobDictionary(actorName, allActorsDefaultData[actorName])
          .then((blobDictionary) => blobDictionary)
          .catch((err) => null);

        return [actorName, blobDictionary];
    }));

    entries.forEach(([actorName, blobDictionary]) => {
      this.pawnActorsBlobDictionary[actorName] = blobDictionary;
    })
  }

  initExistingGameStates(loadedGameStates, allActorsDefaultData) {
    if (loadedGameStates) {
      //if playerActor exists
      if (loadedGameStates.playerActor) {
        //get actor animation data
        const defaultPlayerActorData =
          allActorsDefaultData[loadedGameStates.playerActor.actorName];

        this.playerActor = new PawnActor(
          loadedGameStates.playerActor.tempId,
          loadedGameStates.playerActor.actorName,
          loadedGameStates.playerActor.position,
          defaultPlayerActorData.defaultStats,
          loadedGameStates.playerActor.actorCurrentStats,
          loadedGameStates.playerActor.actorState,
          defaultPlayerActorData.animation,
          loadedGameStates.playerActor.currentLevel,
          defaultPlayerActorData.maxLevel,
          defaultPlayerActorData.collision,
          defaultPlayerActorData.selectable
        );
      }

      for (const allyPawnActor of loadedGameStates.allyPawnActors) {
        const defaultAllyPawnActorData =
          allActorsDefaultData[allyPawnActor.actorName];

        const pawnActor = new PawnActor(
          allyPawnActor.tempId,
          allyPawnActor.actorName,
          allyPawnActor.position,
          defaultAllyPawnActorData.defaultStats,
          allyPawnActor.actorCurrentStats,
          allyPawnActor.actorState,
          defaultAllyPawnActorData.animation,
          allyPawnActor.currentLevel,
          defaultAllyPawnActorData.maxLevel,
          defaultAllyPawnActorData.collision,
          defaultAllyPawnActorData.selectable
        );

        this.allyPawnActors.push(pawnActor);
      }

      for (const enemyPawnActor of loadedGameStates.enemyPawnActors) {
        const defaultEnemyPawnActorData =
          allActorsDefaultData[enemyPawnActor.actorName];

        const pawnActor = new PawnActor(
          enemyPawnActor.tempId,
          enemyPawnActor.actorName,
          enemyPawnActor.position,
          defaultEnemyPawnActorData.defaultStats,
          enemyPawnActor.actorCurrentStats,
          enemyPawnActor.actorState,
          defaultEnemyPawnActorData.animation,
          enemyPawnActor.currentLevel,
          defaultEnemyPawnActorData.maxLevel,
          defaultEnemyPawnActorData.collision,
          defaultEnemyPawnActorData.selectable
        );

        this.enemyPawnActors.push(pawnActor);
      }

      this.cameraPosition = { ...loadedGameStates.cameraPosition };
      return true;
    }
    return false;
  }

  createNewIntroCassetteGameStates() {
    //create new data and save it immediately
    const uuid = randomUUID();
    const tempId = randomUUID();
    const actorDefaultData = JSON.parse(
      fs.readFileSync(this.dirToPawnActorsDataJSONFile, "utf-8")
    )?.mainCharacter;

    this.userId = uuid;
    this.cameraPosition.x = 0;
    this.cameraPosition.y = 0;

    const playerStartingPosition = {
      dx: 10.36,
      dy: 260.64,
    };

    //move the camera so that the character stay in the middle of the camera
    this.cameraPosition.x = playerStartingPosition.dx - this.clientContentCanvasBaseWidth / 2;
    this.cameraPosition.y = playerStartingPosition.dy - this.clientContentCanvasBaseHeight / 2;
    
    this.sanitizeCameraPosition();

    this.playerActor = new PawnActor(
      tempId,
      "mainCharacter",
      playerStartingPosition,
      actorDefaultData.defaultStats,
      actorDefaultData.defaultStats,
      CharacterStateTypes.idling,
      actorDefaultData.animation,
      1,
      actorDefaultData.maxLevel,
      actorDefaultData.collision,
      actorDefaultData.selectable
    );

    this.playerActor.facingDirection = FacingDirections.right;

    const gameStatesData = JSON.parse(
      fs.readFileSync(this.dirToGameStatesJSONFile, "utf-8")
    );

    const [playerActor, serializedAllyPawnActors, serializedEnemyPawnActors] = this.getSerializedActorsData();

    delete playerActor.defaultStats;
    delete playerActor.animation;
    delete playerActor.defaultImageFile;

    gameStatesData[uuid] = {
      cameraPosition: this.cameraPosition,
      playerActor: playerActor,
      allyPawnActors: serializedAllyPawnActors,
      enemyPawnActors: serializedEnemyPawnActors,
    };
    fs.writeFileSync(
      this.dirToGameStatesJSONFile,
      JSON.stringify(gameStatesData)
    );
    console.log("successfully updated IntroCassette GameStates.json");
  }

  createNewDefenseMarchCassetteGameStates() {
    //create new data and save it immediately
    const uuid = randomUUID();
    const tempId = randomUUID();

    this.userId = uuid;
    this.cameraPosition.x = 0;
    this.cameraPosition.y = 0;

    const gameStatesData = JSON.parse(
      fs.readFileSync(this.dirToGameStatesJSONFile, "utf-8")
    );

    const [playerActor, serializedAllyPawnActors, serializedEnemyPawnActors] = this.getSerializedActorsData();

    delete playerActor.defaultStats;
    delete playerActor.animation;
    delete playerActor.defaultImageFile;

    gameStatesData[uuid] = {
      cameraPosition: this.cameraPosition,
      playerActor: playerActor,
      allyPawnActors: serializedAllyPawnActors,
      enemyPawnActors: serializedEnemyPawnActors,
    };
    fs.writeFileSync(
      this.dirToGameStatesJSONFile,
      JSON.stringify(gameStatesData)
    );
    console.log("successfully updated DefenseMarchCassette GameStates.json");
  }

  /** @param {Actor} actor */
  moveCameraToActor(actor)
  {
    this.cameraPosition.x = actor.position.dx - this.clientContentCanvasBaseWidth / 2;
    this.cameraPosition.y = actor.position.dy - this.clientContentCanvasBaseHeight / 2;
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
      this.cameraPosition.x = this.gameMapBackgroundCanvasBaseWidth - screenWidth;
    }

    if (this.cameraPosition.y < 0) {
      this.cameraPosition.y = 0;
    } else if (
      this.cameraPosition.y + screenHeight >=
      this.gameMapBackgroundCanvasBaseHeight
    ) {
      this.cameraPosition.y = this.gameMapBackgroundCanvasBaseHeight - screenHeight;
    }

    if (printConsole) {
      console.log("game map canvas width: ", this.gameMapBackgroundCanvasBaseWidth);
      console.log("new sanitized camera x: ", this.cameraPosition.x);
    }
  };
}
