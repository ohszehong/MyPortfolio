import getDistanceSquaredBetweenTwoActors from "./getDistanceSquaredBetweenTwoActors";

export default function getNearestTarget(mainPawnActor, allyPawnActors, enemyPawnActors, targetType = "ally", onSamePath = false, shouldConsiderAttackRange = false)
{
    let nearestTarget = {
        pawnActor: null,
        distSquared: null
    };
    let pawnActors

    if(targetType === TargetTypes.all)
    {
      pawnActors = [...allyPawnActors, ...enemyPawnActors];
    }
    else if(targetType === TargetTypes.ally)
    {
      pawnActors = allyPawnActors;
    }
    else if(targetType === TargetTypes.enemy)
    {
      pawnActors = enemyPawnActors;
    }
    else
    {
      console.log("Invalid Target Type. From 'getNearestTarget' method in DefenseMarchPawnActorAIProcessor.js.");
      return null;
    }

    if(pawnActors?.length <= 0) return null;

    pawnActors.forEach((pawnActor) => {
        if(mainPawnActor.tempId === pawnActor.tempId) continue;

        if(onSamePath)
        {
           if(mainPawnActor.position.dy != pawnActor.position.dy)
            {
              continue;
            }
        }

        const distSquared = getDistanceSquaredBetweenTwoActors(mainPawnActor, pawnActor);

        if(shouldConsiderAttackRange)
        {
            const range = mainPawnActor.actorCurrentStats.attackRange;
            if(distSquared > (range * range))
            {
                continue;
            }
        }

        if(!nearestTarget.pawnActor || distSquared < nearestTarget.distSquared)
        {
            nearestTarget = {
                pawnActor: pawnActor,
                distSquared: distSquared
            };
        }
    })

    return nearestTarget.pawnActor;
}
