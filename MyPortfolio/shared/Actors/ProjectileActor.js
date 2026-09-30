import SummonedActor from "./SummonedActor.js";
import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";
import SummonActorTypes from "../Standards/SummonActorTypes.json" with { type: "json" };
export default class ProjectileActor extends SummonedActor {
  toJSON() {
    let data = super.toJSON();

    data.hasReachedTarget = this.hasReachedTarget;

    if (this.travellingAnimations) {
      data.latestTravellingAnimationData = this.travellingAnimations.toJSON();
    }

    if (this.hitAnimations) {
      data.latestHitAnimationData = this.hitAnimations.toJSON();
    }
  }

  /** @type {DirectionDependentAnimation} */
  travellingAnimations;

  /** @type {DirectionDependentAnimation} */
  hitAnimations;

  angularSpeed = 1; //experimental, for now default to 1
  currentFacingAngleInRadians;

  hasReachedTarget;

  constructor(projectileMetaData) {
    const latestTravellingAnimationData =
      projectileMetaData.latestTravellingAnimationData;
    const latestHitAnimationData = projectileMetaData.latestHitAnimationData;
    const projectileBlobDictionary =
      projectileMetaData.projectileBlobDictionary;
    const hitVFXBlobDictionary = projectileMetaData.hitVFXBlobDictionary;

    super(
      projectileBlobDictionary.staticId,
      projectileMetaData.from,
      projectileMetaData.projectileName,
      projectileMetaData.facingDirection,
      projectileMetaData.position,
      projectileMetaData.blockCollision,
      projectileMetaData.scalingType,
      projectileMetaData.scalingValue,
      projectileMetaData.targetActor,
      projectileMetaData.targetPosition,
      projectileMetaData.homing,
      projectileMetaData.singleTarget,
      projectileMetaData.duration,
    );

    this.summonActorType = SummonActorTypes.Projectile;

    this.actorDefaultStats.movespeed = projectileMetaData.travellingSpeed;
    this.actorCurrentStats.movespeed = projectileMetaData.travellingSpeed;

    this.initProjectileAnimationsData(
      projectileBlobDictionary,
      hitVFXBlobDictionary,
    );

    if (latestTravellingAnimationData) {
      const activeTravellingAnimation =
        this.travellingAnimations[projectileMetaData.facingDirection];

      if (activeTravellingAnimation) {
        this.recoverLatestAnimationsData(
          activeTravellingAnimation,
          latestTravellingAnimationData,
        );
      }
    }

    if (latestHitAnimationData) {
      const activeHitAnimation =
        this.hitAnimations[projectileMetaData.facingDirection];

      if (activeHitAnimation) {
        this.recoverLatestAnimationsData(
          activeHitAnimation,
          latestHitAnimationData,
        );
      }
    }

    //let playAnimation update it
    this.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };
  }

  static constructProjectileMetaData(
    projectileName,
    from,
    facingDirection,
    position,
    blockCollision,
    scalingType,
    scalingValue,
    targetActor,
    targetPosition,
    homing,
    singleTarget,
    travellingSpeed,
    duration,
    projectileBlobDictionary,
    hitVFXBlobDictionary,
    latestTravellingAnimationData,
    latestHitAnimationData,
  ) {
    return {
      projectileName: projectileName,
      from: from,
      facingDirection: facingDirection,
      position: position,
      blockCollision: blockCollision,
      scalingType: scalingType,
      scalingValue: scalingValue,
      targetActor: targetActor,
      targetPosition: targetPosition,
      homing: homing,
      singleTarget: singleTarget,
      travellingSpeed: travellingSpeed,
      duration: duration,
      projectileBlobDictionary: projectileBlobDictionary,
      hitVFXBlobDictionary: hitVFXBlobDictionary,
      latestTravellingAnimationData: latestTravellingAnimationData,
      latestHitAnimationData: latestHitAnimationData,
    };
  }

  initProjectileAnimationsData(projectileBlobDictionary, hitVFXBlobDictionary) {
    if (projectileBlobDictionary) {
      this.travellingAnimations = new DirectionDependentAnimation(
        this,
        projectileBlobDictionary.animations.spritesheetFile,
        projectileBlobDictionary.animations,
        this.facingDirection,
      );
    }

    if (hitVFXBlobDictionary) {
      this.hitAnimations = new DirectionDependentAnimation(
        this,
        hitVFXBlobDictionary.animations.spritesheetFile,
        hitVFXBlobDictionary.animations,
        this.facingDirection,
      );
    }
  }

  playAnimation(deltaTime) {
    if (duration) {
      duration -= deltaTime;
      if (duration <= 0) {
        this.shouldBeDestroyed = true;
      }
    }

    let data = {
      collisions: [],
    };

    let currentRenderData = null;

    if (!this.hasReachedTarget) {
      //travel here...
      if (this.travellingAnimations) {
        currentRenderData =
          this.travellingAnimations.getCurrentActiveFrameData(deltaTime);

        data.collisions = currentRenderData.collisions;
      }
    } else {
      if (this.hitAnimations) {
        currentRenderData =
          this.hitAnimations.getCurrentActiveFrameData(deltaTime);

        //right now hit animation has no collision at all, it's just for the effect
        if (!duration && currentRenderData.lastFrameIsCompleted) {
          this.shouldBeDestroyed = true;
        }
      } else {
        this.shouldBeDestroyed = true;
      }
    }

    if (currentRenderData) {
      this.currentRenderData.animationSpritesheetDirection =
        currentRenderData.animationSpritesheetDirection;
      this.currentRenderData.animationSpritesheetName =
        currentRenderData.animationSpritesheetName;
      this.currentRenderData.frameData = currentRenderData.frameData;
    }

    return data;
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {
    super.applyMovement(mapMaxWidth, mapMaxHeight, deltaTime);

    if (this.targetActor) {
    } else if (this.targetPosition) {
    }
  }

  _getAngleInRadiansTowardsAPosition(position) {
    //TO-DO:
    //current flow -> 1) we get the target first for projectile -> 2) then we get the rotation towards the target in applyMovement -> 3) then we apply the rotation on the attack collision during playAnimation
    //something to consider -> right now there's only two points after the rotation, the bottom left (ddx, ddy) and the top right (ddx2, ddy2)
    //we probably need to have 4 points instead for the AABB operations...
    //also remember that our position starts from bottom left instead of top left, and moving downward is positive Y instead of negative Y...

    //To be used in drawImage
    function drawRotatedImage(ctx, img, x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Draw image centered at the rotated origin
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
  }
}
