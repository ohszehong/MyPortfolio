import Actor from "./Actor.js";
import CharacterStateTypes from "../Standards/StringKeys/CharacterStateTypes.json" with { type: "json" };
import FacingDirections from "../Standards/StringKeys/FacingDirections.json" with { type: "json" };
import DirectionDependentAnimation from "../Animation/DirectionDependentAnimation.js";
import Ability from "../Ability/Ability.js";

export default class PawnActor extends Actor {
  toJSON() {
    let data = super.toJSON();

    data.currentLevel = this.currentLevel;
    data.maxLevel = this.maxLevel;
    data.actorCurrentStats = this.actorCurrentStats;
    data.actorDefaultStats = this.actorDefaultStats;
    data.actorState = this.actorState;
    data.facingDirection = this.facingDirection;
    data.activeStateAnimationName = this.activeStateAnimationName;
    data.activeAbilityName = this.activeAbilityName;

    return data;
  }

  previousPosition;

  currentLevel;
  maxLevel;
  motionValues = [];

  actorDefaultStats = {
    health: 0,
    defense: 0,
    attack: 0,
    attackRange: 0,
    movespeed: 0,
    attackspeed: 0,
    healing: 0,
  };

  actorCurrentStats = {
    health: 0,
    defense: 0,
    attack: 0,
    attackRange: 0,
    movespeed: 0,
    attackspeed: 0,
    healing: 0,
  };

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

  constructor(tempId, actorName, position, collision, selectable) {
    super(tempId, actorName, position, collision, selectable);
  }

  //create a new PawnActor
  static constructNewActor(tempId, actorName, position, actorBlobDictionary) {
    const collision = {
      ...actorBlobDictionary.collision,
      target: actorBlobDictionary.targetType,
    };
    const selectable = actorBlobDictionary.selectable;

    const pawnActor = new this(
      tempId,
      actorName,
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
    pawnActor.actorCurrentStats.attackRange =
      pawnActor.actorDefaultStats.attackRange +
      (pawnActor.currentLevel - 1) * motionValues[3];
    pawnActor.actorCurrentStats.movespeed =
      pawnActor.actorDefaultStats.movespeed +
      (pawnActor.currentLevel - 1) * motionValues[4];
    pawnActor.actorCurrentStats.attackspeed =
      pawnActor.actorDefaultStats.attackspeed +
      (pawnActor.currentLevel - 1) * motionValues[5];
    pawnActor.actorCurrentStats.healing =
      pawnActor.actorDefaultStats.healing +
      (pawnActor.currentLevel - 1) * motionValues[6];

    pawnActor.facingDirection = "right"; //default direction

    const characterAnimationsData = actorBlobDictionary.animations;
    pawnActor.initCharacterAnimationsData(characterAnimationsData);

    pawnActor.actorState = CharacterStateTypes.idling;

    pawnActor.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };

    return pawnActor;
  }

  //for existing PawnActors retrieved from the database
  static constructExistingActor(
    tempId,
    actorName,
    position,
    actorState,
    actorCurrentStats,
    actorBlobDictionary,
    currentLevel = 1,
    maxLevel = 1,
    collision = null,
    selectable = false,
  ) {
    const pawnActor = new this(
      tempId,
      actorName,
      position,
      collision,
      selectable,
    );

    pawnActor.actorCurrentStats = actorCurrentStats;
    pawnActor.actorDefaultStats = { ...actorBlobDictionary.defaultStats };
    pawnActor.facingDirection = "right"; //default direction

    pawnActor.initCharacterAnimationsData(actorBlobDictionary.animations);

    pawnActor.actorState = actorState;

    pawnActor.currentLevel = currentLevel;
    pawnActor.maxLevel = maxLevel;

    pawnActor.currentRenderData = {
      animationSpritesheetDirection: null,
      animationSpritesheetName: null,
      frameData: null,
    };

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
        //console.log("adding abilitySets of animation name: ", animationName);
        abilitySets[animationName] = new Ability(
          new DirectionDependentAnimation(
            this,
            animationName,
            characterAnimationsData[animationName],
          ),
          characterAnimationsData[animationName]?.scalingValue,
          characterAnimationsData[animationName]?.scalingType,
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

    this.activeAbilityName = null;
    this.activeStateAnimationName = "idle";
  }

  canChangeState() {
    if (
      this.actorState === CharacterStateTypes.idling ||
      this.actorState === CharacterStateTypes.walking
    )
      return true;
    return false;
  }

  toIdleState(force = false) {
    if (force || this.canChangeState()) {
      this.actorState = CharacterStateTypes.idling;
      this.activeAbilityName = null;
      this.activeStateAnimationName = "idle";
    }
  }

  toWalkState(facingDirection = null) {
    if (!facingDirection) return;
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.walking;
      this.facingDirection = facingDirection;
      this.activeAbilityName = null;
      this.activeStateAnimationName = "walk";
    }
  }

  toJumpState(jumpMagnitude = null) {
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.jumping;
      this.activeAbilityName = null;
      this.activeStateAnimationName = "jump";

      if (jumpMagnitude) this.actorCurrentStats.movespeed = jumpMagnitude;
    }
  }

  toDeathState(force = false) {
    if (force || this.canChangeState()) {
      this.actorState = CharacterStateTypes.dying;
      this.activeAbilityName = null;
      this.activeStateAnimationName = "death";
    }
  }

  toAttackState(attackNumber = 1) {
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.usingAbility;
      this.activeAbilityName = "attack" + attackNumber.toString();
      this.activeStateAnimationName = null;
    }
  }

  toHealingState() {
    if (this.canChangeState()) {
      this.actorState = CharacterStateTypes.usingAbility;
      this.activeAbilityName = "heal";
      this.activeStateAnimationName = null;
    }
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {
    if (
      this.actorState === CharacterStateTypes.walking ||
      this.actorState === CharacterStateTypes.jumping
    ) {
      const deltaPercent = deltaTime / 1000;

      //for rewinding
      this.previousPosition = { ...this.position };

      let mapMaxWidthAfterOffset = mapMaxWidth;
      let mapMaxHeightAfterOffset = mapMaxHeight;
      if (this.collision) {
        mapMaxWidthAfterOffset -= this.collision.width + this.collision.ddx;
        mapMaxHeightAfterOffset -= this.collision.height + this.collision.ddy;
      }

      switch (this.facingDirection) {
        case FacingDirections.up:
          this.position.dy = Math.max(
            0,
            this.position.dy - this.actorCurrentStats.movespeed * deltaPercent,
          );
          break;

        case FacingDirections.down:
          this.position.dy = Math.min(
            mapMaxHeightAfterOffset,
            this.position.dy + this.actorCurrentStats.movespeed * deltaPercent,
          );
          break;

        case FacingDirections.left:
          this.position.dx = Math.max(
            0,
            this.position.dx - this.actorCurrentStats.movespeed * deltaPercent,
          );
          break;

        case FacingDirections.right:
          this.position.dx = Math.min(
            mapMaxWidthAfterOffset,
            this.position.dx + this.actorCurrentStats.movespeed * deltaPercent,
          );
          break;
      }
    }
  }

  playAnimation(deltaTime) {
    if (this.activeStateAnimationName) {
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
          }
          this.toIdleState(true);
        }
      }

      return {
        collisions: currentActiveFrameData.collisions,
        summons: currentActiveFrameData.summons,
      };
    } else if (this.activeAbilityName) {
      const currentActiveFrameData =
        this.Abilities[
          this.activeAbilityName
        ].abilityAnimation.getCurrentActiveFrameData(deltaTime);

      this.currentRenderData.animationSpritesheetDirection =
        currentActiveFrameData.animationSpritesheetDirection;
      this.currentRenderData.animationSpritesheetName =
        currentActiveFrameData.animationSpritesheetName;
      this.currentRenderData.frameData = currentActiveFrameData.frameData;

      //stop playing this animation in the next frame by changing state
      if (currentActiveFrameData.lastFrameIsCompleted) {
        this.toIdleState(true); //here it sets this.activeAbilityName to null
      }

      return {
        collisions: currentActiveFrameData.collisions,
        summons: currentActiveFrameData.summons,
        ability: this.Abilities[this.activeAbilityName],
      };
    }

    return {
      collisions: [],
      summons: [],
    };
  }
}
