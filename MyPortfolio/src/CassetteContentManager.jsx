import { useEffect, useRef } from "react";
import { loadTileMap } from "./Utilities/TileMapLoader";
import CollisionTypes from "./assets/StringKeys/CollisionTypes.json";
import CharacterStateTypes from "./assets/StringKeys/CharacterStateTypes.json";
import useCassetteInit from "./UseCassetteInit";

export default function CassetteContentManager({
  cassetteInPlayIndex,
  setIsLoadingContent,
}) {
  const contentParentDivRef = useRef(null);
  const contentCanvasRef = useRef(null);

  const webSocketRef = useRef(null);

  const origin = import.meta.env.VITE_API_ORIGIN;

  const FixedCollisionsPosition = useRef([]);

  const PlayerState = useRef({
    state: CharacterStateTypes.Idle,
    position: { dx: 0, dy: 0 },
    collision: { type: CollisionTypes.BlockCollision, ddx: 0, ddy: 0 },
  });

  const OtherPlayersState = useRef([]);

  useEffect(() => {
    if (contentParentDivRef?.current) {
      contentParentDivRef.current.style.width = "0px";
      contentParentDivRef.current.style.height = "0px";
    }

    let isCancelled = false;
    const shouldAbortRef = { current: false };

    const loadContent = async () => {
      console.log("play index: ", cassetteInPlayIndex);

      try {
        const resolvedMap = await loadTileMap(
          shouldAbortRef,
          origin,
          cassetteInPlayIndex
        );
        if (isCancelled) return;

        setIsLoadingContent(false);

        /** @type {HTMLCanvasElement} */
        contentCanvasRef.current = resolvedMap;

        if (contentParentDivRef?.current) {
          contentParentDivRef.current.style.width = "100%";
          contentParentDivRef.current.style.height = "100%";
          contentParentDivRef.current.appendChild(contentCanvasRef.current);
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
      console.log("unmount...");
      isCancelled = true;
      shouldAbortRef.current = true;
      if (
        contentCanvasRef?.current &&
        contentParentDivRef?.current.contains(contentCanvasRef.current)
      ) {
        contentParentDivRef.current.removeChild(contentCanvasRef.current);
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [cassetteInPlayIndex]);

  useCassetteInit(cassetteInPlayIndex, contentParentDivRef, webSocketRef);

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
    ></div>
  );
}
