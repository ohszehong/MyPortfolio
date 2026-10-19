import Actor from "../../../Actors/Actor.js";
import PawnActor from "../../../Actors/PawnActor.js";
import TargetTypes from "../../../Standards/TargetTypes.json" with { type: "json" };

/**
 * @typedef {Object} Collision
 * @property {Actor} source
 * @property {number} collisionType
 * @property {number} ddx
 * @property {number} ddy
 * @property {boolean} active
 * @property {number} target
 * @property {number} width
 * @property {number} height
 */

/** @param {Collision} collisionA @param {Collision} collisionB */
export function AIsCollidedWithB(collisionA, collisionB) {
  if (!isEligible(collisionA, collisionB)) return;

  const [_collisionA, _collisionB] = _extractCollisionA_And_CollisionBForCalc(
    collisionA,
    collisionB,
  );

  //use OBB instead of AABB (if extracted collisions contained array meaning one of them or both are rotated)
  if (Array.isArray(_collisionA)) {
    const collisionACurrentFacingAngleInRadians = collisionA.source
      .currentFacingAngleInRadians
      ? collisionA.source.currentFacingAngleInRadians
      : 0;
    const collisionBCurrentFacingAngleInRadians = collisionB.source
      .currentFacingAngleInRadians
      ? collisionB.source.currentFacingAngleInRadians
      : 0;

    //only projectileActor has currentFacingAngleInRadians property for now
    const axesOfCollisionA = _getAxes(collisionACurrentFacingAngleInRadians);
    const axesOfCollisionB = _getAxes(collisionBCurrentFacingAngleInRadians);

    const axesToTest = [...axesOfCollisionA, ...axesOfCollisionB];

    for (const axis of axesToTest) {
      if (!AIsOverlappedWithBOnAxis(_collisionA, _collisionB, axis)) {
        return false;
      }
    }

    return true;
  }

  //AABB
  return (
    _collisionA.dxEnd >= _collisionB.dx &&
    _collisionA.dx <= _collisionB.dxEnd &&
    _collisionA.dyEnd >= _collisionB.dy &&
    _collisionA.dy <= _collisionB.dyEnd
  );
}

function _getAxes(collisionSourceCurrentFacingAngleInRadians) {
  const cos = Math.cos(collisionSourceCurrentFacingAngleInRadians);
  const sin = Math.sin(collisionSourceCurrentFacingAngleInRadians);

  return [
    { dx: cos, dy: sin },
    { dx: -sin, dy: cos },
  ];
}

function _projectCollisionOnAxis(extractedCollision, axis) {
  let min = Infinity;
  let max = -Infinity;

  for (const corner of extractedCollision) {
    const projection = corner.dx * axis.dx + corner.dy * axis.dy; //dot product
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }

  return { min, max };
}

function AIsOverlappedWithBOnAxis(
  extractedCollisionA,
  extractedCollisionB,
  axis,
) {
  const projA = _projectCollisionOnAxis(extractedCollisionA, axis);
  const projB = _projectCollisionOnAxis(extractedCollisionB, axis);

  return projA.max >= projB.min && projB.max >= projA.min;
}

function _extractCollisionA_And_CollisionBForCalc(collisionA, collisionB) {
  let _collisions = [];
  let collisions = [collisionA, collisionB];

  //the other collision that is compared with the rotated box should have all 4 corners too even if they are not rotated for OBB
  for (let i = 0; i < collisions.length; i++) {
    const collisionSourcePosition = collisions[i].source.position;

    if (collisions[i].corners) {
      _collisions[i] = [
        {
          dx: collisionSourcePosition.dx + collisions[i].corners[0][0],
          dy: collisionSourcePosition.dy - collisions[i].corners[0][1],
        },
        {
          dx: collisionSourcePosition.dx + collisions[i].corners[1][0],
          dy: collisionSourcePosition.dy - collisions[i].corners[1][1],
        },
        {
          dx: collisionSourcePosition.dx + collisions[i].corners[2][0],
          dy: collisionSourcePosition.dy - collisions[i].corners[2][1],
        },
        {
          dx: collisionSourcePosition.dx + collisions[i].corners[3][0],
          dy: collisionSourcePosition.dy - collisions[i].corners[3][1],
        },
      ];
    } else {
      const dx = collisions[i].dx
        ? collisions[i].dx
        : collisionSourcePosition.dx + collisions[i].ddx;
      const dy = collisions[i].dx
        ? collisions[i].dy
        : collisionSourcePosition.dy - collisions[i].ddy;
      const dxEnd = collisions[i].dx
        ? collisions[i].dx + collisions[i].width
        : collisionSourcePosition.dx + collisions[i].ddx + collisions[i].width;
      const dyEnd = collisions[i].dx
        ? collisions[i].dy - collisions[i].height
        : collisionSourcePosition.dy - collisions[i].ddy - collisions[i].height;

      if (collisionA.rotated || collisionB.rotated) {
        _collisions[i] = [
          {
            dx: dx,
            dy: dy,
          },
          {
            dx: dxEnd,
            dy: dy,
          },
          {
            dx: dxEnd,
            dy: dyEnd,
          },
          {
            dx: dx,
            dy: dyEnd,
          },
        ];
      } else {
        _collisions[i] = {
          dx: dx,
          dy: dy,
          dxEnd: dxEnd,
          dyEnd: dyEnd,
        };
      }
    }
  }
  return _collision;
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
    actorCollision.source.position.dy -
    actorCollision.ddy -
    actorCollision.height;

  //Only need to check the bottom left point of the actorCollision
  return (
    actorBottomLeftDx >= trigger.dx &&
    actorBottomLeftDx <= trigger.dx + trigger.width &&
    actorBottomLeftDy >= trigger.dy &&
    actorBottomLeftDy <= trigger.dy - trigger.height
  );
}

function isEligible(A, B) {
  //first check if they are eligible for collision detection
  if (!A?.active || !B?.active) return false;
  else if (A.dx && B.dx) return false; //both are from mapCollisions

  let eligible = false;

  //target -> target against, targetType -> its own target type
  switch (A.target) {
    case TargetTypes.none:
      break;

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
