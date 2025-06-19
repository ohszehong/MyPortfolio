import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";

export default class Ability 
{
    /** @type {DirectionDependentAnimation} */
    abilityAnimation;

    scalingValue;
    scalingType;

    constructor(abilityAnimation, scalingValue = 1, scalingType = "attack")
    {
        this.abilityAnimation = abilityAnimation;
        this.scalingValue = scalingValue;
        this.scalingType = scalingType
    }
}