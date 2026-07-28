import Actor from "../Actors/Actor.js";
import PawnActor from "../Actors/PawnActor.js";
import TargetTypes from "../Standards/StringKeys/TargetTypes.json" with { type: "json" };

/**
 * @typedef {Object} Collision
 * @property {Actor} source
 * @property {string} collisionType
 * @property {number} ddx
 * @property {number} ddy
 * @property {boolean} active
 * @property {string} target
 * @property {number} width
 * @property {number} height
 */

/** @param {Collision} collisionA @param {Collision} collisionB */
export function AIsCollidedWithB(
  collisionA,
  collisionB,
  collisionType = "AABB",
) {
  if (collisionType === "AABB") {
    if (!isEligible(collisionA, collisionB)) return;

    //mapCollisions uses dx instead of ddx, same goes for dy
    let _collisionA;
    let _collisionB;

    if (collisionA.dx) {
      _collisionA = {
        dx: collisionA.dx,
        dy: collisionA.dy,
        dxEnd: collisionA.dx + collisionA.width,
        dyEnd: collisionA.dy + collisionA.height,
      };
    } else {
      _collisionA = {
        dx: collisionA.source.position.dx + collisionA.ddx,
        dy: collisionA.source.position.dy + collisionA.ddy,
        dxEnd:
          collisionA.source.position.dx + collisionA.ddx + collisionA.width,
        dyEnd:
          collisionA.source.position.dy + collisionA.ddy + collisionA.height,
      };
    }

    if (collisionB.dx) {
      _collisionB = {
        dx: collisionB.dx,
        dy: collisionB.dy,
        dxEnd: collisionB.dx + collisionB.width,
        dyEnd: collisionB.dy + collisionB.height,
      };
    } else {
      _collisionB = {
        dx: collisionB.source.position.dx + collisionB.ddx,
        dy: collisionB.source.position.dy + collisionB.ddy,
        dxEnd:
          collisionB.source.position.dx + collisionB.ddx + collisionB.width,
        dyEnd:
          collisionB.source.position.dy + collisionB.ddy + collisionB.height,
      };
    }

    return (
      _collisionA.dxEnd >= _collisionB.dx &&
      _collisionA.dx <= _collisionB.dxEnd &&
      _collisionA.dyEnd >= _collisionB.dy &&
      _collisionA.dy <= _collisionB.dyEnd
    );
  }
}

/**
 * @typedef {Object} TriggerData
 * @property {number} dx
 * @property {number} dy
 * @property {boolean} active
 * @property {string} target
 * @property {number} width
 * @property {number} height
 */

//Use to check if PawnActor is stepping on Trigger
/** @param {TriggerData} trigger */
export function PawnActorIsOnTrigger(actor, trigger) {
  const actorCollision = actor.collision;

  if (!isEligible(actorCollision, trigger)) return;

  const actorBottomLeftDx =
    actorCollision.source.position.dx + actorCollision.ddx;
  const actorBottomLeftDy =
    actorCollision.source.position.dy +
    actorCollision.ddy +
    actorCollision.height;

  //Only need to check the bottom left point of the actorCollision
  return (
    actorBottomLeftDx >= trigger.dx &&
    actorBottomLeftDx <= trigger.dx + trigger.width &&
    actorBottomLeftDy >= trigger.dy &&
    actorBottomLeftDy <= trigger.dy + trigger.height
  );
}

function isEligible(A, B) {
  //first check if they are eligible for collision detection
  if (!A.active || !B.active) return false;
  else if (A.dx && B.dx) return false; //both are from mapCollisions

  let eligible = false;

  switch (A.targetType) {
    case TargetTypes.all:
      if (B.targetType != TargetTypes.none) eligible = true;
      break;

    case TargetTypes.ally:
      if (B.targetType === TargetTypes.all || B.targetType === TargetTypes.ally)
        eligible = true;
      break;

    case TargetTypes.enemy:
      if (
        B.targetType === TargetTypes.all ||
        B.targetType === TargetTypes.enemy
      )
        eligible = true;
      break;
  }

  return eligible;
}
