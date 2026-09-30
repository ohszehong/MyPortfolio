import getDistanceSquaredBetweenTwoActors from "../Generals/getDistanceSquaredBetweenTwoActors.js";
import TargetTypes from "../../../Standards/TargetTypes.json" with { type: "json" };
import CharacterStateTypes from "../../../Standards/CharacterStateTypes.json" with { type: "json" };

//targetDistancePriority -> 0 - nearest, 1 - furthest
export default function getTarget(
  mainPawnActor,
  otherPawnActors,
  targetDistancePriority = 0,
  onSamePath = false,
) {
  if (otherPawnActors?.length <= 0) return null;

  let selectedTarget = null;
  for (const pawnActor of otherPawnActors) {
    if (pawnActor.actorState === CharacterStateTypes.dying) continue;
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
      mainPawnActor.targetType === TargetTypes.ally
        ? targetIsInvalid
        : !targetIsInvalid;

    if (_targetIsInvalid) {
      continue;
    }

    if (!selectedTarget) {
      selectedTarget = pawnActor;
      continue;
    }

    const pawnActorIsCurrentBestTarget =
      targetDistancePriority === 0
        ? pawnActor.position.dx < selectedTarget.position.dx
        : pawnActor.position.dx > selectedTarget.position.dx;
    const _pawnActorIsCurrentBestTarget =
      mainPawnActor.targetType === TargetTypes.ally
        ? pawnActorIsCurrentBestTarget
        : !pawnActorIsCurrentBestTarget;

    if (_pawnActorIsCurrentBestTarget) {
      selectedTarget = pawnActor;
      continue;
    }
  }
  return selectedTarget;
}
