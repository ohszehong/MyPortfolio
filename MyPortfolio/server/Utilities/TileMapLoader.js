import tiledMapJSON from "../../public/MapData/IntroMap/MapJSON/IntroMapV2.json";

export const loadTileMap = async (shouldAbortRef, mapJSONPath) => {
    if(shouldAbortRef?.current) return;

    /** @type {tiledMapJSON} */
    const mapJSON = await ((await fetch(mapJSONPath)).json()).then((json) => json);
    
    console.log("path: ", mapJSONPath, mapJSON);

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
            image = await loadImage(tileset.image);
            //console.log("loaded image: ", image);
        }
        catch(err){
            console.log("error: ", tileset.image);
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

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = totalTilesInX * tileWidthInPixels;
    canvas.height = totalTilesInY * tileHeightInPixels;

    for (let layer of mapJSON.layers)
    {
        if(shouldAbortRef?.current) return;

        if(layer.type != "tilelayer") continue;

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
                    console.log("flipped Diagonally...");
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
                        console.log("flipped horizontally or vertically...");
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
    
    return canvas;
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

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}