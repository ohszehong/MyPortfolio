export default function handleSpawnCollisionsLifetime(
  gameStatesManager,
  deltaTime,
) {
  gameStatesManager.spawnCollisions.forEach((collision, index) => {
    if (!collision.duration || collision.duration <= 0) {
      gameStatesManager.spawnCollisions.splice(index, 1);
      return;
    }

    collision.duration -= deltaTime;
  });
}
