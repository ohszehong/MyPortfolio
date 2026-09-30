export default function getDistanceSquaredBetweenTwoActors(actorA, actorB) {
  const distX = actorB.position.dx - actorA.position.dx;
  const distY = actorB.position.dy - actorA.position.dy;

  const distSquared = distX * distX + distY * distY;
  return distSquared;
}
