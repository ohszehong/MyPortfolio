import getTarget from "./getTarget";
import actorsAreWithinRange from "../Generals/actorsAreWithinRange";

import TargetTypes from "../../../Standards/TargetTypes.json" with { type: "json" };
import AbilityTypes from "../../../Standards/AbilityTypes.json" with { type: "json" };
import CharacterStateTypes from "../../../Standards/CharacterStateTypes.json" with { type: "json" };

//all pawn actors target and movement
//pawn actor should only walk straight on their path and cannot change their path
//range pawn actor can attack/heal other path pawn actors
export default function processTick_DefenseMarchSpecific() {
  const mapHalfWidth = this.gameMapBackgroundCanvasBaseWidth / 2;
  const allAllyPawnActors = this.gameStatesManager.allyPawnActors;
  const allEnemyPawnActors = this.gameStatesManager.enemyPawnActors;

  const allPawnActors = [...allAllyPawnActors, ...allEnemyPawnActors];
  /* ---------------------------------------------------------------- */

  allPawnActors.forEach((pawnActor) => {
    _determineAIPawnActorState(
      pawnActor,
      allPawnActors,
      allAllyPawnActors,
      allEnemyPawnActors,
      mapHalfWidth,
    );
  });
}

function _determinePotentialTargetBasedOnUsableAbilities(
  pawnActor,
  usableAbilities,
  allPawnActors,
  allAllyPawnActors,
  allEnemyPawnActors,
) {
  let data = {
    target: null,
    targetIsInRange: false,
    selectedAbility: null,
  };

  if (usableAbilities?.length > 0) {
    let potentialTargets = allPawnActors;
    if (potentialTargets.length <= 0) return data;

    let finalTarget = null;
    let i = 0;
    for (const ability of usableAbilities) {
      if (ability.target === TargetTypes.ally) {
        potentialTargets = allAllyPawnActors;
      } else if (ability.target === TargetTypes.enemy) {
        potentialTargets = allEnemyPawnActors;
      } else if (ability.target === TargetTypes.all) {
        potentialTargets = allPawnActors;
      }

      const onSamePath = ability?.onSamePath
        ? ability.onSamePath
        : ability.melee;

      finalTarget = getTarget(
        pawnActor,
        potentialTargets,
        ability.targetDistancePriority,
        onSamePath,
      );

      if (!finalTarget) return data;

      const targetIsInRange = actorsAreWithinRange(
        pawnActor,
        finalTarget,
        ability.range,
      );

      if (targetIsInRange) {
        data.target = finalTarget;
        data.targetIsInRange = targetIsInRange;
        data.selectedAbility = ability;

        return data;
      }

      if (!targetIsInRange) {
        //reached last ability
        if (i === usableAbilities.length - 1) {
          data.target = finalTarget;
          return data;
        }

        i++;
        continue;
      }
    }
  }
  return data;
}

function _dictatesStateOnCooldownWithoutTarget(pawnActor, mapHalfWidth) {
  if (pawnActor.targetType === TargetTypes.ally) {
    if (pawnActor.position.dx < mapHalfWidth) {
      pawnActor.toWalkState(pawnActor.facingDirection);
    } else {
      pawnActor.toIdleState();
    }
  } else if (pawnActor.targetType === TargetTypes.enemy) {
    //might need to create a gate with hp or some condition to lose the game
    if (pawnActor.position.dx > mapHalfWidth) {
      pawnActor.toWalkState(pawnActor.facingDirection);
    } else {
      pawnActor.toIdleState();
    }
  }
}

function _determineAIPawnActorState(
  pawnActor,
  allPawnActors,
  allAllyPawnActors,
  allEnemyPawnActors,
  mapHalfWidth,
) {
  if (!pawnActor) return;

  //if the pawnActor is currently using ability means it has a lockedTarget that is within range before, therefore do nothing until the ability animation is ended
  if (
    pawnActor.orderedAbilities?.length <= 0 ||
    pawnActor.actorState >= CharacterStateTypes.jumping
  ) {
    return;
  }

  let usableAbilities = [];

  usableAbilities = pawnActor.orderedAbilities.filter((ability) => {
    if (
      !ability.repeatable &&
      ability.abilityIndex === pawnActor.previousActiveAbilityIndex
    ) {
      return false;
    }
    return true;
  });

  if (usableAbilities.length > 0) {
    const data = _determinePotentialTargetBasedOnUsableAbilities(
      pawnActor,
      usableAbilities,
      allPawnActors,
      allAllyPawnActors,
      allEnemyPawnActors,
    );

    //has target and is in range
    if (data.targetIsInRange) {
      if (pawnActor.canUseAbility()) {
        pawnActor.lockedTarget = data.target;
        pawnActor.useAbility(data.selectedAbility.abilityIndex);
      } else {
        pawnActor.lockedTarget = data.target;
        pawnActor.toIdleState();
      }
      return;
    } else {
      if (data.target) {
        pawnActor.toWalkState(pawnActor.facingDirection);
        return;
      }

      _dictatesStateOnCooldownWithoutTarget(pawnActor, mapHalfWidth);
    }
  }
}
