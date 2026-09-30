import CollisionTypes from "../../../Standards/CollisionTypes.json" with { type: "json" };

export default function getAllSpawnedAttackAndHealCollisions(
  gameStatesManager,
) {
  const spawnAttackCollisions = gameStatesManager.spawnCollisions.filter(
    (collision) =>
      collision.collisionType === CollisionTypes.attackCollision ||
      collision.collisionType === CollisionTypes.healCollision,
  );
  const mapAttackCollisions = gameStatesManager.mapCollisions.filter(
    (collision) =>
      collisionType === CollisionTypes.attackCollision ||
      collision.collisionType === CollisionTypes.healCollision,
  );

  return [...spawnAttackCollisions, ...mapAttackCollisions];
}
