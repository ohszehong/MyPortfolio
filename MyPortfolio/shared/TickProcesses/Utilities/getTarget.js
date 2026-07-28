import getDistanceSquaredBetweenTwoActors from "./getDistanceSquaredBetweenTwoActors.js";
import TargetTypes from "../../Standards/StringKeys/TargetTypes.json" with { type: "json" };

//get furthest target if nearest = false
export function getTarget(
  mainPawnActor,
  otherPawnActors,
  nearest = true,
  onSamePath = false,
) {
  if (otherPawnActors?.length <= 0) return null;

  let selectedTarget = null;
  for (const pawnActor of otherPawnActors) {
    if (mainPawnActor.tempId === pawnActor.tempId) {
      continue;
    }

    if (onSamePath) {
      if (mainPawnActor.position.dy != pawnActor.position.dy) {
        continue;
      }
    }

    //do not consider actor that walk passed/behind (based on their target type) the main actor as they are not able to turn back
    const targetIsInvalid =
      pawnActor.position.dx - mainPawnActor.position.dx < 0;
    const _targetIsInvalid =
      mainPawnActor.collision.targetType === TargetTypes.ally
        ? targetIsInvalid
        : !targetIsInvalid;

    if (_targetIsInvalid) {
      continue;
    }

    if (!selectedTarget) {
      selectedTarget = pawnActor;
      continue;
    }

    const pawnActorIsCurrentBestTarget = nearest
      ? pawnActor.position.dx < selectedTarget.position.dx
      : pawnActor.position.dx > selectedTarget.position.dx;
    const _pawnActorIsCurrentBestTarget =
      mainPawnActor.collision.targetType === TargetTypes.ally
        ? pawnActorIsCurrentBestTarget
        : !pawnActorIsCurrentBestTarget;

    if (_pawnActorIsCurrentBestTarget) {
      selectedTarget = pawnActor;
      continue;
    }
  }
  return selectedTarget;
}

export function targetIsWithinRange(actorA, actorB, range) {
  const distSquared = getDistanceSquaredBetweenTwoActors(actorA, actorB);
  const rangeSquared = range * range;

  return distSquared <= rangeSquared;
}
