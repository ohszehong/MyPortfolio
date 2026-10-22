import PawnActor from "../../../../Actors/PawnActor.js";
import ProjectileActor from "../../../../Actors/ProjectileActor.js";
import VFXHitBoxActor from "../../../../Actors/VFXHitBoxActor.js";
import TileActor from "../../../../Actors/TileActor.js";

import SummonActorTypes from "../../../../Standards/SummonActorTypes.json" with { type: "json" };

export default async function loadExistingGameStates(
  gameStatesManager,
  rawGameStatesData,
  clientSide = false,
) {
  if (rawGameStatesData) {
    try {
      gameStatesManager.cameraPosition = {
        ...rawGameStatesData.cameraPosition,
      } || { x: 0, y: 0 };
      gameStatesManager.goldCoins = rawGameStatesData.goldCoins || 0;
      gameStatesManager.currentTotalUnits =
        rawGameStatesData.currentTotalUnits || 0;
      gameStatesManager.currentWave = rawGameStatesData.currentWave || 1;
      gameStatesManager.maxWaves = rawGameStatesData.maxWaves || 50;

      const createPawnActorFromRawStates = (rawActorStates) => {
        const pawnActor = PawnActor.constructExistingActor(
          rawActorStates,
          rawGameStatesData.pawnActorsBlobDictionary[rawActorStates.actorName],
        );

        pawnActor.facingDirection = rawActorStates.facingDirection;

        return pawnActor;
      };

      //if playerActor exists
      if (rawGameStatesData.playerActor) {
        createPawnActorFromRawStates(rawGameStatesData.playerActor);
      }

      if (rawGameStatesData.allyPawnActors?.length > 0) {
        rawGameStatesData.allyPawnActors.forEach((rawActorStates) => {
          createPawnActorFromRawStates(rawActorStates);
        });
      }

      if (rawGameStatesData.enemyPawnActors?.length > 0) {
        rawGameStatesData.enemyPawnActor.forEach((rawActorStates) => {
          createPawnActorFromRawStates(rawActorStates);
        });
      }

      if (rawGameStatesData.summonedActors?.length > 0) {
        let allPawnActors = [gameStatesManager.playerActor];
        allPawnActors.push(
          ...gameStatesManager.allyPawnActors,
          ...gameStatesManager.enemyPawnActors,
        );

        const createSummonedActorFromRawStates = (rawActorStates) => {
          let metaData = null;
          let actor = null;

          //both of these are saved as Id in string in the database
          const fromTempId = rawActorStates.from;
          const targetActorTempId = rawActorStates.targetActor;

          const from = allPawnActors.find((pawnActor) => {
            return pawnActor.tempId === fromTempId;
          });
          const targetActor = allPawnActors.find((pawnActor) => {
            return pawnActor.tempId === targetActorTempId;
          });

          switch (rawActorStates.summonActorType) {
            case SummonActorTypes.Projectile:
              let hitVFXBlobDictionary = null;
              const latestHitAnimationData =
                rawActorStates.latestHitAnimationData;
              if (latestHitAnimationData) {
                hitVFXBlobDictionary =
                  gameStatesManager.summonActorsBlobDictionary.hitVFXs[
                    latestHitAnimationData.name
                  ];
              }

              metaData = ProjectileActor.constructProjectileMetaData(
                rawActorStates.actorName,
                from,
                rawActorStates.facingDirection,
                rawActorStates.position,
                rawActorStates.blockCollision,
                rawActorStates.scalingType,
                rawActorStates.scalingValue,
                targetActor,
                rawActorStates.targetPosition,
                rawActorStates.homing,
                rawActorStates.singleTarget,
                rawActorStates.travellingSpeed,
                rawActorStates.duration,
                gameStatesManager.summonActorsBlobDictionary.projectiles[
                  rawActorStates.actorName
                ],
                hitVFXBlobDictionary,
                rawActorStates.latestTravellingAnimationData,
                latestHitAnimationData,
              );

              actor = new ProjectileActor(metaData);
              break;

            case SummonActorTypes.VFXHitBox:
              metaData = VFXHitBoxActor.constructVFXHitBoxMetaData(
                from,
                rawActorStates.actorName,
                rawActorStates.facingDirection,
                rawActorStates.position,
                rawActorStates.blockCollision,
                rawActorStates.scalingType,
                rawActorStates.scalingValue,
                targetActor,
                rawActorStates.targetPosition,
                rawActorStates.homing,
                rawActorStates.singleTarget,
                rawActorStates.duration,
                gameStatesManager.summonActorsBlobDictionary.vfxs[
                  rawActorStates.actorName
                ],
                rawActorStates.latestVFXAnimationData,
              );

              actor = new VFXHitBoxActor(metaData);
              break;
          }

          if (actor) {
            gameStatesManager.summonedActors.push(actor);
          }
        };

        rawGameStatesData.summonedActors.forEach((rawActorStates) => {
          createSummonedActorFromRawStates(rawActorStates);
        });
      }

      //client-side specific
      if (clientSide) {
        if (!rawGameStatesData.userId)
          throw new Error("Invalid userId while loading existing game states.");

        gameStatesManager.userId = rawGameStatesData.userId;

        if (rawGameStatesData.tileActors?.length > 0) {
          rawGameStatesData.tileActors.forEach((rawActorStates) => {
            gameStatesManager.tileActors.push(
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

        gameStatesManager.gameMapBackground = await convertBlobToBitmap(
          rawGameStatesData.gameMapBackgroundBlob,
        );

        if (gameStatesManager.gameMapBackground) {
          gameStatesManager.gameMapBackgroundCanvasBaseWidth =
            gameStatesManager.gameMapBackground.width;
          gameStatesManager.gameMapBackgroundCanvasBaseHeight =
            gameStatesManager.gameMapBackground.height;
        }

        gameStatesManager.mapCollisions = [...rawGameStatesData.mapCollisions];
        gameStatesManager.mapJumpTriggers = [
          ...rawGameStatesData.mapJumpTriggers,
        ];

        if (gameStatesManager.cassetteName) {
          rawGameStatesData.mapSoundTriggers.forEach((trigger) => {
            gameStatesManager.mapSoundTriggers.push({
              stateToTrigger: trigger.stateToTrigger,
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
              !gameStatesManager.tileSoundsBlobDictionary[
                trigger.stateToTrigger
              ]?.[trigger.filename]
            ) {
              const audios = [];
              for (let i = 0; i < trigger.totalVariations; i++) {
                const audio = new Audio(
                  `/${gameStatesManager.cassetteName}/TilesSFX/${trigger.stateToTrigger}/${trigger.filename}/${i}.wav`,
                );
                audios.push(audio);
              }

              gameStatesManager.tileSoundsBlobDictionary[
                trigger.stateToTrigger
              ] = {
                ...gameStatesManager.tileSoundsBlobDictionary[
                  trigger.stateToTrigger
                ],
                [trigger.filename]: {
                  audios: audios,
                },
              };
            }
          });

          gameStatesManager.mapSoundTriggers.sort((triggerA, triggerB) => {
            return triggerA.priority - triggerB.priority;
          });
        }

        const actorNames = Object.keys(
          rawGameStatesData.pawnActorsBlobDictionary,
        );

        if (actorNames) {
          const entries = await Promise.all(
            actorNames.map(async (actorName) => {
              // defaultActorImage: null,
              // animations: {},
              // animationBlobs: {},
              // selectable: false,
              // targetType: 3,
              // defaultStats: {},
              // motionValues: [],
              // maxLevel: 99
              // currentLevel: 1

              const blobStruct = {
                ...rawGameStatesData.pawnActorsBlobDictionary[actorName],
              };

              await gameStatesManager.initActorAudios(actorName, "jump");
              await gameStatesManager.initActorAudios(
                actorName,
                "receiveDamage",
              );
              await gameStatesManager.initActorAudios(actorName, "attack1");
              await gameStatesManager.initActorAudios(actorName, "attack2");
              await gameStatesManager.initActorAudios(actorName, "attack3");
              await gameStatesManager.initActorAudios(actorName, "heal");

              if (blobStruct.defaultActorImage) {
                blobStruct.defaultActorImage = await convertBlobToBitmap(
                  actorBlobDictionary.defaultActorImage,
                );
              }

              if (blobStruct.animationBlobs) {
                const animationNames = Object.keys(blobStruct.animationBlobs);

                const entries = await Promise.all(
                  animationNames.map(async (animationName) => {
                    const animationBitmap = await convertBlobToBitmap(
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
            gameStatesManager.pawnActorsBlobDictionary[actorName] = blobStruct;
          });

          console.log(
            "pawnActorsBlobDictionary: ",
            gameStatesManager.pawnActorsBlobDictionary,
          );
        }

        gameStatesManager.summonActorsBlobDictionary = {
          ...rawGameStatesData.summonActorsBlobDictionary,
        };

        for (const [summonActorsType, summonActorsData] of Object.entries(
          gameStatesManager.summonActorsBlobDictionary,
        )) {
          if (summonActorsData) {
            for (const [summonActorName, summonActorData] of Object.entries(
              summonActorsData,
            )) {
              gameStatesManager.summonActorsBlobDictionary[summonActorsType][
                summonActorName
              ].animationBlobs = await convertBlobToBitmap(
                summonActorData.animationBlobs,
              );
            }
          }
        }

        console.log(
          "summonActorsBlobDictionary: ",
          gameStatesManager.summonActorsBlobDictionary,
        );

        const tileGids = Object.keys(
          rawGameStatesData.tileActorsBlobDictionary,
        );

        if (tileGids) {
          const entries = await Promise.all(
            tileGids.map(async (tileGid) => {
              const tileCanvas = await convertBlobToBitmap(
                rawGameStatesData.tileActorsBlobDictionary[tileGid],
              );

              return [tileGid, tileCanvas];
            }),
          );

          entries.forEach(([tileGid, tileCanvas]) => {
            gameStatesManager.tileActorsBlobDictionary[tileGid] = tileCanvas;
          });
        }

        //for DefenseMarch
        gameStatesManager.allySummonLocations =
          rawGameStatesData.allySummonLocations;
        gameStatesManager.enemySummonLocations =
          rawGameStatesData.enemySummonLocations;

        console.log(
          "ally summon locations: ",
          gameStatesManager.allySummonLocations,
        );
        console.log(
          "enemy summon locations: ",
          gameStatesManager.enemySummonLocations,
        );
      }

      return true;
    } catch (err) {
      console.log("Error while loading existing game states: ", err.message);
      return false;
    }
  }
  return false;
}

async function convertBlobToBitmap(base64BlobString) {
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
