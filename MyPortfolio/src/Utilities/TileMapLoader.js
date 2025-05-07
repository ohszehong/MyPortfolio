import mapJSON from "../assets/IntroMap/MapInfo/IntroMap.json"


/** @param {HTMLElement} ParentDOMElement */
const LoadTileMap = (ParentDOMElement, tileMapJson) => {
    const tileWidthInPixels = mapJSON.tilewidth;
    const tileHeightInPixels = mapJSON.tileheight;
    const totalTilesInX = mapJSON.width;
    const totalTilesInY = mapJSON.height;

    const tileSetsLastGid = [];
    const slicedTileSets = [];


    for(let tileset of mapJSON.tilesets) {
        tileSetsLastGid.push(tileset.firstgid + tileset.tilecount);
    }

    for(let tileset of mapJSON.tilesets) {
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileWidthInPixels;
        tileCanvas.height = tileHeightInPixels;
        const tileContext = tileCanvas.getContext("2d");

        const image = new Image("../" + tileset.image);
        tileContext.drawImage(image, )

        //tilesSetsImages.push(image);
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = totalTilesInX * tileWidthInPixels;
    canvas.height = totalTilesInY * tileHeightInPixels;
    
    ParentDOMElement.appendChild(canvas);

}