import { AIsCollidedWithB } from "../CollisionsDetector/CollisionsDetector.js";

export default function processTick_General(clientManager, deltaTime)
{
  clientManager.handleSpawnCollisionsLifetime(deltaTime);
  clientManager.playAllActorsAnimation(deltaTime);

  const allNonPawnActorBlockCollisions = clientManager.getAllNonPawnActorBlockCollisions();
  const allPawnActors = clientManager.getAllPawnActors();

  _checkPawnActorsWithCollisions(allPawnActors, allNonPawnActorBlockCollisions, clientManager, deltaTime);
}

function _checkPawnActorsWithCollisions(pawnActors, collisions, clientManager, deltaTime)
{
  for(let actor of pawnActors)
  {
    actor.applyMovement(
      clientManager.gameMapBackgroundCanvasBaseWidth,
      clientManager.gameMapBackgroundCanvasBaseHeight,
      deltaTime
    );

    for(let collision of collisions)
    {
      if(collision.source === actor) continue;


      if(AIsCollidedWithB(actor.collision, collision))
      {
        //rewind actor position
        actor.position = {...actor.previousPosition};
        break;
      }
    }
  }
}
