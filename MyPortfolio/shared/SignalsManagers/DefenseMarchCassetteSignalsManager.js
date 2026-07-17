// import GameStatesManager from "../../server/GameStatesManager/GameStatesManager.js";
// import ClientStatesManager from "../../src/ClientStatesManager/ClientStatesManager.js";
import PawnActor from "../Actors/PawnActor.js";

export default class DefenseMarchCassetteSignalsManager {
  // /** @type {GameStatesManager | ClientStatesManager} */
  statesManager = null;

  constructor(statesManager) {
    this.statesManager = statesManager;
  }

  spawnPawnActorAtLocation(
    actorName,
    position,
    tempId = null /* tempId param for server */,
  ) {
    const actorBlobData =
      this.statesManager.pawnActorsBlobDictionary[actorName];

    let pawnActor = null;

    if (actorBlobData) {
      const pawnActorCost =
        actorBlobData.currentLevel * actorBlobData.goldCoins;

      if (this.statesManager.goldCoins < pawnActorCost) {
        console.log("Insufficient gold coins.");
      } else if (
        this.statesManager.currentTotalUnits ===
        this.statesManager.maxTotalUnits
      ) {
        console.log("can't deploy more unit.");
      } else {
        pawnActor = PawnActor.constructNewActor(
          tempId,
          actorName,
          position,
          actorBlobData,
        );

        this.statesManager.allyPawnActors.push(pawnActor);
        this.statesManager.goldCoins -= pawnActorCost;
      }
    }
    return pawnActor;
  }
}
