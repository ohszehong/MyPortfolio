export function handleSpawnCollisionsLifetime(gameStatesManager, deltaTime) {
  for (let i = gameStatesManager.spawnCollisions.length - 1; i >= 0; i--) {
    const collision = gameStatesManager.spawnCollisions[i];

    if (!collision.duration || collision.duration <= 0) {
      gameStatesManager.spawnCollisions.splice(i, 1);
      continue;
    }

    collision.duration -= deltaTime;
  }
}

export function handleActorsLifetime(gameStatesManager) {
  //currently there's no game that allows playerActor to be removed, so skip that
  _removeActors(gameStatesManager.allyPawnActors);
  _removeActors(gameStatesManager.enemyPawnActors);
  _removeActors(gameStatesManager.summonedActors);
}

function _removeActors(actorsArray) {
  if (actorsArray.length <= 0) return;

  for (let i = actorsArray.length - 1; i >= 0; i--) {
    const actor = actorsArray[i];

    if (actor.shouldBeDestroyed) {
      actor.destroy();
      actorsArray.splice(i, 1);
    }
  }
}
