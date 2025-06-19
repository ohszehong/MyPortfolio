import Actor from "./Actor.js";
import CharacterStateTypes from "../Standards/StringKeys/CharacterStateTypes.json" with {type: "json"};
import FacingDirections from "../Standards/StringKeys/FacingDirections.json" with {type: "json"};
import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";
import Ability from "../Ability/Ability.js";

export default class PawnActor extends Actor
{
    toJSON()
    {
        let data = super.toJSON();

        data.currentLevel = this.currentLevel;
        data.actorStats = this.actorStats;
        data.actorState = this.actorState;
        data.facingDirection = this.facingDirection;
        data.activeStateAnimationName = this.activeStateAnimationName;
        data.activeAbilityName = this.activeAbilityName;

        return data;
    }

    currentLevel;
    maxLevel;

    actorStats = {};
    
    actorState;

    /** @type {FacingDirections} */
    facingDirection;
    
    /**
    * @typedef {Object<string, DirectionDependentAnimation>} StateAnimations
    */
   
    //state animations are animations that will keep playing whenever the user is in the particular state
    /** @type {StateAnimations} */
    stateAnimations;

    activeStateAnimationName;

    /** @typedef {Object<string, Ability>} Abilities*/

    //Ability contains DirectionDependentAnimation object and the animations play once only
    /** @type {Abilities} */
    Abilities;

    activeAbilityName;

    constructor(tempId, actorName, position, actorStats, actorState, characterAnimationsData, currentLevel = 1, maxLevel = 1, collision = null, selectable = false)
    {
        super(tempId, actorName, position, collision, selectable);

        this.actorStats = {...actorStats};

        let animationSets = {
            idle: null,
            walk: null,
            jump: null,
            receiveDamage: null,
        }

        let abilitySets = {
            attack1: null,
            attack2: null,
            attack3: null,
            heal: null,
        }
        
        Object.values(characterAnimationsData).forEach((key) => {
            if(Object.keys(animationSets).includes(key))
            {
                animationSets[key] = new DirectionDependentAnimation(this, key, characterAnimationsData[key]);
            }
            else if(Object.keys(abilitySets).includes(key))
            {
                abilitySets[key] = new Ability(new DirectionDependentAnimation(this, key, characterAnimationsData[key]), characterAnimationsData[key]?.scalingValue, characterAnimationsData[key]?.scalingType);
            }
        })

        this.stateAnimations = {
            [CharacterStateTypes.idling]: animationSets.idle,
            [CharacterStateTypes.walking]: animationSets.walk,
            [CharacterStateTypes.jumping]: animationSets.jump,
            [CharacterStateTypes.receivingDamage]: animationSets.receiveDamage
        }

        //default montage names
        this.Abilities = {
            attack1: abilitySets.attack1,
            attack2: abilitySets.attack2,
            attack3: abilitySets.attack3,
            heal: abilitySets.heal
        }

        this.activeAbilityName = null;
        this.activeStateAnimationName = "idle";

        this.actorState = actorState;

        this.currentLevel = currentLevel;
        this.maxLevel = maxLevel;
    }

    canChangeState(newState)
    {
        if((this.actorState === CharacterStateTypes.idle || this.actorState === CharacterStateTypes.walking) && this.actorState != newState) return true;
        return false;
    }

    idle(facingDirection = null)
    {
        if(this.canChangeState(CharacterStateTypes.idling))
        {
            if(facingDirection) this.facingDirection = facingDirection;
            this.actorState = CharacterStateTypes.idling;
            this.activeAbilityName = null;
            this.activeStateAnimationName = "idle";
        }
    }

    walk(facingDirection = null)
    {
        if(this.canChangeState(CharacterStateTypes.walking))
        {
            if(facingDirection) this.facingDirection = facingDirection;
            this.actorState = CharacterStateTypes.walking;
            this.activeAbilityName = null;
            this.activeStateAnimationName = "walk";
        }
    }

    jump(facingDirection = null)
    {
        if(this.canChangeState(CharacterStateTypes.jumping))
        {
            if(facingDirection) this.facingDirection = facingDirection;
            this.actorState = CharacterStateTypes.jumping;
            this.activeAbilityName = null;
            this.activeStateAnimationName = "jump";
        }
    }

    attack(facingDirection = null, attackNumber = 1)
    {
        if(this.canChangeState(CharacterStateTypes.usingAbility))
        {
            if(facingDirection) this.facingDirection = facingDirection;
            this.actorState = CharacterStateTypes.usingAbility;
            this.activeAbilityName = "attack" + attackNumber.toString();
            this.activeStateAnimationName = null;
        }
    }
    
    heal(facingDirection = null)
    {
        if(this.canChangeState(CharacterStateTypes.usingAbility))
        {
            if(facingDirection) this.facingDirection = facingDirection;
            this.actorState = CharacterStateTypes.usingAbility;
            this.activeAbilityName = "heal";
            this.activeStateAnimationName = null;
        }
    }

    getCurrentActorData(deltaTime)
    {
        if(this.activeStateAnimationName)
        {
            return {
                ...this.stateAnimations[this.activeStateAnimationName].getCurrentActiveFrameData(deltaTime),
                position: {...this.position}
            }
        }
        else if(this.activeAbilityName)
        {
            const currentActiveFrameData = this.Abilities[this.activeAbilityName].abilityAnimation.getCurrentActiveFrameData(deltaTime);
            const activeAbilityName = this.activeAbilityName;

            //stop playing this animation in the next frame by changing state
            if(currentActiveFrameData.isLastFrame)
            {
                this.actorState = CharacterStateTypes.idling;
                this.idle(); //here it sets this.activeAbilityName to null
            }

            return {
                ...currentActiveFrameData,
                position: {...this.position},
                ability: this.Abilities[activeAbilityName]
            }
        }
    }
}