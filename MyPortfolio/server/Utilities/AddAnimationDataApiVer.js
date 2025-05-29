import fs from "fs";

export default function AddAnimationData(
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
    return false;
  }

  const sourceAnimationJSON = JSON.parse(
    fs.readFileSync(sourceAnimationJSONFilePath, "utf-8")
  );
  const destinationCharacterDataJSON = JSON.parse(
    fs.readFileSync(destinationCharacterDataJSONFilePath).toString()
  );

  if(!destinationCharacterDataJSON[characterName])
  {
    destinationCharacterDataJSON[characterName] = {};
  }

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
        //handling character default fixed block collision slice
        if (slice.name === "defaultCollision" && slice.keys?.length > 0) {
          let data = slice.keys[0];

          destinationCharacterDataJSON[characterName].blockCollisionBounds = {
            x: data.bounds.x,
            y: data.bounds.y,
            width: data.bounds.w,
            height: data.bounds.h,
          };

          continue;
        }

        let collisionData = {
          collisionType: null,
          collisionBounds: null,
          target: "none",
        };

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
      ...(destinationCharacterDataJSON[characterName].animation || {}),
      [animationName]: {
        ...(destinationCharacterDataJSON[characterName].animation?.[animationName] || {}),
        [animationFacingDirection]: [
          ...(destinationCharacterDataJSON[characterName].animation?.[animationName]?.[animationFacingDirection] || []),
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
    return true;
  }
  return false;
}
