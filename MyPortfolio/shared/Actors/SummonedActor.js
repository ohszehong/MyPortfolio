import PawnActor from "./PawnActor";
import Actor from "./Actor";
import applyMovement from "../TickProcesses/Utilities/Generals/applyMovement";

export default class SummonedActor extends Actor {
  toJSON() {
    let data = super.toJSON();

    ((data.from = this.from.tempId),
      (data.summonActorType = this.summonActorType),
      (data.targetActor = this.targetActor.tempId),
      (data.targetPosition = this.targetPosition),
      (data.singleTarget = this.singleTarget),
      (data.actorDefaultStats = this.actorDefaultStats),
      (data.actorCurrentStats = this.actorCurrentStats),
      (data.shouldBeDestroyed = this.shouldBeDestroyed),
      (data.duration = this.duration)((data.scalingType = this.scalingType))(
        (data.scalingValue = this.scalingValue),
      ),
      (data.rotatedAngleInRadians = this.rotatedAngleInRadians));

    return data;
  }

  //  "scalingValue": 1.1,
  //       "scalingType": "attack",
  //       "range": 40,
  //       "targetDistancePriority": 0,
  //       "target": 1,
  //       "singleTarget": false,

  /** @type {PawnActor} */
  from;

  summonActorType;

  //if targetActor is null, then use targetPosition (targetPosition can be used as a fallback when the targetActor is removed e.g. died halfway through)
  /** @type {PawnActor} */
  targetActor;
  targetPosition;

  singleTarget;

  scalingValue;
  scalingType;

  actorDefaultStats = {
    attack: 0,
    movespeed: 0,
  };

  actorCurrentStats = {
    attack: 0,
    movespeed: 0,
  };

  homing;

  duration; //if null -> 1) Projectile will stay until reached its target 2) VFXHitBox will stay until end of the animation

  constructor(
    staticId,
    from,
    actorName,
    facingDirection,
    startingPosition,
    blockCollision,
    scalingType,
    scalingValue,
    targetActor,
    targetPosition,
    homing = false,
    singleTarget = false,
    duration = null,
  ) {
    if (!from) {
      console.log(
        "Invalid 'from' parameter. Error when constructing ProjectileActor.",
      );
      return;
    }
    const tempId = `${from.tempId}${staticId}`;

    super(staticId, tempId, actorName, startingPosition, blockCollision, false);

    this.from = from;
    this.facingDirection = facingDirection;

    this.scalingType = scalingType;
    this.scalingValue = scalingValue;

    const baseScalarValue = this.from.actorCurrentStats[scalingType];

    if (baseScalarValue) {
      const totalScalarValue = baseScalarValue * scalingValue;

      this.actorDefaultStats.attack = totalScalarValue;
      this.actorCurrentStats.attack = totalScalarValue;
    }

    this.targetActor = targetActor;

    if (!targetPosition) {
      this.updateTargetPositionBasedOnTargetActor();
    } else {
      this.targetPosition = targetPosition;
    }

    this.homing = homing;
    this.singleTarget = singleTarget;

    this.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };

    this.duration = duration;
  }

  updateTargetPositionBasedOnTargetActor() {
    if (this.targetActor) {
      this.targetPosition = {
        dx:
          this.targetActor?.position?.dx +
          this.targetActor?.collision?.ddx +
          this.targetActor?.collision?.width / 2,
        dy:
          this.targetActor?.position?.dy -
          this.targetActor?.collision?.ddy +
          this.targetActor?.collision?.height / 2,
      };
    }
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {
    applyMovement(this, mapMaxWidth, mapMaxHeight, deltaTime);
  }
}
