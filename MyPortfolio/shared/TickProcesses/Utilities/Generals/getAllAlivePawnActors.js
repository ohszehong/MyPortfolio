import CharacterStateTypes from "../../../Standards/CharacterStateTypes.json" with { type: "json" };

export default function getAllAlivePawnActors(gameStatesManager) {
  let allPawnActors = [
    ...gameStatesManager.allyPawnActors,
    ...gameStatesManager.enemyPawnActors,
  ];

  if (gameStatesManager.playerActor) {
    allPawnActors.unshift(gameStatesManager.playerActor);
  }

  allPawnActors = allPawnActors.filter(
    (pawnActor) => pawnActor.actorState != CharacterStateTypes.dying,
  );

  return allPawnActors;
}
