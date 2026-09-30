import ProjectileActor from "../../../Actors/ProjectileActor";
import VFXHitBoxActor from "../../../Actors/VFXHitBoxActor";

import SummonActorTypes from "../../../Standards/SummonActorTypes.json" with { type: "json" };

export default function playAllActorsAnimation(gameStatesManager, deltaTime) {
  if (!gameStatesManager) return;

  const playerActor = gameStatesManager.playerActor;
  const allyPawnActors = gameStatesManager.allyPawnActors;
  const enemyPawnActors = gameStatesManager.enemyPawnActors;
  const summonedActors = gameStatesManager.summonedActors;
  const tileActors = gameStatesManager.tileActors;

  //do summonedActors first because new summonedActors might be spawned during pawnActor playAnimation...
  summonedActors.forEach((actor) => {
    const currentFrameData = actor.playAnimation(deltaTime);
    _handleCurrentFrameData(gameStatesManager, actor, currentFrameData);
  });

  if (playerActor) {
    const currentFrameData = playerActor.playAnimation(deltaTime);
    _handleCurrentFrameData(gameStatesManager, playerActor, currentFrameData);
  }

  allyPawnActors.forEach((actor) => {
    const currentFrameData = actor.playAnimation(deltaTime);
    _handleCurrentFrameData(gameStatesManager, actor, currentFrameData);
  });

  enemyPawnActors.forEach((actor) => {
    const currentFrameData = actor.playAnimation(deltaTime);
    _handleCurrentFrameData(gameStatesManager, actor, currentFrameData);
  });

  //currently tileActors do not have any frame data that needs to be processed
  tileActors.forEach((actor) => {
    actor.playAnimation(deltaTime);
  });
}

function _handleCurrentFrameData(gameStatesManager, actor, currentFrameData) {
  if (currentFrameData.collisions?.length > 0) {
    let newCollisionsData = [];

    //rotate collision boxes based on projectile's currentFacingAngleInRadians
    if (actor.summonActorType === SummonActorTypes.Projectile) {
      if (actor.currentFacingAngleInRadians != undefined) {
        const cos = Math.cos(actor.currentFacingAngleInRadians);
        const sin = Math.sin(actor.currentFacingAngleInRadians);

        const rotatedCollisions = currentFrameData.collisions.forEach(
          (collision) => {
            let newCollisionData;
            const ddx2 = collision.ddx + collision.width;
            const ddy2 = collision.ddy - collision.height;

            newCollisionData.rotated = true;

            //these are just the offset, add origin actor position to the corners later
            newCollisionData.corners = [
              [collision.ddx, collision.ddy],
              [ddx2, collision.ddy],
              [ddx2, ddy2],
              [collision.ddx, ddy2],
            ].map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);

            newCollisionsData.push(newCollisionData);
          },
        );
      }
    } else if (actor.summonActorType === SummonActorTypes.VFXHitBox) {
      //if VFXHitBoxActor has a position meaning it can be stretched
      if (actor.position) {
        currentFrameData.collisions.forEach((collision) => {
          let newCollisionData;

          newCollisionData.ddx = collision.ddx;
          newCollisionData.ddy = collision.ddy;
          newCollisionData.height = collision.height;

          const actualWidthToTarget = Math.abs(
            actor.targetedPosition?.dx - actor.position.dx,
          );
          newCollisionData.width = actualWidthToTarget + newCollisionData.ddx;

          newCollisionsData.push(newCollisionData);

          //add currentActualWidth to currentRenderData for rendering
          actor.currentRenderData?.frameData?.spritesheetOffset.currentActualWidth =
            actualWidthToTarget;
        });
      }
    }

    const collisions =
      newCollisionsData.length > 0
        ? newCollisionsData
        : currentFrameData.collisions;
    gameStatesManager.spawnCollisions.push(...collisions);
  }

  if (currentFrameData.summons.length <= 0) return;

  currentFrameData.summons.forEach((summon) => {
    let newSummonedActor = null;

    let scalingType = "none";
    let scalingValue = 1;
    let singleTarget = true;

    if (currentFrameData.ability) {
      scalingType = currentFrameData.ability.scalingType;
      scalingValue = currentFrameData.ability.scalingValue;
      singleTarget = currentFrameData.ability.singleTarget;
    }

    if (summon.projectile) {
      const projectileName = summon.projectile.projectileName;

      const projectileBlobDictionary =
        gameStatesManager.summonActorsBlobDictionary.projectiles[
          projectileName
        ];
      let hitVFXBlobDictionary = null;

      if (summon.hitVFX) {
        hitVFXBlobDictionary =
          gameStatesManager.summonActorsBlobDictionary.hitVFXs[summon.hitVFX];
      }

      const truePosition = {
        dx: actor.position.dx + summon.projectile.x,
        dy: actor.position.dy + summon.projectile.y,
      };

      const travellingSpeed = summon.projectile.travellingSpeed;
      const lockedTarget = actor.lockedTarget;
      const homing = summon.homing;

      const metaData = ProjectileActor.constructProjectileMetaData(
        projectileName,
        actor,
        actor.facingDirection,
        truePosition,
        null,
        scalingType,
        scalingValue,
        lockedTarget,
        null,
        homing,
        singleTarget,
        travellingSpeed,
        null,
        projectileBlobDictionary,
        hitVFXBlobDictionary,
        null,
        null,
      );

      newSummonedActor = new ProjectileActor(metaData);
    } else if (summon.vfx) {
      const VFXHitBoxBlobDictionary =
        gameStatesManager.summonActorsBlobDictionary.vfxs[summon.vfx];

      const lockedTarget = actor.lockedTarget;
      const homing = summon.homing;

      let position = null;

      if (summon.stretchToTarget) {
        //if position is not null for VFXHitBoxActor, it means the VFX will be stretched from said position to targetPosition
        //VFXHitBoxActor can't be rotated as of now, so it can only be stretched in a straight line
        position = {
          dx: actor.position.dx + summon.ddx,
          dy: actor.position.dy + summon.ddy,
        };
      }

      const metaData = VFXHitBoxActor.constructVFXHitBoxMetaData(
        actor,
        summon.vfx,
        actor.facingDirection,
        position,
        null,
        scalingType,
        scalingValue,
        lockedTarget,
        null,
        homing,
        singleTarget,
        null,
        VFXHitBoxBlobDictionary,
        null,
      );

      newSummonedActor = new VFXHitBoxActor(metaData);
    }

    gameStatesManager.summonedActors.push(newSummonedActor);
  });
}
