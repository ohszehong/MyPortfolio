export default function getAllPawnActors(gameStatesManager) {
  let allPawnActors = [
    ...gameStatesManager.allyPawnActors,
    ...gameStatesManager.enemyPawnActors,
  ];

  if (gameStatesManager.playerActor) {
    allPawnActors.unshift(gameStatesManager.playerActor);
  }

  return allPawnActors;
}
