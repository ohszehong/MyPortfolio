import getDistanceSquaredBetweenTwoActors from "./getDistanceSquaredBetweenTwoActors";

export default function actorsAreWithinRange(actorA, actorB, range) {
  const distSquared = getDistanceSquaredBetweenTwoActors(actorA, actorB);
  const rangeSquared = range * range;

  return distSquared <= rangeSquared;
}
