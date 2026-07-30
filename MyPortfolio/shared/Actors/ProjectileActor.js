import PawnActor from "./PawnActor.js";
import Animation from "../Animation/Animation.js";

export default class ProjectileActor extends Actor {
  //  "scalingValue": 1.1,
  //       "scalingType": "attack",
  //       "range": 40,
  //       "targetDistancePriority": 0,
  //       "target": "ally",
  //       "singleTarget": false,

  /** @type {PawnActor} */
  from;
  projectileName;

  //either one of this is filled, if targetActor it means it will followed the targetActor position (homing) else it will move to the initial target position.
  /** @type {PawnActor} */
  targetActor;
  targetPosition;

  scalarValue;

  singleTarget;

  travellingSpeed;

  /** @type {Animation} */
  travellingAnimation;

  /** @type {Animation} */
  hitAnimation;

  //TO-DO: add summons (projectiles or vfxhitbox data such as animation data into pawnActorsBlobDictionary)

  constructor(
    tempId,
    from,
    projectileName,
    startingPosition,
    collision,
    travellingSpeed,
    scalingType,
    scalingValue,
    targetActor,
    targetPosition,
    travellingAnimationSpritesheetName = null,
    travellingAnimationFrames = [],
    hitAnimationSpritesheetName = null,
    hitAnimationFrames = [],
    singleTarget = false,
  ) {
    super(tempId, projectileName, startingPosition, collision, false);

    this.travellingSpeed = travellingSpeed;

    this.from = from;

    if (this.from) {
      const baseScalarValue = this.from.actorCurrentStats[scalingType];

      if (baseScalarValue) {
        this.scalarValue = baseScalarValue * scalingValue;
      }
    }

    this.projectileName = projectileName;

    this.targetActor = targetActor;
    this.targetPosition = targetPosition;

    this.travellingAnimation = new Animation(
      this,
      travellingAnimationSpritesheetName,
      travellingAnimationFrames,
    );
    this.hitAnimation = new Animation(
      this,
      hitAnimationSpritesheetName,
      hitAnimationFrames,
    );
    this.singleTarget = singleTarget;
  }

  getCurrentActorData(deltaTime) {
    //default
    let data = super.getCurrentActorData(deltaTime);

    if (!this.hasReachedTarget) {
      //travel here...
      if (this.travellingAnimation) {
        data = {
          ...this.travellingAnimation.getCurrentActiveFrameData(deltaTime),
          ...data.position,
        };
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
