import ClientStatesManager from "../../src/ClientStatesManager/ClientStatesManager";
import PawnActor from "../Actors/PawnActor";

export default class DefenseMarchCassetteInputHandler {
  /** @type {ClientStatesManager} */
  clientManager = null;

  constructor(clientManager) {
    this.clientManager = clientManager;
  }

  spawnActorAtLocation(actorName, position) {
    const actorBlobData =
      this.clientManager.pawnActorsBlobDictionary[actorName];

    if (actorBlobData) {
      if (
        this.clientManager.goldCoins <
        actorBlobData.currentLevel * actorBlobData.goldCoins
      ) {
        console.log("Insufficient gold coins.");
      } else {
        //TO-DO: the PawnActor class might not need the currentStats parameter, probably just the motionValues...
        //const actor = new PawnActor(null, actorName, position, actorBlobData.defaultStats, )
      }
    }
  }
}
