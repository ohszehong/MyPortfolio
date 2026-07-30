// import GameStatesManager from "../../server/GameStatesManager/GameStatesManager.js";
// import ClientStatesManager from "../../src/ClientStatesManager/ClientStatesManager.js";
import PawnActor from "../Actors/PawnActor.js";

export default class DefenseMarchCassetteSignalsManager {
  // /** @type {GameStatesManager | ClientStatesManager} */
  statesManager = null;

  constructor(statesManager) {
    this.statesManager = statesManager;
  }

  spawnPawnActorAtLocation(tempId, actorName, position) {
    const actorBlobData =
      this.statesManager.pawnActorsBlobDictionary[actorName];

    let result = {
      pawnActor: null,
      message: null,
      success: false,
    };

    if (actorBlobData) {
      const pawnActorCost =
        actorBlobData.currentLevel * actorBlobData.goldCoins;

      if (this.statesManager.goldCoins < pawnActorCost) {
        result.message = `Insufficient gold coins to spawn ${actorName}.`;
      } else if (
        this.statesManager.currentTotalUnits ===
        this.statesManager.maxTotalUnits
      ) {
        result.message = "Can't deploy more unit.";
      } else {
        result.pawnActor = PawnActor.constructNewActor(
          tempId,
          actorName,
          position,
          actorBlobData,
        );

        if (result.pawnActor) {
          this.statesManager.allyPawnActors.push(result.pawnActor);
          this.statesManager.goldCoins -= pawnActorCost;
          this.statesManager.currentTotalUnits += 1;

          result.success = true;
          result.message = `Successfully spawn ${actorName} at x: ${position.dx} y: ${position.dy}`;
        }
      }
    }
    return result;
  }

  upgradePawnActor(actorName) {
    //the upgrade should not work for the current pawns on field, it should only be affecting the new generated pawns
    let result = {
      message: null,
      success: false,
    };

    const actorBlobDictionary =
      this.statesManager.pawnActorsBlobDictionary[actorName];

    if (actorBlobDictionary) {
      if (actorBlobDictionary.currentLevel < actorBlobDictionary.maxLevel) {
        const actorUpgradeCost =
          actorBlobDictionary.currentLevel * actorBlobDictionary.goldCoins;

        if (this.statesManager.goldCoins - actorUpgradeCost >= 0) {
          this.statesManager.goldCoins -= actorUpgradeCost;
          actorBlobDictionary.currentLevel += 1;
          result.message = `Successfully upgraded ${actorName}`;
          result.success = true;
        } else {
          result.message = `Insufficient gold coins to upgrade ${actorName}`;
        }
      } else {
        result.message = `Unable to upgrade, ${actorName} is already at max level.`;
      }
    }

    return result;
  }
}
