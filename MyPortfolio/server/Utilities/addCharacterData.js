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
  maxLevel = 30,
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
    fs.readFileSync(sourceAnimationJSONFilePath, "utf-8"),
  );
  const destinationCharacterDataJSON = JSON.parse(
    fs.readFileSync(destinationCharacterDataJSONFilePath).toString(),
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
    //quick fix
    //right now the summon tag is in the frameTags as well
    //and thus the summon data is saved into the summon tag but we don't want that
    //we want to save it to directional frame tag
    //the quick fix now makes the summon tag saved to previous directional frame tag
    //unable to handle all directions at the moment
    let referencedDirectionalFrameTag = null;

    for (const frameTag of sourceAnimationJSON.meta.frameTags) {
      //direction tags
      if (frameTag.name != "summon") {
        frameTag.frames = sourceAnimationJSON.frames.slice(
          frameTag.from,
          frameTag.to + 1,
        );

        referencedDirectionalFrameTag = frameTag;
        continue;
      }

      //summon tag
      const parsedJSON = JSON.parse(frameTag.data);

      let projectile = false;
      let vfx = false;

      //if it is a projectile
      //look for the projectileSL (summon location) in slices[] array in the JSON file
      if (parsedJSON.projectile) {
        const projectileSLSlice = sourceAnimationJSON.meta.slices.filter(
          (slice) => slice.name === "projectileSL",
        );

        if (projectileSLSlice?.length > 0) {
          projectile = {
            projectileName: parsedJSON.projectile,
            x: projectileSLSlice[0].keys[0].bounds.x,
            y: projectileSLSlice[0].keys[0].bounds.y,
            width: projectileSLSlice[0].keys[0].bounds.w,
            height: projectileSLSlice[0].keys[0].bounds.h,
          };
        }
      } else if (parsedJSON.vfx) {
        vfx = parsedJSON.vfx; //vfx filename (without extension)
      }

      const summon = {
        atFrame: frameTag.from,
        projectile: projectile,
        vfx: vfx,
        hitVFX: parsedJSON.hitVFX,
      };

      referencedDirectionalFrameTag.summon = { ...summon };
    }

    let data = {
      spritesheetFile: sourceAnimationJSON.meta?.image,
    };

    for (const frameTag of sourceAnimationJSON.meta.frameTags) {
      //ignore summon tag
      if (frameTag.name === "summon") continue;

      //direction
      data[frameTag.name] = {
        frames: [],
      };

      let frameIndex = 0;
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

        //get the trimmed x and y for getting the correct collisions position
        frameData.spritesheetTrimmedX = frame.spriteSourceSize.x;
        frameData.spritesheetTrimmedY = frame.spriteSourceSize.y;

        frameData.duration = frame.duration;

        //for summon aka vfx/projectiles
        if (frameTag.summon?.atFrame === frameIndex) {
          frameData.summon = { ...frameTag.summon };
        }

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
          } else if (slice.name === "attackCollision") {
            let collisionData = {
              collisionType: null,
              ddx: 0,
              ddy: 0,
              width: 0,
              height: 0,
              active: true,
              target: "none",
              single: false,
            };

            collisionData.collisionType = slice.name;

            if (slice.data) {
              const parsedJSON = JSON.parse(slice.data);
              if (parsedJSON) {
                collisionData.target = parsedJSON.target;
                collisionData.single = parsedJSON.single;
              }
            }

            if (slice.keys && slice.keys.length > 0) {
              const filteredKey = slice.keys.filter((collisionKey) => {
                return collisionKey.frame === frameIndex;
              });

              if (filteredKey.length > 0) {
                for (const key of filteredKey) {
                  collisionData.ddx = key.bounds.x;
                  collisionData.ddy = key.bounds.y;
                  collisionData.width = key.bounds.width;
                  collisionData.height = key.bounds.height;

                  frameData.collisions.push({ ...collisionData });
                }
              }
            }
          }
        }
        data[frameTag.name].frames.push(frameData);

        frameIndex++;
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
      JSON.stringify(destinationCharacterDataJSON),
    );
    console.log("added successfully...");
    return true;
  }
  return false;
}
