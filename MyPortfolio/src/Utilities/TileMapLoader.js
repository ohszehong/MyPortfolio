import tiledMapJSON from "../../server/CassetteContentData/IntroCassette/MapData/IntroMapV2.json";
import CollisionTypes from "../assets/Standards/StringKeys/CollisionTypes.json"
import { sanitizeCameraPosition } from "../assets/Engine/Engine";

/** @param {Array} fixedBlockCollisionsData */
export const loadTileMap = async (shouldAbortRef, cassetteIndex, cameraPosition, fixedBackgroundCanvasRef, fixedBlockCollisionsData, fixedJumpTriggersData, contentCanvasRef) => {
    if(shouldAbortRef?.current) return;

    const origin = import.meta.env.VITE_API_ORIGIN;

    const apiURL = `${origin}${import.meta.env.VITE_API_RETRIEVE_CASSETTE_CONTENT_DATA}?cassetteIndex=${cassetteIndex}&dataType=MapData`;

    /** @type {tiledMapJSON} */
    const mapJSON = await ((await fetch(apiURL)).json()).then((json) => json);
    
    console.log("path: ", apiURL, mapJSON);

    const tileWidthInPixels = mapJSON.tilewidth;
    const tileHeightInPixels = mapJSON.tileheight;
    const totalTilesInX = mapJSON.width;
    const totalTilesInY = mapJSON.height;

    const slicedTilesCombined = [];
    
    for(let tileset of mapJSON.tilesets) {
        if(shouldAbortRef?.current) return;

        let image;
        try
        {
            image = await loadImage(origin, tileset.image);
            //console.log("loaded image: ", image);
        }
        catch(err){
            console.log("error: ", origin, tileset.image, err.message);
            continue;
        }
        
        let currentTileCount = 1;
        let currentColumnInIndex = 0;
        let currentTileRowInIndex = 0;

        //draw and insert each tile in gid orders from all the tilesets
        while(currentTileCount <= tileset.tilecount)
        {
            if(shouldAbortRef?.current) return;

            const tileCanvas = document.createElement("canvas");
            tileCanvas.width = tileset.tilewidth;
            tileCanvas.height = tileset.tileheight;
            const tileContext = tileCanvas.getContext("2d");

            tileContext.drawImage(image, currentColumnInIndex * tileset.tilewidth, currentTileRowInIndex * tileset.tileheight, tileset.tilewidth, tileset.tileheight, 0, 0, tileset.tilewidth, tileset.tileheight);
            slicedTilesCombined.push(tileCanvas);

            // const imgTag = document.createElement("img");
            // imgTag.src = tileCanvas.toDataURL();
            // document.body.appendChild(imgTag);

            currentTileCount++;

            if(currentColumnInIndex >= tileset.columns - 1)
            {
                currentColumnInIndex = 0;
                currentTileRowInIndex++;
            }
            else
            {
                currentColumnInIndex++;
            }
        }
    }

    const canvas = new OffscreenCanvas(totalTilesInX * tileWidthInPixels, totalTilesInY * tileHeightInPixels);
    const context = canvas.getContext("2d");

    const tileLayers = mapJSON.layers.filter((layer) => layer.type === "tilelayer");

    for (let layer of tileLayers)
    {
        if(shouldAbortRef?.current) return;

        let currentTileColumnInIndex = 0;
        let currentTileRowInIndex = 0;

        for(let gid of layer.data)
        {
            if(shouldAbortRef?.current) return;

            //check if tile has been fliped using mask on the gid
            const decodedTile = decodeTile(gid);

            //if gid === 0, it means a space 
            if(decodedTile.gid - 1 > 0)
            {
                /** @type {HTMLCanvasElement} */
                const currentTileCanvas = slicedTilesCombined[decodedTile.gid - 1];

                if(currentTileCanvas)
                {
                    const tempCanvas = document.createElement("canvas");
                    tempCanvas.width = currentTileCanvas.width;
                    tempCanvas.height = currentTileCanvas.height;

                    const tempCanvasContext = tempCanvas.getContext("2d");

                    tempCanvasContext.save();

                    // Move origin to center of tile before transforming
                    tempCanvasContext.translate(tempCanvas.width / 2, tempCanvas.height / 2); //assuming a 4x4 square, imagine the context move left once and up once.
            
                 if (decodedTile.flippedDiagonally) {
                    //console.log("flipped Diagonally...");
                        if (decodedTile.flippedHorizontally && decodedTile.flippedVertically) {
                        tempCanvasContext.rotate(Math.PI); // 180°
                        tempCanvasContext.scale(1, -1);
                        }  else if (decodedTile.flippedHorizontally) {
                        tempCanvasContext.rotate(Math.PI / 2); // 90°
                        } else if (decodedTile.flippedVertically) {
                        tempCanvasContext.rotate(-Math.PI / 2); // -90°
                        } else {
                        tempCanvasContext.rotate(Math.PI / 2);
                        tempCanvasContext.scale(1, -1);
                        }
                    } else {
                        //console.log("flipped horizontally or vertically...");
                        if (decodedTile.flippedHorizontally) tempCanvasContext.scale(-1, 1);
                        if (decodedTile.flippedVertically) tempCanvasContext.scale(1, -1);
                    }

                    // Draw with center-origin since we translated earlier, again assuming we using the 4x4 square above, now we move back once and move down once.
                    tempCanvasContext.drawImage(
                        currentTileCanvas,
                        -currentTileCanvas.width / 2,
                        -currentTileCanvas.height / 2
                     );

                    //some of the tiles are not the size of the original canvas tile (the tileWidthInPixels and tileHeightInPixels in this case), for instance says that each tile
                    //is 16x16 in the base map, but there will be some tileset where each tile is 32x32, and here's the issue
                    //for each sliced tile that we did above, they render starts from top left corner but in Tiled each of the tile render from bottom left corner
                    //and thus their y is kinda misplaced if we didn't add the offset (offset = sliced tile y - original map tile y)
                    context.drawImage(tempCanvas, layer.x + (currentTileColumnInIndex * tileWidthInPixels), (layer.y + (currentTileRowInIndex * tileHeightInPixels)) - (tempCanvas.height - tileHeightInPixels));

                    //revert the state
                    tempCanvasContext.restore();
                }
            }

            //the width and height in layer object are total number of tiles 
            if(currentTileColumnInIndex < layer.width - 1)
            {
                currentTileColumnInIndex++;
            }
            else
            {
                currentTileColumnInIndex = 0;
                currentTileRowInIndex++;
            }
        }
    }

    const textsLayer = mapJSON.layers.find((layer) => layer.name === "Texts");

    if(textsLayer)
    {
        if(shouldAbortRef?.current) return;

        for (const text of textsLayer.objects)
        {
            if(text.text)
            {

                context.font = `${text.text.pixelsize}px ${text.text.fontfamily}`;
            
                const metrics = context.measureText(text.text?.text);
                const textActualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                const textActualPadding = (text.height - textActualHeight) / 2;

                context.fillStyle = text.text?.color;
                context.fillText(text.text?.text, text.x, text.y + text.height - textActualPadding, text.width);
            }
        }
    }

    const blockCollisionsLayer = mapJSON.layers.find((layer) => layer.name === "BlockCollisions");

    if (blockCollisionsLayer)
    {
        if (shouldAbortRef?.current) return;

        for (const blockCollision of blockCollisionsLayer.objects)
        {
            if (shouldAbortRef?.current) return;

            const collisionTargets = blockCollision.properties[0]?.value.split(",");
            
            let blockCollisionData = {
                targets: collisionTargets
            };

            blockCollisionData.x = blockCollision.x;
            blockCollisionData.y = blockCollision.y;
            blockCollisionData.width = blockCollision.width;
            blockCollisionData.height = blockCollision.height;

            fixedBlockCollisionsData.current.push({...blockCollisionData});
        }
    }

    console.log("fixedBlockCollisionsData first load: ", fixedBlockCollisionsData.current);

    const jumpTriggersLayer = mapJSON.layers.find((layer) => layer.name === "JumpTriggers");

    if(jumpTriggersLayer)
    {
        if(shouldAbortRef?.current) return;

        for(const jumpCollision of jumpTriggersLayer.objects)
        {
            if(shouldAbortRef?.current) return;

            let jumpTriggerData = {
                blocking: false,
                jumpDirection: "right",
                jumpMagnitude: 0
            };

            for(const property of jumpCollision.properties)
            {
                jumpTriggerData[property.name] = property.value;
            }

            fixedJumpTriggersData.current.push({...jumpTriggerData});
        }
    }

    console.log("fixedJumpTriggersData: ", fixedJumpTriggersData.current);

    fixedBackgroundCanvasRef.current = canvas;

    //starting position 
    const startingPosition = mapJSON.layers.find((layer) => layer.name === "PlayerPosition").objects[0];

    //character stayed in the middle of the camera
    if(startingPosition)
    {
        let screenWidth = 0;
        let screenHeight = 0;

        if(contentCanvasRef.current)
        {
            screenWidth = contentCanvasRef.current.width.baseVal.value;
            screenHeight = contentCanvasRef.current.height.baseVal.value;
        }

        cameraPosition.current.x = startingPosition.x - screenWidth / 2;
        cameraPosition.current.y = startingPosition.y - screenHeight / 2;
        sanitizeCameraPosition(cameraPosition, contentCanvasRef, {current: canvas});

        // console.log("cameraPosition: ", cameraPosition.current);
        // console.log("canvas width: ", canvas.width);
        // console.log("canvas height: ", canvas.height);
    }
}

const decodeTile = (rawGid) => {
    const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
    const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
    const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;

    const flippedHorizontally = (rawGid & FLIPPED_HORIZONTALLY_FLAG) !== 0;
    const flippedVertically = (rawGid & FLIPPED_VERTICALLY_FLAG) !== 0;
    const flippedDiagonally = (rawGid & FLIPPED_DIAGONALLY_FLAG) !== 0;

    const gid = rawGid & ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);

    return {
      gid,
      flippedHorizontally,
      flippedVertically,
      flippedDiagonally
    };
}

const loadImage = (origin, src) => {
    //console.log(`${origin}/images/${src}`);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `${origin}/images/${src}`;
    });
}