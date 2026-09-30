import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";

export default class Ability {
  abilityIndex;

  /** @type {DirectionDependentAnimation} */
  abilityAnimation;

  scalingValue;
  scalingType;
  scalarValue;

  range;
  melee;
  target;
  targetDistancePriority; //0 = nearest, 1 = furthest
  singleTarget;

  repeatable;

  constructor(
    abilityIndex,
    abilityAnimation,
    range,
    melee,
    scalarValue,
    target = 3,
    targetDistancePriority = 0,
    scalingValue = 1,
    scalingType = "attack",
    singleTarget = false,
    repeatable = false,
  ) {
    this.abilityIndex = abilityIndex;
    this.abilityAnimation = abilityAnimation;

    this.scalingValue = scalingValue;
    this.scalingType = scalingType;

    this.scalarValue = scalarValue;

    this.range = range;
    this.melee = melee;
    this.target = target;
    this.targetDistancePriority = targetDistancePriority;
    this.singleTarget = singleTarget;
    this.repeatable = repeatable;
  }
}
