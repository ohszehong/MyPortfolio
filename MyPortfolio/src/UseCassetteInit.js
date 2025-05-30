import { useEffect, useRef } from "react";
import { sanitizeCameraPosition } from "./Utilities/GameCalculations";

export default function useCassetteInit(
  cassetteInPlayIndex,
  webSocketRef,
  UIReferences,
  gameDataReferences,
  buttonsRef
) {
  //used for gameLoop
  const localCassetteInPlayIndexRef = useRef(cassetteInPlayIndex);

  //to check if buttons are active
  const buttonsActive = {
    buttonUp: false,
    buttonLeft: false,
    buttonDown: false,
    buttonRight: false,
    buttonLWrapper: false,
    buttonRWrapper: false,
    buttonA: false,
    buttonB: false,
  };

  useEffect(() => {
    let gameLoop = () => {};
    let cleanup = () => {};

    localCassetteInPlayIndexRef.current = cassetteInPlayIndex;

    if (webSocketRef.current) {
      cleanup = initButtons(
        buttonsRef,
        UIReferences.consoleSvgRef,
        buttonsActive
      );
    }

    switch (cassetteInPlayIndex) {
      case 0:
        gameLoop = IntroCassetteInit(
          webSocketRef,
          UIReferences,
          gameDataReferences,
          buttonsActive
        );
        break;

      default:
        return;
    }

    requestAnimationFrame(() => {
      gameLoop(localCassetteInPlayIndexRef);
    });

    return () => {
      cleanup();
    };
  }, [cassetteInPlayIndex]);

  function IntroCassetteInit(
    webSocketRef,
    UIReferences,
    gameDataReferences,
    buttonsActive
  ) {
    /** @type {WebSocket} */
    const ws = webSocketRef.current;

    //based on where the user has clicked on the console screen to decide which action should be taken, either moving their character or etc.
    let selectedObject = null;

    const gameLoop = (cassetteInPlayIndexRef) => {
      const cassetteIsActive =
        cassetteInPlayIndexRef.current === 0 ? true : false;

      if (cassetteIsActive) {
        let hasChanges = false;

        if (buttonsActive.buttonUp) {
          //default behavior
          if (!selectedObject) {
            //console.log("button up is pressed...");
            gameDataReferences.cameraPosition.current.y -= 10;
          }

          hasChanges = true;
        }

        if (buttonsActive.buttonDown) {
          //default behavior
          if (!selectedObject) {
            //console.log("button down is pressed...");
            gameDataReferences.cameraPosition.current.y += 10;
          }

          hasChanges = true;
        }

        if (buttonsActive.buttonLeft) {
          //default behavior
          if (!selectedObject) {
            //console.log("button left is pressed...");
            gameDataReferences.cameraPosition.current.x -= 10;
          }

          hasChanges = true;
        }

        if (buttonsActive.buttonRight) {
          //default behavior
          if (!selectedObject) {
            //console.log("button right is pressed...");
            gameDataReferences.cameraPosition.current.x += 10;
          }

          hasChanges = true;
        }

        if (buttonsActive.buttonLWrapper) {
        }

        if (buttonsActive.buttonRWrapper) {
        }

        if (buttonsActive.buttonA) {
        }

        if (buttonsActive.buttonB) {
        }

        if (hasChanges) {
          console.log("has changes, redrawing...");
          redrawBackground(
            gameDataReferences.cameraPosition,
            UIReferences.fixedBackgroundCanvasRef,
            UIReferences.contentCanvasRef,
          );
        }

        requestAnimationFrame(() => {
          gameLoop(cassetteInPlayIndexRef);
        });
      }
    };

    return gameLoop;
  }

  const redrawBackground = (
    cameraPosition,
    fixedBackgroundCanvasRef,
    contentCanvasRef,
  ) => {
    if (
      !cameraPosition.current &&
      !fixedBackgroundCanvasRef &&
      !contentCanvasRef.current
    )
      return;

    /** @type {CanvasRenderingContext2D} */
    const context2d = contentCanvasRef.current.getContext("2d");

    if (context2d) {
      sanitizeCameraPosition(
        cameraPosition,
        contentCanvasRef,
        fixedBackgroundCanvasRef,
        false
      );

      context2d.drawImage(
        fixedBackgroundCanvasRef.current,
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
  };
}

const initButtons = (buttonsRef, consoleSvgRef, buttonsActive) => {
  let cleanup = () => {};

  const pointerEvents = ["pointerdown", "pointerup", "pointercancel"];
  const keyEvents = ["keydown", "keyup"];

  /** @param {Event} event */
  const setButtonActive = (event) => {
    //for pointer events
    if (pointerEvents.includes(event.type)) {
      if (event.pointerType === "mouse" && event.button != 0) return;

      if (event.currentTarget) {
        if (event.type === "pointerdown")
          buttonsActive[event.currentTarget.dataset.buttonName] = true;
        else buttonsActive[event.currentTarget.dataset.buttonName] = false;
      }
    }
  };

  const allButtons = [
    buttonsRef.current.buttonUp,
    buttonsRef.current.buttonDown,
    buttonsRef.current.buttonLeft,
    buttonsRef.current.buttonRight,
    buttonsRef.current.buttonLWrapper,
    buttonsRef.current.buttonRWrapper,
    buttonsRef.current.buttonA,
    buttonsRef.current.buttonB,
  ];

  allButtons.forEach((button) => {
    if (button) {
      pointerEvents.forEach((eventName) => {
        button.addEventListener(eventName, setButtonActive);
      });
    }
  });

  cleanup = () => {
    allButtons.forEach((button) => {
      if (button) {
        pointerEvents.forEach((eventName) => {
          button.removeEventListener(eventName, setButtonActive);
        });
      }
    });
  };

  return cleanup;
};
