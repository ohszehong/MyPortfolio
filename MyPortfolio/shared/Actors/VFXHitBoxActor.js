import SummonedActor from "./SummonedActor.js";
import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";
import SummonActorTypes from "../Standards/SummonActorTypes.json" with { type: "json" };

export default class VFXHitBoxActor extends SummonedActor {
  toJSON() {
    let data = super.toJSON();
    data.latestVFXAnimationData = this.VFXAnimations.toJSON();
  }

  /** @type {DirectionDependentAnimation} */
  VFXAnimations;

  constructor(VFXHitBoxMetaData) {
    const VFXHitBoxBlobDictionary = VFXHitBoxMetaData.VFXHitBoxBlobDictionary;

    super(
      VFXHitBoxBlobDictionary.staticId,
      VFXHitBoxMetaData.from,
      VFXHitBoxMetaData.VFXName,
      VFXHitBoxMetaData.facingDirection,
      VFXHitBoxMetaData.position,
      VFXHitBoxMetaData.blockCollision,
      VFXHitBoxMetaData.scalingType,
      VFXHitBoxMetaData.scalingValue,
      VFXHitBoxMetaData.targetActor,
      VFXHitBoxMetaData.targetPosition,
      VFXHitBoxMetaData.homing,
      VFXHitBoxMetaData.singleTarget,
      VFXHitBoxMetaData.duration,
    );

    this.summonActorType = SummonActorTypes.VFXHitBox;

    this.VFXAnimations = new DirectionDependentAnimation(
      this,
      VFXHitBoxBlobDictionary.animations.spritesheetFile,
      VFXHitBoxBlobDictionary.animations,
      this.facingDirection,
    );

    if (this.VFXAnimations && VFXHitBoxMetaData.latestAnimationData) {
      const activeAnimation =
        this.VFXAnimations[VFXHitBoxMetaData.facingDirection];

      if (activeAnimation) {
        this.recoverLatestAnimationsData(
          activeAnimation,
          VFXHitBoxMetaData.latestAnimationData,
        );
      }
    }
  }

  static constructVFXHitBoxMetaData(
    from,
    VFXName,
    facingDirection,
    position,
    blockCollision,
    scalingType,
    scalingValue,
    targetActor,
    targetPosition,
    homing,
    singleTarget,
    duration,
    VFXHitBoxBlobDictionary,
    latestAnimationData,
  ) {
    return {
      from: from,
      VFXName: VFXName,
      facingDirection: facingDirection,
      position: position,
      blockCollision: blockCollision,
      scalingType: scalingType,
      scalingValue: scalingValue,
      targetActor: targetActor,
      targetPosition: targetPosition,
      homing: homing,
      singleTarget: singleTarget,
      duration: duration,
      VFXHitBoxBlobDictionary: VFXHitBoxBlobDictionary,
      latestAnimationData: latestAnimationData,
    };
  }

  playAnimation(deltaTime) {
    if (this.duration) {
      this.duration -= deltaTime;
      if (this.duration <= 0) {
        this.shouldBeDestroyed = true;
      }
    }

    if (this.VFXAnimations) {
      const currentActiveFrameData =
        this.VFXAnimations.getCurrentActiveFrameData(deltaTime);

      if (!this.duration && currentActiveFrameData.lastFrameIsCompleted) {
        this.shouldBeDestroyed = true;
      }
      this.updateCurrentRenderData(currentActiveFrameData);
      return this.currentRenderData;
    }

    return {
      collisions: [],
    };
  }

  clearProperties() {
    super.clearProperties();

    this.VFXAnimations = null;
  }
}
