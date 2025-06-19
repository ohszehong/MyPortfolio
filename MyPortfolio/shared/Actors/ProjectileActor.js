import Actor from "./Actor.js";
import Animation from "../Animation/Animation.js";

export default class ProjectileActor extends Actor {
  /** @type {Actor} */
  from;

  /** @type {Actor} */
  targetActor;

  scalingType;
  scalingValue;

  //whether follow targetActor till the end or just the initial position
  homing;
  singleTarget;

  hasReachedTarget;

  travellingSpeed;

  /** @type {Animation} */
  travellingAnimation;

  /** @type {Animation} */
  hitAnimation;

  constructor(
    tempId,
    actorName,
    startPosition,
    collision,
    travellingSpeed,
    from,
    scalingType,
    scalingValue,
    targetActor,
    travellingAnimationSpritesheetName = null,
    travellingAnimationFrames = [],
    hitAnimationSpritesheetName = null,
    hitAnimationFrames = [],
    singleTarget = false,
    homing = false
  ) {
    super(tempId, actorName, startPosition, collision, false);

    this.travellingSpeed = travellingSpeed;

    this.scalingType = scalingType;
    this.scalingValue = scalingValue;

    this.from = from;
    this.targetActor = targetActor;

    this.travellingAnimation = new Animation(this, travellingAnimationSpritesheetName, travellingAnimationFrames);
    this.hitAnimation = new Animation(this, hitAnimationSpritesheetName, hitAnimationFrames);
    this.singleTarget = singleTarget;
    this.homing = homing;
    this.hasReachedTarget = false;
  }

  getCurrentActorData(deltaTime) {
    //default
    let data = super.getCurrentActorData(deltaTime);

    if (!this.hasReachedTarget) {
      //travel here...
      if (this.travellingAnimation) {
        data = {...this.travellingAnimation.getCurrentActiveFrameData(deltaTime), ...data.position};
        data.collisions = [...this.collision, ...data.collisions];
      } 
    } else {
      if (this.hitAnimation) {
        data = this.hitAnimation.getCurrentActiveFrameData(deltaTime);
      }
    }
    return data;
  }
}
