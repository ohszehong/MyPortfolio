import { AIsCollidedWithB } from "../CollisionsDetector/CollisionsDetector.js";
import { playAudio, playAudioRandom } from "./audioHandlers.js";

import playAllActorsAnimation from "./playAllActorsAnimation.js";
import getAllAlivePawnActors from "./getAllAlivePawnActors.js";
import getAllNonActorBlockCollisions from "./getAllNonActorBlockCollisions.js";
import getAllSpawnedAttackAndHealCollisions from "./getAllSpawnedAttackAndHealCollisions.js";
import {
  handleSpawnCollisionsLifetime,
  handleActorsLifetime,
} from "./handleCollisionsAndActorsLifetime.js";

import CharacterStateTypes from "../../../Standards/CharacterStateTypes.json" with { type: "json" };
import CollisionTypes from "../../../Standards/CollisionTypes.json" with { type: "json" };
import TargetTypes from "../../../Standards/TargetTypes.json" with { type: "json" };
import SummonActorTypes from "../../../Standards/SummonActorTypes.json" with { type: "json" };

export default function processTick_General(
  gameStatesManager,
  deltaTime,
  checkBlockCollisions = true,
  checkAttackAndHealCollisions = false,
  checkSoundTriggers = false,
  checkJumpTriggers = false,
  clientSide = true,
) {
  handleSpawnCollisionsLifetime(gameStatesManager, deltaTime);
  handleActorsLifetime(gameStatesManager);

  const allNonActorBlockCollisions =
    getAllNonActorBlockCollisions(gameStatesManager);
  const allAlivePawnActors = getAllAlivePawnActors(gameStatesManager);

  const allActors = gameStatesManager.summonedActors.concat(
    gameStatesManager.tileActors,
    allAlivePawnActors,
  );

  if (!allActors || allActors.length <= 0) return;

  if (checkAttackAndHealCollisions) {
    const allAttackAndHealCollisions =
      getAllSpawnedAttackAndHealCollisions(gameStatesManager);
    _checkAttackAndHealCollisions(
      allAlivePawnActors,
      allAttackAndHealCollisions,
    );
  }

  _moveActorsAndCheckBlockCollisions(
    allActors,
    allNonActorBlockCollisions,
    gameStatesManager,
    deltaTime,
    checkBlockCollisions,
  );

  if (checkSoundTriggers && clientSide) {
    _checkMovingPawnActorsWithWalkingSoundTriggers(
      allAlivePawnActors,
      gameStatesManager,
    );
  }

  if (checkJumpTriggers) {
    _checkPawnActorsWithJumpTriggers(
      allAlivePawnActors,
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
    if (actor.actorState >= CharacterStateTypes.dying) continue;

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

function _checkAttackAndHealCollisions(
  allAlivePawnActors,
  allAttackAndHealCollisions,
) {
  allAttackAndHealCollisions.forEach((collision) => {
    const isSummonedActor = collision.abilityRef ? false : true;
    const ref = isSummonedActor ? collision.source : collision.abilityRef;
    const isSingleTarget = ref.singleTarget;

    allAlivePawnActors.some((pawnActor) => {
      //prevent projectile multi-hitting - other attacks are fine as their collision only appear once throughout their lifetime
      if (
        isSummonedActor &&
        ref.summonActorType === SummonActorTypes.Projectile
      ) {
        if (ref.attackedPawnActorList.includes(pawnActor)) return false;
      }

      const shouldCheckWithTargetActorOnly = isSummonedActor
        ? isSingleTarget && ref.homing
        : isSingleTarget;

      let skipTargetChecking = false;

      if (shouldCheckWithTargetActorOnly) {
        const collisionTargetActor = isSummonedActor
          ? ref.targetActor
          : collision.source.lockedTarget;

        if (pawnActor != collisionTargetActor) {
          //skip current actor
          return false;
        }

        //skip target checking if it is the targeted actor
        skipTargetChecking = true;
      }

      //if pawnActor is attacked to death mid-way during this loop, skip all pawn actors for single+homing projectile
      if (pawnActor.actorState === CharacterStateTypes.dying) {
        if (skipTargetChecking) {
          return true;
        }
        return false;
      }

      if (!skipTargetChecking) {
        const collisionTarget = isSummonedActor
          ? ref.targetActor?.collision?.targetType
          : ref.target;

        if (collisionTarget != TargetTypes.all) {
          if (collisionTarget != pawnActor.collision?.targetType) {
            //skip
            return false;
          }
        }
      }

      const actorCollision = pawnActor.collision;
      if (actorCollision) {
        if (AIsCollidedWithB(collision, actorCollision)) {
          let scalarValue = 0;

          if (ref) {
            scalarValue = ref.scalarValue;
          }

          switch (collision.collisionType) {
            case CollisionTypes.attackCollision:
              const actorDefense = pawnActor.actorCurrentStats.defense;
              pawnActor.actorCurrentStats.health -= Math.max(
                1,
                scalarValue - actorDefense,
              );
              if (pawnActor.actorCurrentStats.health <= 0) {
                pawnActor.toDeathState(true);
              }
              break;

            case CollisionTypes.healCollision:
              const actorMaxHealth = pawnActor.actorDefaultStats.health;
              pawnActor.actorCurrentStats.health = Math.min(
                actorMaxHealth,
                pawnActor.actorCurrentStats.health + scalarValue,
              );
              break;
          }

          //for homing projectile/single target melee attack
          if (pawnActor === ref.targetActor) {
            if (ref.hasReachedTarget === false && ref.homing) {
              ref.hasReachedTarget = true;
            }
            if (isSingleTarget) {
              return true;
            }
            return false;
          }
        }
      }
    });
    //for non-singleTarget projectile, destroy it if it reached its targetPosition
    if (isSummonedActor && ref.hasReachedTarget === false) {
      //reference
      // newCollisionData.corners = [
      //         [collision.ddx, collision.ddy],
      //         [ddx2, collision.ddy],
      //         [ddx2, ddy2],
      //         [collision.ddx, ddy2],
      //       ].map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
      const [c0, c1, , c3] = collision.corners;

      //two edges leaving corner c0
      const ax = c1[0] - c0[0];
      const ay = c1[1] - c0[1];
      const bx = c3[0] - c0[0];
      const by = c3[1] - c0[1];

      //vector from c0 to the targetPosition
      const dx = px - c0.x;
      const dy = py - c0.y;

      //dot product - imagine flattening the dx/dy vector to the two edges leaving corner c0 and check whether they are within the edges
      const projA = dx * ax + dy * ay;
      const projB = dx * bx + dy * by;

      if (
        projA >= 0 &&
        projA <= ax * ax + ay * ay &&
        projB >= 0 &&
        projB <= bx * bx + by * by
      ) {
        ref.hasReachedTarget = true;
      }
    }
  });
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
