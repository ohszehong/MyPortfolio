import { AIsCollidedWithB } from "../CollisionsDetector/CollisionsDetector.js";
import { playAudio, playAudioRandom } from "./audioHandlers.js";

import playAllActorsAnimation from "./playAllActorsAnimation.js";
import getAllPawnActors from "./getAllPawnActors.js";
import getAllNonActorBlockCollisions from "./getAllNonActorBlockCollisions.js";
import handleSpawnCollisionsLifetime from "./handleSpawnCollisionsLifetime.js";

import CharacterStateTypes from "../../../Standards/CharacterStateTypes.json" with { type: "json" };
import CollisionTypes from "../../../Standards/CollisionTypes.json" with { type: "json" };

export default function processTick_General(
  gameStatesManager,
  deltaTime,
  checkBlockCollisions = true,
  checkSoundTriggers = false,
  checkJumpTriggers = false,
  clientSide = true,
) {
  handleSpawnCollisionsLifetime(gameStatesManager, deltaTime);

  const allNonActorBlockCollisions =
    getAllNonActorBlockCollisions(gameStatesManager);
  const allPawnActors = getAllPawnActors(gameStatesManager);

  const allActors = allPawnActors.concat(
    gameStatesManager.summonedActors,
    gameStatesManager.tileActors,
  );

  if (!allActors || !allActors.length <= 0) return;

  _moveActorsAndCheckBlockCollisions(
    allActors,
    allNonActorBlockCollisions,
    gameStatesManager,
    deltaTime,
    checkBlockCollisions,
  );

  if (checkSoundTriggers && clientSide) {
    _checkMovingPawnActorsWithWalkingSoundTriggers(
      allPawnActors,
      gameStatesManager,
    );
  }

  if (checkJumpTriggers) {
    _checkPawnActorsWithJumpTriggers(
      allPawnActors,
      gameStatesManager,
      clientSide,
    );
  }

  playAllActorsAnimation(gameStatesManager, deltaTime);
}

//blockCollisions includes block collision from other pawn actors
function _moveActorsAndCheckBlockCollisions(
  allActors,
  allNonActorBlockCollisions,
  clientManager,
  deltaTime,
  checkBlockCollisions = true,
) {
  for (let actor of allActors) {
    if (actor.actorState === CharacterStateTypes.dying) continue;

    let stopChecking = false;

    actor.applyMovement(
      clientManager.gameMapBackgroundCanvasBaseWidth,
      clientManager.gameMapBackgroundCanvasBaseHeight,
      deltaTime,
    );

    if (!checkBlockCollisions) continue;

    for (let _actor of allActors) {
      if (actor === _actor) continue;
      if (_actor.actorState === CharacterStateTypes.dying) continue;

      if (AIsCollidedWithB(actor.collision, _actor.collision)) {
        actor.position = { ...actor.previousPosition };
        stopChecking = true;
        break;
      }
    }

    if (stopChecking) continue;

    for (let collision of allNonActorBlockCollisions) {
      if (AIsCollidedWithB(actor.collision, collision)) {
        //rewind actor position
        actor.position = { ...actor.previousPosition };
        break;
      }
    }
  }
}

function _checkMovingPawnActorsWithWalkingSoundTriggers(
  allPawnActors,
  gameStatesManager,
) {
  allPawnActors.forEach((actor) => {
    if (
      actor.actorState != CharacterStateTypes.walking ||
      actor.actorState === CharacterStateTypes.dying
    )
      return;

    gameStatesManager.mapSoundTriggers.some((trigger) => {
      if (PawnActorIsOnTrigger(actor, trigger)) {
        //console.log("is within sound trigger...", trigger.filename);
        const audios =
          gameStatesManager.tileSoundsBlobDictionary[trigger.stateToTrigger]?.[
            trigger.filename
          ]?.audios;
        if (audios) {
          playAudioRandom(audios);
        }
        return true;
      }
    });
  });
}

function _checkPawnActorsWithJumpTriggers(
  allPawnActors,
  gameStatesManager,
  clientSide,
) {
  allPawnActors.forEach((actor) => {
    if (
      actor.actorState != CharacterStateTypes.jumping &&
      actor.actorState != CharacterStateTypes.dying
    ) {
      gameStatesManager.mapJumpTriggers.some((trigger) => {
        if (PawnActorIsOnTrigger(actor, trigger)) {
          if (
            actor.facingDirection === trigger.jumpDirection &&
            actor.actorState === trigger.stateToTrigger
          ) {
            //console.log("is within jump trigger...", trigger.jumpMagnitude);
            actor.toJumpState(trigger.jumpMagnitude);

            if (actor === gameStatesManager?.playerActor) {
              gameStatesManager.moveCameraToActor(
                gameStatesManager.playerActor,
              );
              gameStatesManager.sanitizeCameraPosition();
            }

            if (clientSide) {
              const audios =
                gameStatesManager.actorSoundsBlobDictionary[actor.actorName]
                  ?.jump;
              if (audios) {
                playAudioRandom(audios);
              }
            }
          }
          return true;
        }
      });
    }
  });
}

//TO-DO: continue the function below
//also, remember to utilize the shouldBeDestroyed flag from playAnimation to destroy the summonedActor...
//all attack and heal collisions are inserted into gameStatesManager.spawnCollisions (including SummonedActor instances)
function _checkPawnActorsWithAttackAndHealCollisions(
  allPawnActors,
  gameStatesManager,
) {
  //summoned actors -> targetActor / targetPosition
  //pawn actors -> lockedTarget

  const spawnCollisions = gameStatesManager.spawnCollisions;

  if (spawnCollisions?.length <= 0) return;

  spawnCollisions.forEach((collision) => {
    switch (collision.collisionType) {
      case CollisionTypes.attackCollision:
        break;

      case CollisionTypes.healCollision:
        break;
    }
  });
}
