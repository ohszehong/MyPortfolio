import CollisionTypes from "../../../Standards/CollisionTypes.json" with { type: "json" };

export default function getAllNonActorBlockCollisions(gameStatesManager) {
  const spawnBlockCollisions = gameStatesManager.spawnCollisions.filter(
    (collision) => collision.collisionType === CollisionTypes.blockCollision,
  );

  const mapBlockCollisions = gameStatesManager.mapCollisions.filter(
    (collision) => collision.collisionType === CollisionTypes.blockCollision,
  );

  return [...spawnBlockCollisions, ...mapBlockCollisions];
}
