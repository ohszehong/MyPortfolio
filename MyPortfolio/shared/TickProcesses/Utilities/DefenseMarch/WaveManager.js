import PawnActor from "../../../Actors/PawnActor";

export default class WaveManager {
  DELAY_BEFORE_NEXT_WAVE = 5000;
  WAVES_PER_BOSS_WAVE = 5;
  NON_BOSS_ENEMIES_DUPLICATION_PER_WAVE = 2;

  gameStatesManager;
  wavesList;

  currentDelayed = 0;

  constructor(gameStatesManager) {
    this.gameStatesManager = gameStatesManager;

    //wave boss list            //wave mobs list
    //1 - battleMage            //1 - bat
    //2 - demonSlime            //2 - arcaneArcher
    //3 - fireWorm              //3 - ancientGolem
    //4 - huntress              //4 - skullWolf
    //5 - lostWarrior           //5 - evilWizard
    //6 - rogueSamurai          //6 - hermitCrab

    //boss always spawn at the middle lane
    this.wavesList = [
      {
        top: [],
        middle: ["bat", "bat", "bat", "arcaneArcher", "arcaneArcher"],
        bottom: [],
      },
      {
        top: ["bat", "", "arcaneArcher"],
        middle: ["bat", "bat", "arcaneArcher"],
        bottom: ["bat", "", "arcaneArcher"],
      },
      {
        top: ["bat", "arcaneArcher", "arcaneArcher"],
        middle: ["bat", "bat", "evilWizard"],
        bottom: ["bat", "arcaneArcher"],
      },
      {
        top: ["bat", "", "ancientGolem", "arcaneArcher"],
        middle: ["ancientGolem", "arcaneArcher", "", "evilWizard"],
        bottom: ["bat", "", "ancientGolem", "arcaneArcher"],
      },
      {
        top: ["ancientGolem", "bat", "bat", "arcaneArcher", "arcaneArcher"],
        middle: ["ancientGolem", "evilWizard", "", ""],
        bottom: ["ancientGolem", "bat", "bat", "arcaneArcher", "arcaneArcher"],
      },
      {
        top: ["ancientGolem", "hermitCrab", "", "evilWizard", "arcaneArcher"],
        middle: [
          "hermitCrab",
          "hermitCrab",
          "bat",
          "evilWizard",
          "arcaneArcher",
        ],
        bottom: [
          "ancientGolem",
          "hermitCrab",
          "",
          "evilWizard",
          "arcaneArcher",
        ],
      },
      {
        top: [
          "hermitCrab",
          "hermitCrab",
          "skullWolf",
          "skullWolf",
          "skullWolf",
          "skullWolf",
        ],
        middle: [
          "hermitCrab",
          "skullWolf",
          "skullWolf",
          "skullWolf",
          "skullWolf",
          "skullWolf",
        ],
        bottom: [
          "hermitCrab",
          "hermitCrab",
          "skullWolf",
          "skullWolf",
          "skullWolf",
          "skullWolf",
        ],
      },
      {
        top: [
          "ancientGolem",
          "arcaneArcher",
          "evilWizard",
          "ancientGolem",
          "skullWolf",
          "arcaneArcher",
          "evilWizard",
        ],
        middle: [
          "ancientGolem",
          "arcaneArcher",
          "evilWizard",
          "ancientGolem",
          "skullWolf",
          "arcaneArcher",
          "evilWizard",
        ],
        bottom: [
          "ancientGolem",
          "arcaneArcher",
          "evilWizard",
          "ancientGolem",
          "skullWolf",
          "arcaneArcher",
          "evilWizard",
        ],
      },
      {
        top: [
          "",
          "",
          "ancientGolem",
          "ancientGolem",
          "hermitCrab",
          "skullWolf",
          "ancientGolem",
          "evilWizard",
          "skullWolf",
          "arcaneArcher",
        ],
        middle: [
          "ancientGolem",
          "",
          "hermitCrab",
          "skullWolf",
          "arcaneArcher",
          "",
          "ancientGolem",
          "",
          "ancientGolem",
          "hermitCrab",
          "arcaneArcher",
          "skullWolf",
          "skullWolf",
          "evilWizard",
        ],
        bottom: [
          "",
          "",
          "ancientGolem",
          "ancientGolem",
          "arcaneArcher",
          "arcaneArcher",
          "",
          "skullWolf",
          "skullWolf",
          "skullWolf",
          "hermitCrab",
          "evilWizard",
        ],
      },
      {
        top: [
          "ancientGolem",
          "bat",
          "bat",
          "bat",
          "hermitCrab",
          "arcaneArcher",
          "ancientGolem",
          "evilWizard",
          "skullWolf",
          "arcaneArcher",
          "hermitCrab",
          "arcaneArcher",
          "ancientGolem",
          "bat",
          "bat",
        ],
        middle: [
          "ancientGolem",
          "bat",
          "bat",
          "bat",
          "arcaneArcher",
          "arcaneArcher",
          "",
          "ancientGolem",
          "evilWizard",
          "evilWizard",
          "hermitCrab",
          "arcaneArcher",
          "evilWizard",
          "ancientGolem",
          "arcaneArcher",
        ],
        bottom: [
          "ancientGolem",
          "bat",
          "bat",
          "bat",
          "evilWizard",
          "arcaneArcher",
          "hermitCrab",
          "hermitCrab",
          "arcaneArcher",
          "ancientGolem",
          "skullWolf",
          "skullWolf",
          "evilWizard",
        ],
      },
    ];
  }

  generatesNewWaveIfAvailable(deltaTime) {
    if (this.gameStatesManager.enemyPawnActors.length != 0) return false;

    this.currentDelayed += deltaTime;
    if (this.currentDelayed < this.DELAY_BEFORE_NEXT_WAVE) return false;

    //reset
    this.currentDelayed = 0;

    const signalsManager = this.gameStatesManager.signalsManager;
    const pawnActorsBlobDictionary =
      this.gameStatesManager.pawnActorsBlobDictionary;
    const currentWave = this.gameStatesManager.currentWave;
    const [topPath, middlePath, bottomPath] =
      this.gameStatesManager.enemySummonLocations;
    const nonBossDuplication =
      (currentWave - 1) * this.NON_BOSS_ENEMIES_DUPLICATION_PER_WAVE;

    //select wave
    const remainder = currentWave % this.wavesList.length;
    const index = remainder === 0 ? this.wavesList.length - 1 : remainder - 1;

    const selectedWave = this.wavesList[index];

    if (selectedWave) {
      //dictates which boss to be spawned if it's a boss wave
      //wave boss list
      //1 - battleMage - end
      //2 - demonSlime - start
      //3 - fireWorm - middle
      //4 - huntress - middle
      //5 - lostWarrior - end
      //6 - rogueSamurai - middle
      const num = currentWave / this.WAVES_PER_BOSS_WAVE;
      const bossNum = num % 6;

      let bossName = null;
      let bossPlacement = null;
      let bossSummonIndex = null;
      if (Number.isInteger(bossNum)) {
        const totalMonstersInMiddleLane = selectedWave.middle.length;

        switch (bossNum) {
          case 1:
            bossName = "battleMage";
            bossPlacement = 2;
            break;

          case 2:
            bossName = "demonSlime";
            bossPlacement = 0;
            break;

          case 3:
            bossName = "fireWorm";
            bossPlacement = 1;
            break;

          case 4:
            bossName = "huntress";
            bossPlacement = 1;
            break;

          case 5:
            bossName = "lostWarrior";
            bossPlacement = 2;
            break;

          case 0:
            bossName = "rogueSamurai";
            bossPlacement = 1;
            break;
        }

        if (bossName) {
          bossSummonIndex = determineBossSummonIndex(
            totalMonstersInMiddleLane,
            bossPlacement,
          );
        }
      }

      summonWaveOnALane(
        selectedWave.top,
        signalsManager,
        topPath,
        nonBossDuplication,
        bossSummonIndex,
        bossName,
        "T",
      );
      summonWaveOnALane(
        selectedWave.middle,
        signalsManager,
        middlePath,
        nonBossDuplication,
        bossSummonIndex,
        bossName,
        "M",
      );
      summonWaveOnALane(
        selectedWave.bottom,
        signalsManager,
        bottomPath,
        nonBossDuplication,
        bossSummonIndex,
        bossName,
        "B",
      );

      return true;
    }
    return false;
  }
}

function determineBossSummonIndex(totalMonstersInChosenLane, bossPlacement) {
  switch (bossPlacement) {
    case 0:
      return 0;

    case 1:
      return Math.floor(totalMonstersInChosenLane / 2);
      break;

    case 2:
      return totalMonstersInChosenLane - 1;

    default:
      return 0;
  }
}

function summonWaveOnALane(
  pawnActorList,
  signalsManager,
  startingSummonLocation,
  nonBossDuplication,
  bossSummonIndex,
  bossName,
  IdPrefix = "t",
) {
  if (pawnActorList?.length <= 0 || !signalsManager) return;

  const SMALL_DISTANCE_BETWEEN_EACH_SUMMON = 30;
  const BIG_DISTANCE_BETWEEN_EACH_SUMMON = 50;
  const currentWave = this.signalsManager.statesManager.currentWave;

  let currentDxPosition = startingSummonLocation.dx;
  const dyPosition = startingSummonLocation.dy;

  const actualIndex = 0;
  for (let i = 0; i < pawnActorList.length; i++) {
    //summon boss first if available
    if (bossName && Number.isInteger(bossSummonIndex)) {
      if (i === bossSummonIndex) {
        const tempId = `${IdPrefix}b0s5w${currentWave}e${actualIndex}`;
        const result = signalsManager.spawnEnemyPawnActorAtLocation(
          tempId,
          bossName,
          {
            dx: currentDxPosition,
            dy: dyPosition,
          },
        );

        if (result.success) {
          actualIndex += 1;
          currentDxPosition += BIG_DISTANCE_BETWEEN_EACH_SUMMON;
        }

        console.log(`Wave Manager (BOSS): ${result.message}`);
      }
    }

    const mobPawnActorName = pawnActorList[i];

    if (!mobPawnActorName) {
      currentDxPosition += BIG_DISTANCE_BETWEEN_EACH_SUMMON;
      continue;
    }

    for (let j = 0; j <= nonBossDuplication; j++) {
      //both client and server use the same id pattern to sync with each other
      const tempId = `${IdPrefix}m0bw${currentWave}e${actualIndex}`;
      const result = signalsManager.spawnEnemyPawnActorAtLocation(
        tempId,
        mobPawnActorName,
        {
          dx: currentDxPosition,
          dy: dyPosition,
        },
      );

      if (result.success) {
        actualIndex += 1;
        currentDxPosition += SMALL_DISTANCE_BETWEEN_EACH_SUMMON;
      }

      console.log(`Wave Manager (MOB): ${result.message}`);
    }
  }
}
