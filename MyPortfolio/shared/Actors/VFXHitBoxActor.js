import Actor from "./Actor.js";
import Animation from "../Animation/Animation.js";

export default class VFXHitBoxActor extends Actor
{
  /** @type {Actor} */
  targetActor;
  singleTarget;

  /** @type {Animation} */
  animation;

  constructor(
    tempId,
    actorName,
    collision,
    animation,
    targetActor,
    singleTarget = false
  ) {
    const position = {...targetActor.position};

    super(tempId, actorName, position, collision, false);

    this.targetActor = targetActor;
    this.singleTarget = singleTarget;
    this.animation = animation;
  }

  getCurrentActorData(deltaTime)
  {
    if(this.animation)
    {
      let data = {...this.animation.getCurrentActiveFrameData(deltaTime)};

      data.collisions = [...this.collision, ...data.collisions];
      data.position = {...this.position};

      return data;
    }
    return super.getCurrentActorData(deltaTime);
  }
}