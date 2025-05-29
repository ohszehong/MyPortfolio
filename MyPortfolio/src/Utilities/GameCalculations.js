/** @param {{current: {x: 0, y: 0}}} cameraPosition */
export const sanitizeCameraPosition = (
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
