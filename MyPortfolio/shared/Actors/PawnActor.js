import Actor from "./Actor.js";

import CharacterStateTypes from "../Standards/CharacterStateTypes.json" with { type: "json" };
import FacingDirections from "../Standards/FacingDirections.json" with { type: "json" };
import AbilityTypes from "../Standards/AbilityTypes.json" with { type: "json" };

import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";
import Ability from "../Ability/Ability.js";
import applyMovement from "../TickProcesses/Utilities/Generals/applyMovement.js";

export default class PawnActor extends Actor {
  toJSON() {
    let data = super.toJSON();

    data.currentLevel = this.currentLevel;
    data.maxLevel = this.maxLevel;
    data.actorCurrentStats = this.actorCurrentStats;
    data.actorDefaultStats = this.actorDefaultStats;
    data.actorState = this.actorState;
    data.activeStateAnimationName = this.activeStateAnimationName;
    data.activeAbilityIndex = this.activeAbilityIndex;
    data.previousActiveAbilityIndex = this.previousActiveAbilityIndex;
    data.notUsingAbilityFor = this.notUsingAbilityFor;

    //save latest animation data on active state animation or active ability
    if (this.activeStateAnimationName) {
      data.latestActiveAnimationData =
        this.stateAnimations[this.activeStateAnimationName].toJSON();
    } else {
      const abilityName = this._convertAbilityIndexToAbilityName(
        this.activeAbilityIndex,
      );
      const latestActiveAbilityAnimationData =
        this.Abilities[abilityName]?.toJSON();

      if (latestActiveAbilityAnimationData)
        data.latestActiveAnimationData = latestActiveAbilityAnimationData;
    }

    return data;
  }

  _convertAbilityIndexToAbilityName(abilityIndex) {
    switch (abilityIndex) {
      case 0:
        return "attack1";

      case 1:
        return "attack2";

      case 2:
        return "attack3";

      case 3:
        return "heal";
    }
  }

  currentLevel;
  maxLevel;
  motionValues = [];

  actorDefaultStats = {
    health: 0,
    defense: 0,
    attack: 0,
    movespeed: 0,
    attackspeed: 0,
    healing: 0,
  };

  actorCurrentStats = {
    health: 0,
    defense: 0,
    attack: 0,
    movespeed: 0,
    attackspeed: 0,
    healing: 0,
  };

  actorState;

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
  orderedAbilities = [];

  previousActiveAbilityIndex;
  activeAbilityIndex;

  //this is the delta time use for keep track with the attack speed before the character is able to use ability again
  //_notUsingAbilityFor has to initialized equal to the actor current attack speed so that they can immediately use ability upon summoned
  notUsingAbilityFor;

  lockedTarget;

  constructor(
    staticId,
    tempId,
    actorName,
    facingDirection,
    position,
    collision,
    selectable,
  ) {
    super(
      staticId,
      tempId,
      actorName,
      facingDirection,
      position,
      collision,
      selectable,
    );
  }

  //create a new PawnActor
  static constructNewActor(
    tempId,
    actorName,
    facingDirection,
    position,
    actorBlobDictionary,
  ) {
    const collision = {
      ...actorBlobDictionary.collision,
      targetType: actorBlobDictionary.targetType,
    };
    const selectable = actorBlobDictionary.selectable;

    const pawnActor = new this(
      actorBlobDictionary.staticId,
      tempId,
      actorName,
      facingDirection,
      position,
      collision,
      selectable,
    );

    pawnActor.currentLevel = actorBlobDictionary.currentLevel;
    pawnActor.maxLevel = actorBlobDictionary.maxLevel;

    pawnActor.actorDefaultStats = { ...actorBlobDictionary.defaultStats };
    const motionValues = actorBlobDictionary.motionValues;

    pawnActor.actorCurrentStats.health =
      pawnActor.actorDefaultStats.health +
      (pawnActor.currentLevel - 1) * motionValues[0];
    pawnActor.actorCurrentStats.defense =
      pawnActor.actorDefaultStats.defense +
      (pawnActor.currentLevel - 1) * motionValues[1];
    pawnActor.actorCurrentStats.attack =
      pawnActor.actorDefaultStats.attack +
      (pawnActor.currentLevel - 1) * motionValues[2];
    pawnActor.actorCurrentStats.movespeed =
      pawnActor.actorDefaultStats.movespeed +
      (pawnActor.currentLevel - 1) * motionValues[3];
    pawnActor.actorCurrentStats.attackspeed =
      pawnActor.actorDefaultStats.attackspeed +
      (pawnActor.currentLevel - 1) * motionValues[4];
    pawnActor.actorCurrentStats.healing =
      pawnActor.actorDefaultStats.healing +
      (pawnActor.currentLevel - 1) * motionValues[5];

    pawnActor.facingDirection = facingDirection;

    const characterAnimationsData = actorBlobDictionary.animations;
    pawnActor.initCharacterAnimationsData(characterAnimationsData);

    pawnActor.actorState = CharacterStateTypes.idling;

    pawnActor.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };

    pawnActor.notUsingAbilityFor =
      pawnActor.actorCurrentStats.attackspeed * 1000;

    pawnActor.lockedTarget = null;

    return pawnActor;
  }

  //for existing PawnActors retrieved from the database
  static constructExistingActor(
    existingActorData,
    actorBlobDictionary, //default data
  ) {
    const pawnActor = new this(
      existingActorData.staticId,
      existingActorData.tempId,
      existingActorData.actorName,
      existingActorData.facingDirection,
      existingActorData.position,
      existingActorData.collision,
      existingActorData.selectable,
    );

    pawnActor.actorCurrentStats = existingActorData.actorCurrentStats;
    pawnActor.actorDefaultStats = { ...actorBlobDictionary.defaultStats };
    pawnActor.facingDirection = existingActorData.facingDirection;

    pawnActor.initCharacterAnimationsData(actorBlobDictionary.animations);

    pawnActor.actorState = existingActorData.actorState;

    pawnActor.currentLevel = existingActorData.currentLevel;
    pawnActor.maxLevel = existingActorData.maxLevel;

    pawnActor.activeStateAnimationName =
      existingActorData.activeStateAnimationName;
    pawnActor.activeAbilityIndex = existingActorData.activeAbilityIndex;
    pawnActor.previousActiveAbilityIndex =
      existingActorData.previousActiveAbilityIndex;

    const latestActiveAnimationData =
      existingActorData.latestActiveAnimationData;

    if (latestActiveAnimationData) {
      if (pawnActor.stateAnimations && pawnActor.activeStateAnimationName) {
        const pawnActorActiveStateAnimation =
          pawnActor.stateAnimations[pawnActor.activeStateAnimationName];

        if (pawnActorActiveStateAnimation) {
          pawnActor.recoverLatestAnimationsData(
            pawnActorActiveStateAnimation,
            latestActiveAnimationData,
          );
        }
      } else if (pawnActor.Abilities && pawnActor.activeAbilityIndex) {
        const abilityName = pawnActor._convertAbilityIndexToAbilityName(
          pawnActor.activeAbilityIndex,
        );

        const pawnActorActiveAbilityAnimation =
          pawnActor.Abilities[abilityName].abilityAnimation;

        if (pawnActorActiveAbilityAnimation) {
          pawnActor.recoverLatestAnimationsData(
            pawnActorActiveAbilityAnimation,
            latestActiveAnimationData,
          );
        }
      }
    }

    //this will be updated during playAnimation
    pawnActor.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };

    //don't have to save lockedTarget Id, just let the ticker set the target back again
    pawnActor.lockedTarget = null;

    pawnActor.notUsingAbilityFor = existingActorData.notUsingAbilityFor;

    return pawnActor;
  }

  initCharacterAnimationsData(characterAnimationsData) {
    let animationSets = {
      idle: null,
      walk: null,
      jump: null,
      death: null,
      receiveDamage: null,
    };

    let abilitySets = {
      attack1: null,
      attack2: null,
      attack3: null,
      heal: null,
    };

    Object.keys(characterAnimationsData).forEach((animationName) => {
      if (Object.keys(animationSets).includes(animationName)) {
        //console.log("adding animationSets of animation name: ", animationName);
        animationSets[animationName] = new DirectionDependentAnimation(
          this,
          animationName,
          characterAnimationsData[animationName],
        );
      } else if (Object.keys(abilitySets).includes(animationName)) {
        const animationData = characterAnimationsData[animationName];

        const scalarValue =
          animationData.scalingValue *
          this.actorCurrentStats[animationData.scalingType];

        abilitySets[animationName] = new Ability(
          AbilityTypes[animationName],
          new DirectionDependentAnimation(
            this,
            animationName,
            characterAnimationsData[animationName],
          ),
          animationData.range,
          animationData.melee,
          scalarValue,
          animationData.target,
          animationData.targetDistancePriority,
          animationData.scalingValue,
          animationData.scalingType,
          animationData.singleTarget,
          animationData.repeatable,
        );
      }
    });

    this.stateAnimations = {
      idle: animationSets.idle,
      walk: animationSets.walk,
      jump: animationSets.jump,
      death: animationSets.death,
      receiveDamage: animationSets.receiveDamage,
    };

    //default montage names
    this.Abilities = {
      attack1: abilitySets.attack1,
      attack2: abilitySets.attack2,
      attack3: abilitySets.attack3,
      heal: abilitySets.heal,
    };

    this.activeAbilityIndex = null;
    this.activeStateAnimationName = "idle";
  }

  initAbilitiesOrder() {
    const abilitiesArray = Object.values(this.Abilities);
    abilitiesArray.sort(
      (ability1, ability2) => ability1.range - ability2.range,
    );

    this.orderedAbilities = abilitiesArray;
  }

  canChangeState() {
    if (this.actorState >= CharacterStateTypes.jumping) return false;
    return true;
  }

  canUseAbility() {
    if (this.notUsingAbilityFor >= this.actorCurrentStats.attackspeed * 1000) {
      return true;
    }
    return false;
  }

  toIdleState(force = false) {
    if (force || this.canChangeState()) {
      this.actorState = CharacterStateTypes.idling;
      this.activeAbilityIndex = null;
      this.activeStateAnimationName = "idle";
    }
  }

  toWalkState(facingDirection = null) {
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.walking;
      this.facingDirection = facingDirection
        ? facingDirection
        : this.facingDirection;
      this.activeAbilityIndex = null;
      this.activeStateAnimationName = "walk";
    }
  }

  toJumpState(jumpMagnitude = null) {
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.jumping;
      this.activeAbilityIndex = null;
      this.activeStateAnimationName = "jump";

      if (jumpMagnitude) this.actorCurrentStats.movespeed = jumpMagnitude;
    }
  }

  toDeathState(force = true) {
    if (force || this.canChangeState()) {
      this.actorState = CharacterStateTypes.dying;
      this.activeAbilityIndex = null;
      this.activeStateAnimationName = "death";
    }
  }

  toAttackState(attackAbilityIndex = 0) {
    if (this.canChangeState() && this.canUseAbility()) {
      this.actorState = CharacterStateTypes.usingAbility;
      this.activeAbilityIndex = attackAbilityIndex;
      this.previousActiveAbilityIndex = this.activeAbilityIndex;
      this.activeStateAnimationName = null;
    }
  }

  toHealingState() {
    if (this.canChangeState() && this.canUseAbility()) {
      this.actorState = CharacterStateTypes.usingAbility;
      this.activeAbilityIndex = 3;
      this.previousActiveAbilityIndex = this.activeAbilityIndex;
      this.activeStateAnimationName = null;
    }
  }

  useAbility(abilityIndex) {
    if (abilityIndex < 0 || abilityIndex > 3) return;

    if (abilityIndex === 3) {
      this.toHealingState();
      return;
    }

    this.toAttackState(abilityIndex);
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {
    if (
      this.actorState === CharacterStateTypes.walking ||
      this.actorState === CharacterStateTypes.jumping
    ) {
      applyMovement(this, mapMaxWidth, mapMaxHeight, deltaTime);
    }
  }

  playAnimation(deltaTime) {
    if (this.activeStateAnimationName) {
      this._notUsingAbilityFor = Math.min(
        this.notUsingAbilityFor + deltaTime,
        this.actorCurrentStats.attackspeed * 1000,
      );

      const currentActiveFrameData =
        this.stateAnimations[
          this.activeStateAnimationName
        ].getCurrentActiveFrameData(deltaTime);

      this.currentRenderData.animationSpritesheetDirection =
        currentActiveFrameData.animationSpritesheetDirection;
      this.currentRenderData.animationSpritesheetName =
        currentActiveFrameData.animationSpritesheetName;
      this.currentRenderData.frameData = currentActiveFrameData.frameData;

      if (
        this.activeStateAnimationName != "walk" &&
        this.activeStateAnimationName != "idle"
      ) {
        if (currentActiveFrameData.lastFrameIsCompleted) {
          if (this.activeStateAnimationName === "jump") {
            this.actorCurrentStats.movespeed = this.actorDefaultStats.movespeed;
            this.toIdleState(true);
          } else if (this.activeStateAnimationName === "death") {
            this.shouldBeDestroyed = true;
          }
        }
      }

      return {
        collisions: currentActiveFrameData.collisions,
        summons: currentActiveFrameData.summons,
      };
    } else if (Number.isFinite(this.activeAbilityIndex)) {
      const abilityName = Object.keys(this.Abilities)[this.activeAbilityIndex];
      const currentActiveFrameData =
        this.Abilities[abilityName].abilityAnimation.getCurrentActiveFrameData(
          deltaTime,
        );

      this.currentRenderData.animationSpritesheetDirection =
        currentActiveFrameData.animationSpritesheetDirection;
      this.currentRenderData.animationSpritesheetName =
        currentActiveFrameData.animationSpritesheetName;
      this.currentRenderData.frameData = currentActiveFrameData.frameData;

      //stop playing this animation in the next frame by changing state
      if (currentActiveFrameData.lastFrameIsCompleted) {
        this.toIdleState(true); //here it sets this.activeAbilityIndex to null
        this._notUsingAbilityFor = 0;
      }

      return {
        collisions: currentActiveFrameData.collisions,
        summons: currentActiveFrameData.summons,
        ability: this.Abilities[abilityName],
      };
    }

    return {
      collisions: [],
      summons: [],
    };
  }
}
