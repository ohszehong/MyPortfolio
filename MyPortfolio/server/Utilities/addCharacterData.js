import fs from "fs";

/**
 * @typedef {Object} Collision
 * @property {string} collisionType
 * @property {number} ddx
 * @property {number} ddy
 * @property {boolean} active
 * @property {string} target
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} ActorStats
 *
 * @property {number} health
 * @property {number} defense
 * @property {number} attack
 * @property {number} movespeed
 * @property {number} attackspeed
 * @property {number} healing
 */

/** @param {ActorStats} characterStats */
export default function AddCharacterData(
  characterName,
  characterTargetType = "ally",
  animationName,
  sourceAnimationJSONFilePath,
  destinationCharacterDataJSONFilePath,
  selectable = false,
  characterStats,
  maxLevel = 30
) {
  if (
    !characterName ||
    !animationName ||
    !sourceAnimationJSONFilePath ||
    !destinationCharacterDataJSONFilePath ||
    !characterStats
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

  if (!destinationCharacterDataJSON[characterName]) {
    destinationCharacterDataJSON[characterName] = {};
  }

  destinationCharacterDataJSON[characterName].selectable = selectable;
  destinationCharacterDataJSON[characterName].targetType = characterTargetType;
  destinationCharacterDataJSON[characterName].defaultStats = {
    ...characterStats,
  };
  destinationCharacterDataJSON[characterName].maxLevel = maxLevel;

  if (sourceAnimationJSON && destinationCharacterDataJSON) {
    for (const frameTag of sourceAnimationJSON.meta.frameTags) {
      frameTag.frames = sourceAnimationJSON.frames.slice(
        frameTag.from,
        frameTag.to + 1
      );
    }

    let data = {
      spritesheetFile: sourceAnimationJSON.meta?.image
    };
    for (const frameTag of sourceAnimationJSON.meta.frameTags) {
      //direction
      data[frameTag.name] = {
        frames: [],
      };

      for (const frame of frameTag.frames) {
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

            destinationCharacterDataJSON[characterName].collision = {
              collisionType: "blockCollision",
              ddx: data.bounds.x,
              ddy: data.bounds.y,
              width: data.bounds.w,
              height: data.bounds.h,
            };

            continue;
          }

          let collisionData = {
            collisionType: null,
            ddx: 0,
            ddy: 0,
            width: 0,
            height: 0,
            active: true,
            target: "none",
          };

          collisionData.collisionType = slice.name.slice(
            0,
            slice.name.length - 1
          );

          let collisionTarget;
          let collisionType;

          if (slice.data) {
            const parsedJSON = JSON.parse(slice.data);
            if (parsedJSON) {
              collisionTarget = parsedJSON.target;
              collisionType = parsedJSON.collisionType;
            }
          }

          if (slice.keys && slice.keys.length > 0) {
            const filteredKeys = slice.keys.filter((collisionKey) => {
              return collisionKey.frame === currentFrame;
            });

            for (const key of filteredKeys) {
              collisionData.ddx = key.bounds.x;
              collisionData.ddy = key.bounds.y;
              collisionData.width = key.bounds.width;
              collisionData.height = key.bounds.height;

              collisionData.target = collisionTarget;
              collisionData.collisionType = collisionType;

              frameData.collisions.push({ ...collisionData });
            }
          }
        }

        data[frameTag.name].frames.push(frameData);
      }
    }

    destinationCharacterDataJSON[characterName].animation = {
      ...(destinationCharacterDataJSON[characterName].animation || {}),
      [animationName]: {
        ...data,
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
