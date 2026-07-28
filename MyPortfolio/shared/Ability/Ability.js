import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";

export default class Ability {
  /** @type {DirectionDependentAnimation} */
  abilityAnimation;

  scalingValue;
  scalingType;
  range;
  target;
  targetDistancePriority; //0 = nearest, 1 = furthest
  singleTarget;

  constructor(
    abilityAnimation,
    range,
    target = "all",
    targetDistancePriority = 0,
    scalingValue = 1,
    scalingType = "attack",
    singleTarget = false,
  ) {
    this.abilityAnimation = abilityAnimation;

    this.scalingValue = scalingValue;
    this.scalingType = scalingType;
    this.range = range;
    this.target = target;
    this.targetDistancePriority = targetDistancePriority;
    this.singleTarget = singleTarget;
  }
}
