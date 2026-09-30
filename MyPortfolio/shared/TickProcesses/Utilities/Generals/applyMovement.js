import FacingDirections from "../../../Standards/FacingDirections.json" with { type: "json" };
import SummonActorTypes from "../../../Standards/SummonActorTypes.json" with { type: "json" };

export default function applyMovement(
  actor,
  mapMaxWidth,
  mapMaxHeight,
  deltaTime,
) {
  const deltaPercent = deltaTime / 1000;
  const actorMovespeed = actor.actorCurrentStats.movespeed;

  //for rewinding
  actor.previousPosition = { ...actor.position };

  if (actor.summonActorType === SummonActorTypes.Projectile) {
    //only update target position if homing is true, otherwise use the same target position
    if (actor.homing) {
      actor.updateTargetPositionBasedOnTargetActor();
    }

    //check with summonedActor's targetActor dy instead of its targetPosition that has been centered
    if (actor?.targetActor?.position?.dy != actor.from?.position?.dy) {
      //rotate only if the target is not on the same path
      const currentTargetedPosition = actor.targetPosition;

      const vecX = currentTargetedPosition.dx - actor.position.dx;
      const vecY = currentTargetedPosition.dy - actor.position.dy;

      //get angle in radians toward target
      const targetAngle = Math.atan2(vecY, vecX);

      //snap to the targetAngle instantly in the beginning
      if (actor.currentFacingAngleInRadians === undefined)
        actor.currentFacingAngleInRadians = targetAngle;

      let diff = targetAngle - actor.currentFacingAngleInRadians;
      diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
      const maxStep = actor.angularSpeed * deltaPercent;
      actor.currentFacingAngleInRadians += Math.max(
        -maxStep,
        Math.min(maxStep, diff),
      );

      actor.position.dx +=
        Math.cos(actor.currentFacingAngleInRadians) *
        actor.actorCurrentStats.movespeed *
        deltaPercent;
      actor.position.dy +=
        Math.sin(actor.currentFacingAngleInRadians) *
        actor.actorCurrentStats.movespeed *
        deltaPercent;
      return;
    }
  } else if (actor.summonActorType === SummonActorTypes.VFXHitBox) {
    if (actor.homing) {
      actor.updateTargetPositionBasedOnTargetActor();
    }
    return;
  }

  let mapMaxWidthAfterOffset = mapMaxWidth;
  let mapMaxHeightAfterOffset = mapMaxHeight;
  if (actor.collision) {
    mapMaxWidthAfterOffset -= actor.collision.width + actor.collision.ddx;
    mapMaxHeightAfterOffset -= actor.collision.height + actor.collision.ddy;
  }

  switch (actor.facingDirection) {
    case FacingDirections.up:
      actor.position.dy = Math.max(
        0,
        actor.position.dy - actorMovespeed * deltaPercent,
      );
      break;

    case FacingDirections.down:
      actor.position.dy = Math.min(
        mapMaxHeightAfterOffset,
        actor.position.dy + actorMovespeed * deltaPercent,
      );
      break;

    case FacingDirections.left:
      actor.position.dx = Math.max(
        0,
        actor.position.dx - actorMovespeed * deltaPercent,
      );
      break;

    case FacingDirections.right:
      actor.position.dx = Math.min(
        mapMaxWidthAfterOffset,
        actor.position.dx + actorMovespeed * deltaPercent,
      );
      break;
  }
}
