import { Canvas, createCanvas, registerFont } from "canvas";

import IntroMapV2JSON from "../../CassetteContentData/IntroCassette/MapData/IntroMapV2.json" with {type: "json"};
import TriggerTypes from "../../../shared/Standards/StringKeys/TriggerTypes.json" with {type: "json"};
import TileActor from "../../../shared/Actors/TileActor.js";
import loadImage from "../ImgLoader/loadImage.js";

export default async function loadTileMap(shouldAbortRef) {
  if (shouldAbortRef.current) return;

  if(process.platform != "win32")
  {
    console.log("registering font...");
    registerFont("../fonts/stencil-Regular.ttf", {
      family: "Stencil",
      weight: "normal",
      style: "normal"
    });
  }

  let mapJSON;
  switch(this.cassetteIndex)
  {
    case 0:
        mapJSON = IntroMapV2JSON;
        break;

    default:
        return;
  }

  if(!mapJSON) 
  {
    shouldAbortRef.current = true;
    return;
  }

  const tileWidthInPixels = mapJSON.tilewidth;
  const tileHeightInPixels = mapJSON.tileheight;
  const totalTilesInX = mapJSON.width;
  const totalTilesInY = mapJSON.height;

  const tilesWithoutProperties = {};
  const tilesWithProperties = {};

  try {
  for (let tileset of mapJSON.tilesets) {
    if (shouldAbortRef.current) return;

    let image;
    try {
      image = await loadImage(tileset.image);
    } catch (err) {
      console.log("error occurred while loading image: ", err);
      continue;
    }

    if (tileset.tiles) {
      tileset.tiles.forEach((tileProperties) => {
        let data = {
          renderLast: false
        };

        data.tileGid = tileset.firstgid + tileProperties.id;

        const renderLast = tileProperties.properties?.find((property) => property.name === "renderLast");
        if(renderLast)
        {
          data.renderLast = renderLast.value;
        }


        if (tileProperties.animation)
          data.animation = [...tileProperties.animation];

        if (tileProperties.objectgroup?.objects) {
          tileProperties.objectgroup.objects.forEach((object) => {
            const collisionTarget = object.properties?.find(
              (property) => property.name === "target"
            );
            const collisionActive = object.properties?.find(
              (property) => property.name === "active"
            );

            if (object.name === "BlockCollision") {
              data.collision = {
                collisionType: "blockCollision",
                target: collisionTarget?.value,
                active: collisionActive?.value,
                ddx: object.x,
                ddy: object.y,
                width: object.width,
                height: object.height,
              };

              //handle flipping
              if (object.rotation === 90) {
                data.collision.ddx = object.x - object.height;

                const prevWidth = data.collision.width;
                data.collision.width = object.height;
                data.collision.height = prevWidth;
              } else if (Math.abs(object.rotation) === 180) {
                data.collision.ddx = object.x - object.width;
                data.collision.ddy = object.y - object.height;
              } else if (object.rotation === -90) {
                data.collision.ddy = object.y - object.width;

                const prevWidth = data.collision.width;
                data.collision.width = object.height;
                data.collision.height = prevWidth;
              }
            }
          });
        }

        tilesWithProperties[data.tileGid] = {
          ...data,
        };
      });
    }

    let currentTileCount = 1;
    let currentColumnInIndex = 0;
    let currentTileRowInIndex = 0;

    //insert each tile from all tileset based on gid
    while (currentTileCount <= tileset.tilecount) {
      if (shouldAbortRef.current) return;

      const gid = (currentTileCount - 1) + tileset.firstgid;

      //create canvas 
      const tileCanvas = createCanvas(tileset.tilewidth, tileset.tileheight);
      tileCanvas.getContext("2d").drawImage(
        image,
        currentColumnInIndex * tileset.tilewidth,
        currentTileRowInIndex * tileset.tileheight,
        tileset.tilewidth,
        tileset.tileheight,
        0,
        0,
        tileset.tilewidth,
        tileset.tileheight
      )
      if (tilesWithProperties[gid]) {
        tilesWithProperties[gid].tileGid = gid;
        tilesWithProperties[gid].width = tileset.tilewidth;
        tilesWithProperties[gid].height = tileset.tileheight;
        tilesWithProperties[gid].tileCanvas = tileCanvas;
      } else {
        tilesWithoutProperties[gid] = {};
        tilesWithoutProperties[gid].tileGid = gid;
        tilesWithoutProperties[gid].width = tileset.tilewidth;
        tilesWithoutProperties[gid].height = tileset.tileheight;
        tilesWithoutProperties[gid].tileCanvas = tileCanvas;
      }

      currentTileCount++;

      if (currentColumnInIndex >= tileset.columns - 1) {
        currentColumnInIndex = 0;
        currentTileRowInIndex++;
      } else {
        currentColumnInIndex++;
      }
    }
  }

  const canvas = createCanvas(
    totalTilesInX * tileWidthInPixels,
    totalTilesInY * tileHeightInPixels
  );
  const context = canvas.getContext("2d");

  const tileLayers = mapJSON.layers.filter(
    (layer) => layer.type === "tilelayer"
  );

  for (let layer of tileLayers) {
    if (shouldAbortRef.current) return;

    let currentTileColumnInIndex = 0;
    let currentTileRowInIndex = 0;

    for (let encodedGid of layer.data) {
      if (shouldAbortRef.current) return;

      //check if tile has been fliped using mask on the gid
      const decodedTile = decodeGid(encodedGid);

      //if gid === 0, it means a space
      if (decodedTile.gid - 1 > 0) {
        const tileWithProperties = tilesWithProperties[decodedTile.gid];

        let currentTileData;

        if (tileWithProperties) {
          /**
           * @typedef {Object} TileAnimationFrame
           * @property {number} tileGid
           * @property {Collision} collision
           * @property {number} duration
           */

          /** @type {Array<TileAnimationFrame>} */
          let tiles = [];
          if (tileWithProperties.animation?.length > 0) {
            const firstGid = decodedTile.gid - tileWithProperties.animation[0].tileid;

            //the gid from decodedTile already includes the first gid
            tileWithProperties.animation.forEach((frameData) => {
              const gid = firstGid + frameData.tileid;
              const tileData = tilesWithProperties[gid] ? tilesWithProperties[gid] : tilesWithoutProperties[gid];

              if (tileData) {
                tiles.push({
                  tileGid: gid,
                  collision: tileData.collision,
                  duration: frameData.duration,
                  tileCanvas: tileData.tileCanvas,
                  renderLast: tileData.renderLast
                });
              }
            });
          }
          else {
            //tile has properties but don't have animation
            tiles.push({
              tileGid: decodedTile.gid,
              collision: tileWithProperties.collision,
              duration: -1,
              tileCanvas: tileWithProperties.tileCanvas,
              renderLast: tileWithProperties.renderLast
            })
          }

          //get tile position
          const dx = layer.x + currentTileColumnInIndex * tileWidthInPixels;
          const dy =
            layer.y +
            currentTileRowInIndex * tileHeightInPixels;  //don't have to offset with tileWithProperties.tileCanvas.height here because currentTileColumnInIndex starts from 0 which mean we already shift the position by 16pixels by default.

          const position = {
            dx: dx,
            dy: dy,
          };

          currentTileData = {
            ...tileWithProperties,
            position: position,
            tiles: tiles,
            hasProperties: true,
          };
        } else {
          currentTileData = {
            ...tilesWithoutProperties[decodedTile.gid],
            hasProperties: false,
          };
        }

        if (currentTileData) {
          const tempCanvas = createCanvas(
            currentTileData.width,
            currentTileData.height
          );

          flipCanvas(tempCanvas, decodedTile);

          const tempCanvasContext = tempCanvas.getContext("2d");

          if (!currentTileData.hasProperties) {
            // Draw with center-origin since we translated earlier, again assuming we using the 4x4 square above, now we move back once and move down once.
            tempCanvasContext.drawImage(
              currentTileData.tileCanvas,
              -currentTileData.width / 2,
              -currentTileData.height / 2
            );

            //some of the tiles are not the size of the original canvas tile (the tileWidthInPixels and tileHeightInPixels in this case), for instance says that each tile
            //is 16x16 in the base map, but there will be some tileset where each tile is 32x32, and here's the issue
            //for each sliced tile that we did above, they render starts from top left corner but in Tiled each of the tile render from bottom left corner
            //and thus their y is kinda misplaced if we didn't add the offset (offset = sliced tile y - original map tile y)
            context.drawImage(
              tempCanvas,
              layer.x + currentTileColumnInIndex * tileWidthInPixels,
              layer.y +
                currentTileRowInIndex * tileHeightInPixels -
                (tempCanvas.height - tileHeightInPixels) //bookmark
            );
          } else {
            if (currentTileData.tiles.length > 0) {
              //setup this.tileActorsBlobDictionary and this.tileActors here...
              for(let i = 0; i < currentTileData.tiles.length; i++)
              {
                tempCanvasContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                const tile = currentTileData.tiles[i];
                tempCanvasContext.drawImage(
                    tile.tileCanvas,
                    -currentTileData.width / 2,
                    -currentTileData.height / 2
                ); 
                
                let tileBlob = tempCanvas.toBuffer().toString("base64");
                
                if(tileBlob)
                {
                  //encode tile gid to store rotation info
                  currentTileData.tiles[i].tileGid = encodeGid({
                    gid: currentTileData.tiles[i].tileGid,
                    flippedHorizontally: decodedTile.flippedHorizontally,
                    flippedVertically: decodedTile.flippedVertically,
                    flippedDiagonally: decodedTile.flippedDiagonally
                  })

                  delete currentTileData.tiles[i].tileCanvas;
                
                  //don't have to add if it already exists in the dictionary
                  if(!this.tileActorsBlobDictionary[currentTileData.tiles[i].tileGid])
                  {
                    this.tileActorsBlobDictionary[currentTileData.tiles[i].tileGid] = tileBlob;
                  }
                }
              }
              
              const tileActor = new TileActor(
                  null,
                  currentTileData.position,
                  currentTileData.tiles,
                  currentTileData.renderLast
              );

              this.tileActors.push(tileActor);
            }
          }
        }
      }

      //the width and height in layer object are total number of tiles
      if (currentTileColumnInIndex < layer.width - 1) {
        currentTileColumnInIndex++;
      } else {
        currentTileColumnInIndex = 0;
        currentTileRowInIndex++;
      }
    }
  }

  const textsLayer = mapJSON.layers.find((layer) => layer.name === "Texts");

  if (textsLayer) {
    if (shouldAbortRef.current) return;

    for (const text of textsLayer.objects) {
      if (text.text) {
        context.font = `${text.text.pixelsize}px ${text.text.fontfamily}`;

        const metrics = context.measureText(text.text?.text);
        const textActualHeight =
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const textActualPadding = (text.height - textActualHeight) / 2;

        context.fillStyle = text.text?.color;
        context.fillText(
          text.text?.text,
          text.x,
          text.y + text.height - textActualPadding,
          text.width
        );
      }
    }
  }

  const blockCollisionsLayer = mapJSON.layers.find(
    (layer) => layer.name === "BlockCollisions"
  );

  if (blockCollisionsLayer) {
    if (shouldAbortRef.current) return;

    for (const blockCollision of blockCollisionsLayer.objects) {
      if (shouldAbortRef.current) return;

      const collisionActive = blockCollision.properties[0]?.value;
      const collisionTarget = blockCollision.properties[1]?.value;

      let blockCollisionData = {
        collisionType: "blockCollision",
        target: collisionTarget,
        active: collisionActive
      };

      blockCollisionData.dx = blockCollision.x;
      blockCollisionData.dy = blockCollision.y;
      blockCollisionData.width = blockCollision.width;
      blockCollisionData.height = blockCollision.height;

      this.mapCollisions.push({ ...blockCollisionData });
    }
  }

  const jumpTriggersLayer = mapJSON.layers.find(
    (layer) => layer.name === "JumpTriggers"
  );

  if (jumpTriggersLayer) {
    if (shouldAbortRef.current) return;

    for (const jumpTrigger of jumpTriggersLayer.objects) {
      if (shouldAbortRef.current) return;

      let jumpTriggerData = {
          triggerTypes: TriggerTypes.jumpTrigger,
          actionToTrigger: null,
          jumpDirection: "right",
          jumpMagnitude: 0,
          active: true,
          target: "ally",
          dx: jumpTrigger.x,
          dy: jumpTrigger.y,
          width: jumpTrigger.width,
          height: jumpTrigger.height
      };

      //handle flipping
      if (jumpTrigger.rotation === 90) {
          jumpTriggerData.dx = jumpTrigger.x - jumpTrigger.height;

          const prevWidth = jumpTriggerData.width;
          jumpTriggerData.width = jumpTrigger.height;
          jumpTriggerData.height = prevWidth;
        } else if (Math.abs(jumpTrigger.rotation) === 180) {
          jumpTriggerData.dx = jumpTrigger.x - jumpTrigger.width;
          jumpTriggerData.dy = jumpTrigger.y - jumpTrigger.height;
        } else if (jumpTrigger.rotation === -90) {
          jumpTriggerData.dy = jumpTrigger.y - jumpTrigger.width;

          const prevWidth = jumpTriggerData.width;
          jumpTriggerData.width = jumpTrigger.height;
          jumpTriggerData.height = prevWidth;
        }

      for (const property of jumpTrigger.properties) {
        jumpTriggerData[property.name] = property.name === "jumpMagnitude" ? parseFloat(property.value) : property.value;
      }

      this.mapJumpTriggers.push({ ...jumpTriggerData });
    }
  }

  const soundTriggersLayer = mapJSON.layers.find((layer) => layer.name === "SoundTriggers");

  if(soundTriggersLayer)
  {
    if (shouldAbortRef.current) return;

    for (const soundTrigger of soundTriggersLayer.objects) {
      if (shouldAbortRef.current) return;

      let soundTriggerData = {
          triggerTypes: TriggerTypes.soundTrigger,
          actionToTrigger: null,
          filename: null,
          priority: 99,
          totalVariations: 0,
          active: true,
          target: "all",
          dx: soundTrigger.x,
          dy: soundTrigger.y,
          width: soundTrigger.width,
          height: soundTrigger.height
      };

      //handle flipping
      if (soundTrigger.rotation === 90) {
          soundTriggerData.dx = soundTrigger.x - soundTrigger.height;

          const prevWidth = soundTriggerData.width;
          soundTriggerData.width = soundTrigger.height;
          soundTriggerData.height = prevWidth;
        } else if (Math.abs(soundTrigger.rotation) === 180) {
          soundTriggerData.dx = soundTrigger.x - soundTrigger.width;
          soundTriggerData.dy = soundTrigger.y - soundTrigger.height;
        } else if (soundTrigger.rotation === -90) {
          soundTriggerData.dy = soundTrigger.y - soundTrigger.width;

          const prevWidth = soundTriggerData.width;
          soundTriggerData.width = soundTrigger.height;
          soundTriggerData.height = prevWidth;
        }

      for (const property of soundTrigger.properties) {
        soundTriggerData[property.name] = property.name === "priority" || property.name === "totalVariations" ? parseInt(property.value) : property.value;
      }

      console.log(soundTriggerData);

      this.mapSoundTriggers.push({ ...soundTriggerData });
    }
  }

  this.gameMapBackgroundCanvas = canvas;
}
catch(err)
{
  console.log("stack trace: ", err.stack);
  console.log("throwing error from load tile map.");
  throw new Error(`{statusCode: 500, message: ${err}}`);
}
}

const decodeGid = (rawGid) => {
  const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
  const FLIPPED_VERTICALLY_FLAG = 0x40000000;
  const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

  const flippedHorizontally = (rawGid & FLIPPED_HORIZONTALLY_FLAG) !== 0;
  const flippedVertically = (rawGid & FLIPPED_VERTICALLY_FLAG) !== 0;
  const flippedDiagonally = (rawGid & FLIPPED_DIAGONALLY_FLAG) !== 0;

  const gid =
    rawGid &
    ~(
      FLIPPED_HORIZONTALLY_FLAG |
      FLIPPED_VERTICALLY_FLAG |
      FLIPPED_DIAGONALLY_FLAG
    );

  return {
    gid,
    flippedHorizontally,
    flippedVertically,
    flippedDiagonally,
  };
};

const encodeGid = ({ gid, flippedHorizontally, flippedVertically, flippedDiagonally }) => {
  const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
  const FLIPPED_VERTICALLY_FLAG = 0x40000000;
  const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

  let rawGid = gid;

  if (flippedHorizontally) rawGid |= FLIPPED_HORIZONTALLY_FLAG;
  if (flippedVertically) rawGid |= FLIPPED_VERTICALLY_FLAG;
  if (flippedDiagonally) rawGid |= FLIPPED_DIAGONALLY_FLAG;

  return rawGid;
};

/** @param {Canvas} canvas */
const flipCanvas = (canvas, decodedTile) => {
  const context = canvas.getContext("2d");

  // Move origin to center of tile before transforming
  context.translate(canvas.width / 2, canvas.height / 2); //assuming a 4x4 square, imagine the context move left once and up once.

  if (decodedTile.flippedDiagonally) {
    //console.log("flipped Diagonally...");
    if (decodedTile.flippedHorizontally && decodedTile.flippedVertically) {
      context.rotate(Math.PI); // 180°
      context.scale(1, -1);
    } else if (decodedTile.flippedHorizontally) {
      context.rotate(Math.PI / 2); // 90°
    } else if (decodedTile.flippedVertically) {
      context.rotate(-Math.PI / 2); // -90°
    } else {
      context.rotate(Math.PI / 2);
      context.scale(1, -1);
    }
  } else {
    //console.log("flipped horizontally or vertically...");
    if (decodedTile.flippedHorizontally) context.scale(-1, 1);
    if (decodedTile.flippedVertically) context.scale(1, -1);
  }
};