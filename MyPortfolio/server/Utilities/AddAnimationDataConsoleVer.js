import fs from "fs";
import readline from "readline/promises";

function AddAnimationData(
  characterName,
  characterTargetType = "N",
  animationName,
  animationFacingDirection,
  sourceAnimationJSONFilePath,
  destinationCharacterDataJSONFilePath
) {
  if (
    !characterName ||
    !animationName ||
    !animationFacingDirection ||
    !sourceAnimationJSONFilePath ||
    !destinationCharacterDataJSONFilePath
  ) {
    console.log("missing params...");
    return;
  }

  const sourceAnimationJSON = JSON.parse(
    fs.readFileSync(sourceAnimationJSONFilePath, "utf-8")
  );
  const destinationCharacterDataJSON = JSON.parse(
    fs.readFileSync(destinationCharacterDataJSONFilePath).toString()
  );

  destinationCharacterDataJSON[characterName] = {};

  if (characterTargetType != "N") {
    destinationCharacterDataJSON[characterName].targetType =
      characterTargetType;
  }

  if (sourceAnimationJSON && destinationCharacterDataJSON) {
    let data = {
      frames: [],
    };

    data.spritesheetFile = sourceAnimationJSON.meta?.image;

    let currentFrame = 0;
    for (let frame of sourceAnimationJSON.frames) {
      let frameData = {
        spritesheetOffset: {},
        duration: 0,
        collisions: [],
      };

      frameData.spritesheetOffset.x = frame.frame.x;
      frameData.spritesheetOffset.y = frame.frame.y;
      frameData.spritesheetOffset.width = frame.frame.w;
      frameData.spritesheetOffset.height = frame.frame.h;
      frameData.duration = frame.duration;

      for (let slice of sourceAnimationJSON.meta.slices) {
        let collisionData = {
          collisionType: null,
          collisionBounds: null,
          target: "none",
        };

        //handling character default fixed block collision slice
        if (slice.name === "blockCollision" && slice.keys?.length > 0) {
          let data = slice.keys[0];

          destinationCharacterDataJSON[characterName].blockCollisionBounds = {
            x: data.bounds.x,
            y: data.bounds.y,
            width: data.bounds.w,
            height: data.bounds.h,
          };

          continue;
        }

        collisionData.collisionType = slice.name.slice(
          0,
          slice.name.length - 1
        );

        let ignoreCollisionAtFrames;
        let collisionTarget;

        if (slice.data) {
          const parsedJSON = JSON.parse(slice.data);
          if (parsedJSON) {
            ignoreCollisionAtFrames = parsedJSON.ignoredFrames;
            collisionTarget = parsedJSON.target;
          }
        }

        if (slice.keys && slice.keys.length > 0) {
          const filteredKeys = slice.keys.filter((collisionKey) => {
            if (
              ignoreCollisionAtFrames &&
              ignoreCollisionAtFrames.includes(currentFrame)
            )
              return;

            return collisionKey.frame === currentFrame;
          });

          for (const key of filteredKeys) {
            collisionData.collisionBounds = {
              x: key.bounds.x,
              y: key.bounds.y,
              width: key.bounds.w,
              height: key.bounds.h,
            };

            if (collisionTarget) {
              collisionData.target = collisionTarget;
            }

            frameData.collisions.push({ ...collisionData });
          }
        }
      }

      data.frames.push(frameData);
      currentFrame++;
    }

    destinationCharacterDataJSON[characterName].animation = {
      ...destinationCharacterDataJSON[characterName].animation,
      [animationName]: {
        [animationFacingDirection]: [
          ...(destinationCharacterDataJSON[characterName].animation?.animationName?.animationFacingDirection || []),
          data
        ]
      },
    };

    //write to file
    fs.writeFileSync(
      destinationCharacterDataJSONFilePath,
      JSON.stringify(destinationCharacterDataJSON)
    );
    console.log("added successfully...");
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const characterName = await rl.question(
    "Character Name: e.g. mainCharacter: "
  );
  const characterTargetType = await rl.question(
    "Character Target Type (all, ally, enemy, none), type N to ignore: "
  );
  const animationName = await rl.question(
    "Animation Name (idle, walk, run, jump, attack): "
  );
  const animationFacingDirection = await rl.question(
    "Animation Facing Direction (up, down, left, right): "
  );
  const sourceAnimationJSONFilePath = await rl.question(
    "Source Animation JSON Absolute Filepath: "
  );
  const destinationCharacterDataJSONFilePath = await rl.question(
    "Destination Character Data JSON Absolute Filepath: "
  );

  rl.close();

  AddAnimationData(
    characterName,
    characterTargetType,
    animationName,
    animationFacingDirection,
    sourceAnimationJSONFilePath,
    destinationCharacterDataJSONFilePath
  );
}

main();
