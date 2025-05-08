import { useEffect, useRef } from "react";
import { loadTileMap } from "./Utilities/TileMapLoader";

export default function GameMaps({ test }) {
  const canvasParentDivRef = useRef(null);

  useEffect(() => {
    let resolvedCanvas;
    let isCancelled = false;
    const shouldAbortRef = { current: false };

    const load = async () => {
      const canvas = await loadTileMap(shouldAbortRef);
      if (isCancelled) return;

      /** @type {HTMLCanvasElement} */
      resolvedCanvas = canvas;

      if (canvasParentDivRef.current) {
        canvasParentDivRef.current.style.width = `${resolvedCanvas.width}px`;
        canvasParentDivRef.current.style.height = `${resolvedCanvas.height}px`;
        canvasParentDivRef.current.appendChild(resolvedCanvas);
      }
    };

    load();

    return () => {
      isCancelled = true;
      shouldAbortRef.current = true;
      if (
        resolvedCanvas &&
        canvasParentDivRef.current.contains(resolvedCanvas)
      ) {
        canvasParentDivRef.current.removeChild(resolvedCanvas);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
      ref={canvasParentDivRef}
    ></div>
  );
}
