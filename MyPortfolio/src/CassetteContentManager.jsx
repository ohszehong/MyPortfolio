import { useEffect, useRef } from "react";

import { loadTileMap } from "./Utilities/TileMapLoader";
import CollisionTypes from "./assets/Standards/StringKeys/CollisionTypes.json";
import TargetTypes from "./assets/Standards/StringKeys/TargetTypes.json";
import CharacterStateTypes from "./assets/Standards/StringKeys/CharacterStateTypes.json";
import FacingDirections from "./assets/Standards/StringKeys/FacingDirections.json";
import useCassetteInit from "./UseCassetteInit";

const CassetteContentManager = ({
  cassetteInPlayIndex,
  setIsLoadingContent,
  consoleScreenRef,
  consoleSvgRef,
  buttonsRef,
}) => {
  const contentParentDivRef = useRef(null);
  const contentCanvasRef = useRef(null);
  const webSocketRef = useRef(null);

  const cameraPosition = useRef({ x: 0, y: 0 });
  const fixedBackgroundOffscreenCanvasRef = useRef(null);
  const fixedObjectBlockCollisionsData = useRef([]);
  const fixedJumpTriggersData = useRef([]);

  const playerState = useRef({
    targetType: TargetTypes.ally,
    state: CharacterStateTypes.idle,
    facingDirection: FacingDirections.right,
    position: { dx: 0, dy: 0 },
    collision: { ddx: 0, ddy: 0, width: 0, height: 0 },
  });

  //for ally npcs
  const allyPawnsState = useRef([]);

  //for enemy npcs
  const enemyPawnsState = useRef([]);

  //const otherPlayersState = useRef([]);

  useEffect(() => {
    console.log("mounted. Source: CassetteContentManager");

    //for height transition effect
    if (contentParentDivRef?.current) {
      contentParentDivRef.current.style.width = "0px";
      contentParentDivRef.current.style.height = "0px";
    }

    let isCancelled = false;
    const shouldAbortRef = { current: false };

    const loadContent = async () => {
      console.log("play index: ", cassetteInPlayIndex);

      try {
        await loadTileMap(
          shouldAbortRef,
          cassetteInPlayIndex,
          cameraPosition,
          fixedBackgroundOffscreenCanvasRef,
          fixedObjectBlockCollisionsData,
          fixedJumpTriggersData,
          consoleScreenRef
        );
        if (isCancelled) return;

        setIsLoadingContent(false);

        if (contentParentDivRef.current) {
          contentParentDivRef.current.style.width = "100%";
          contentParentDivRef.current.style.height = "100%";
        }

        //Initial draw
        /** @type {CanvasRenderingContext2D} */
        const context2d = contentCanvasRef.current?.getContext("2d");

        if (
          context2d &&
          fixedBackgroundOffscreenCanvasRef.current &&
          consoleScreenRef.current
        ) {
          // console.log("putting image data: ", fixedBackgroundCanvasRef.current);

          // console.log(
          //   "image data width: ",
          //   fixedBackgroundCanvasRef.current.width
          // );
          // console.log(
          //   "image data height: ",
          //   fixedBackgroundCanvasRef.current.height
          // );

          // console.log(
          //   "console screen width and height: ",
          //   consoleScreenRef.current.getBoundingClientRect().width,
          //   " ",
          //   consoleScreenRef.current.getBoundingClientRect().height
          // );

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
        setIsLoadingContent(null);
        console.log("failed to load content: ", err);
      }
    };

    if (cassetteInPlayIndex != null) {
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
  }, [cassetteInPlayIndex]);

  useCassetteInit(
    cassetteInPlayIndex,
    webSocketRef,
    //UIReferences
    {
      contentParentDivRef: contentParentDivRef,
      fixedBackgroundCanvasRef: fixedBackgroundOffscreenCanvasRef,
      contentCanvasRef: contentCanvasRef,
      consoleScreenRef: consoleScreenRef,
      consoleSvgRef: consoleSvgRef,
    },
    //gameDataReferences
    {
      cameraPosition: cameraPosition,
      fixedObjectBlockCollisionsData: fixedObjectBlockCollisionsData,
      fixedJumpTriggersData: fixedJumpTriggersData,
      playerState: playerState,
      allyPawnsState: allyPawnsState,
      enemyPawnsState: enemyPawnsState,
    },
    //buttons
    buttonsRef
  );

  return (
    <div
      style={{
        position: "relative",
        transition: "height 5s ease-in",
        overflow:
          "hidden" /* overflow hidden so that the transition: height is visible */,
      }}
      tabIndex={0}
      ref={contentParentDivRef}
      id="cassette-content-wrapper"
    >
      <canvas width={480} height={280} ref={contentCanvasRef}></canvas>
    </div>
  );
};

export default CassetteContentManager;
