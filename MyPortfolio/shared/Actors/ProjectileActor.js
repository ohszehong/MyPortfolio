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

  hasReachedTarget = false;

  //prevent multi-hit
  attackedPawnActorList = [];

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
    if (this.duration) {
      this.duration -= deltaTime;
      if (this.duration <= 0) {
        this.shouldBeDestroyed = true;
      }
    }

    let currentActiveFrameData = null;

    if (!this.hasReachedTarget) {
      //travel here...
      if (this.travellingAnimations) {
        currentActiveFrameData =
          this.travellingAnimations.getCurrentActiveFrameData(deltaTime);
      }
    } else {
      if (this.hitAnimations) {
        currentActiveFrameData =
          this.hitAnimations.getCurrentActiveFrameData(deltaTime);

        //right now hit animation has no collision at all, it's just for the effect
        if (!this.duration && currentActiveFrameData.lastFrameIsCompleted) {
          this.shouldBeDestroyed = true;
        }
      } else {
        this.shouldBeDestroyed = true;
      }
    }

    if (currentActiveFrameData) {
      this.updateCurrentRenderData(currentActiveFrameData);
      return this.currentRenderData;
    }

    return {
      collisions: [],
    };
  }

  clearProperties() {
    super.clearProperties();

    this.travellingAnimations = null;
    this.hitAnimations = null;
    this.angularSpeed = null;
    this.currentFacingAngleInRadians = null;
    this.hasReachedTarget = null;
  }
}
