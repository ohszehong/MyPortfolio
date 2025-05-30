import CharacterStateTypes from "../Standards/StringKeys/CharacterStateTypes.json"
import FacingDirections from "../Standards/StringKeys/FacingDirections.json"
import TargetTypes from "../Standards/StringKeys/TargetTypes.json"
import loadTileMap from "./LoadTileMap";

export default class Engine {
  cassetteIndex;
  contentCanvasRef;
  webSocketRef;

  cameraPosition = { x: 0, y: 0 };
  fixedBackgroundOffscreenCanvas;
  fixedObjectBlockCollisionsData = [];
  fixedJumpTriggersData = [];

  playerState = {
    targetType: TargetTypes.ally,
    state: CharacterStateTypes.idle,
    facingDirection: FacingDirections.right,
    position: { dx: 0, dy: 0 },
    collision: { ddx: 0, ddy: 0, width: 0, height: 0 },
  };

  //for ally npcs
  allyPawnsState = [];

  //for enemy npcs
  enemyPawnsState = [];

  //otherPlayersState = [];

  constructor(cassetteIndex, contentCanvasRef, webSocketRef) {
    this.cassetteIndex = cassetteIndex;
    this.contentCanvasRef = contentCanvasRef;
    this.webSocketRef = webSocketRef;
  }

  async init() 
  {
        const shouldAbortRef = { current: false };
    
        const loadContent = async () => {
          console.log("play index: ", cassetteInPlayIndex);
    
          try {
            await loadTileMap(
              shouldAbortRef,
              this.cassetteIndex,
              this.cameraPosition,
              this.fixedBackgroundOffscreenCanvas,
              this.fixedObjectBlockCollisionsData,
              this.fixedJumpTriggersData,
              this.contentCanvasRef
            );
            if (shouldAbortRef.current) return;
    
            //Initial draw
            /** @type {CanvasRenderingContext2D} */
            const context2d = this.contentCanvasRef.current?.getContext("2d");
    
            if (
              context2d &&
              this.fixedBackgroundOffscreenCanvas
            ) {
              context2d.drawImage(
                fixedBackgroundOffscreenCanvasRef.current,
                cameraPosition.current.x,
                cameraPosition.current.y,
                contentCanvasRef.current.width,
                contentCanvasRef.current.height,
                0,
                0,
                contentCanvasRef.current.width,
                contentCanvasRef.current.height
              );
            }
          } catch (err) {
            console.log("failed to load content: ", err);
          }
        };
    
       
          loadContent();
    
          //connect to websocket
          webSocketRef.current = new WebSocket(
            `${import.meta.env.VITE_WS_CONNECTION}//${
              import.meta.env.VITE_ORIGIN_WITHOUT_HTTP
            }/cassetteSocket`,
            `cassette-${cassetteInPlayIndex}`
          );
    
          if (webSocketRef.current) {
            /** @type {WebSocket} */
            const ws = webSocketRef.current;
    
            ws.onopen = (event) => {
              ws.send("hello world.");
            };
    
            ws.onmessage = (event) => {
              console.log("received message from server: ", event.data);
            };
        }
    
        return () => {
          console.log("unmounted. Source: CassetteContentManager");
          isCancelled = true;
          shouldAbortRef.current = true;
    
          if (contentCanvasRef.current) {
            /** @type {CanvasRenderingContext2D} */
            const context2d = contentCanvasRef.current.getContext("2d");
            context2d.clearRect(
              0,
              0,
              contentCanvasRef.current.width,
              contentCanvasRef.current.height
            );
          }
    
          if (webSocketRef.current) {
            webSocketRef.current.close();
          }
        };
  }

drawContentCanvas() {

}

/** @param {{current: {x: 0, y: 0}}} cameraPosition */
sanitizeCameraPosition = (
  cameraPosition,
  consoleScreenRef,
  offscreenCanvasRef,
  printConsole
) => {
  let screenWidth = 0;
  let screenHeight = 0;

  if (consoleScreenRef.current) {
    screenWidth = consoleScreenRef.current.width.baseVal.value;
    screenHeight = consoleScreenRef.current.height.baseVal.value;
  }

  //if the camera is on the edge of the map
  if (cameraPosition.current.x < 0) {
    cameraPosition.current.x = 0;
  } else if (
    cameraPosition.current.x + screenWidth >=
    offscreenCanvasRef.current.width
  ) {
    cameraPosition.current.x = offscreenCanvasRef.current.width - screenWidth;
  }

  if (cameraPosition.current.y < 0) {
    cameraPosition.current.y = 0;
  } else if (
    cameraPosition.current.y + screenHeight >=
    offscreenCanvasRef.current.height
  ) {
    cameraPosition.current.y = offscreenCanvasRef.current.height - screenHeight;
  }

  if (printConsole) {
    console.log("offscreen canvas width: ", offscreenCanvasRef.current.width);
    console.log("new sanitized camera x: ", cameraPosition.current.x);
  }
};
}
