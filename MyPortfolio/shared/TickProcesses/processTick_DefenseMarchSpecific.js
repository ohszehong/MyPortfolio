//all pawn actors target and movement
//pawn actor should only walk straight on their path and cannot change their path
//range pawn actor can attack/heal other path pawn actors
export default function processTick_DefenseMarchSpecific() {
  const allPawnActors = [
    ...this.gameStatesManager.allyPawnActors,
    ...this.gameStatesManager.enemyPawnActors,
  ];

  //check if any target is in range
  allPawnActors.forEach((pawnActor) => {
    switch (pawnActor.actorName) {
      case "cleric":
        break;
    }
  });
}

//future TO-DO: right now we have done checking for block collisions and we also make sure that every collisions from animation are inserted into this.spawnCollisions
//next TO-DO: settle the projectile actor and vfx hitbox actor...
