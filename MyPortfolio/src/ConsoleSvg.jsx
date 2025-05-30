import { useEffect, useRef } from "react";

export default function ConsoleSvg({
  consoleSvgRef,
  CassetteContentManager,
  children,
}) {
  const buttonsRef = useRef({
    buttonUp: null,
    buttonLeft: null,
    buttonDown: null,
    buttonRight: null,
    buttonLWrapper: null,
    buttonRWrapper: null,
    buttonA: null,
    buttonB: null,
  });
  useEffect(() => {
    if (consoleSvgRef.current) {
      console.log("adding event listener. Source: consoleSvgRef.current");
      consoleSvgRef.current.addEventListener("keydown", onKeyDown);
      consoleSvgRef.current.addEventListener("keyup", onKeyUp);

      consoleSvgRef.current.focus();
    }

    return () => {
      console.log("remove event listener. Source: consoleSvgRef.current");

      if (consoleSvgRef.current) {
        consoleSvgRef.current.removeEventListener("keydown", onKeyDown);
        consoleSvgRef.current.removeEventListener("keyup", onKeyUp);
      }
    };
  }, []);

  const setActive = (active, button) => {
    if (button && button.dataset.keyIsDown === "0") {
      if (
        button.id === "button-L-wrapper" ||
        button.id === "button-R-wrapper"
      ) {
        const wrappedButton = document.getElementById(
          button.dataset.wrappedButtonId
        );

        if (wrappedButton) {
          wrappedButton.style.transform = "translateY(5%)";
          button = wrappedButton;
        }
      }

      if (active) {
        button.setAttribute("fill", "#6A6A6A");
      } else {
        button.setAttribute("fill", "#D9D9D9");

        //for button-L or button-R
        button.style.transform = "";
      }
    }
  };

  /** @param {PointerEvent} pointerEvent */
  const checkMouseEventButton = (pointerEvent, mouseButton) => {
    if (pointerEvent.pointerType === "mouse") {
      if (pointerEvent.button != mouseButton) return false;
      else return true;
    }
    //it might be a touch event
    return true;
  };

  //default behaviors for the buttons
  /** @param {PointerEvent} event */
  const onPointerDown = (event) => {
    if (!checkMouseEventButton(event, 0)) return;

    if (event.currentTarget) {
      setActive(true, event.currentTarget);
      event.currentTarget.dataset.keyIsDown = "1";
    }
  };

  /** @param {PointerEvent} event */
  const resetPointerEvent = (event) => {
    if (event.currentTarget) {
      event.currentTarget.dataset.keyIsDown = "0";
      setActive(false, event.currentTarget);
    }
  };

  const setActiveViaKeyBoardEvent = (active, key, keyEventType) => {
    let button;
    switch (key) {
      case "w":
        button = buttonsRef.current.buttonUp;
        break;

      case "a":
        button = buttonsRef.current.buttonLeft;
        break;

      case "s":
        button = buttonsRef.current.buttonDown;
        break;

      case "d":
        button = buttonsRef.current.buttonRight;
        break;

      case "q":
        button = buttonsRef.current.buttonLWrapper;
        break;

      case "e":
        button = buttonsRef.current.buttonRWrapper;
        break;

      case "p":
        button = buttonsRef.current.buttonA;
        break;

      case "l":
        button = buttonsRef.current.buttonB;
        break;
    }

    if (button) {
      if (keyEventType === "keyup") {
        button.dataset.keyIsDown = "0";
      }

      setActive(active, button);

      if (keyEventType === "keydown" && button.dataset.keyIsDown === "0") {
        button.dataset.keyIsDown = "1";
      }
    }
  };

  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (event.key) {
      setActiveViaKeyBoardEvent(true, event.key, event.type);
    }
  };

  /** @param {KeyboardEvent} event */
  const onKeyUp = (event) => {
    if (event.key) {
      setActiveViaKeyBoardEvent(false, event.key, event.type);
    }
  };

  return (
    <svg
      className="relative inline-block box-content 2xl:mr-8 md:w-[75%] select-none z-[5]"
      preserveAspectRatio="xMinYMin meet"
      viewBox="0 0 900 500"
      xmlns="http://www.w3.org/2000/svg"
      ref={consoleSvgRef}
      style={{ overflow: "visible" }}
      tabIndex={0}
      onClick={(event) => {
        if (event.button === 0) {
          event.currentTarget.focus();
        }
      }}
    >
      <defs>
        <linearGradient id="ScreenBgColorGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="25%" stopColor="#7EA0F4" />
          <stop offset="100%" stopColor="#EAC4FA" />
        </linearGradient>

        <clipPath id="ScreenClipPath">
          <path d="M235 80 h450 q15 0, 15 15 v240 q0 15, -15 15 h-450 q-15 0, -15 -15 v-240 q0 -15, 15 -15" />
        </clipPath>
      </defs>

      <rect
        x="80"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="#D9D9D9"
        id="button-L"
      />
      {/* wrapper to avoid triggering pointerleave/cancel when the user press the buttons */}
      <rect
        x="80"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="transparent"
        className="hover:cursor-pointer"
        data-wrapped-button-id="button-L"
        data-key-is-down="0"
        data-button-name="buttonLWrapper"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-L-wrapper"
        ref={(el) => (buttonsRef.current.buttonLWrapper = el)}
      />

      <rect
        x="690"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="#D9D9D9"
        id="button-R"
      />
      <rect
        x="690"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="transparent"
        className="hover:cursor-pointer"
        data-wrapped-button-id="button-R"
        data-key-is-down="0"
        data-button-name="buttonRWrapper"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-R-wrapper"
        ref={(el) => (buttonsRef.current.buttonRWrapper = el)}
      />

      <path
        id="console-body"
        d="M200 20 H725 q30 100, 135 100 V350 l-200 70 l-50 40 h-300 l-50 -40 l-200 -60 v-230 q100 -20, 135 -110"
        fill="#47399D"
      />
      <rect
        x="80"
        y="225"
        width="41"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        className="hover:cursor-pointer"
        data-key-is-down="0"
        data-button-name="buttonLeft"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-left"
        ref={(el) => (buttonsRef.current.buttonLeft = el)}
      />
      <rect
        x="160"
        y="225"
        width="41"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        className="hover:cursor-pointer"
        data-key-is-down="0"
        data-button-name="buttonRight"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-right"
        ref={(el) => (buttonsRef.current.buttonRight = el)}
      />
      <rect
        x="120"
        y="181"
        width="41"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        className="hover:cursor-pointer"
        data-key-is-down="0"
        data-button-name="buttonUp"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-up"
        ref={(el) => (buttonsRef.current.buttonUp = el)}
      />
      <rect
        x="120"
        y="268"
        width="41"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        className="hover:cursor-pointer"
        data-key-is-down="0"
        data-button-name="buttonDown"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-down"
        ref={(el) => (buttonsRef.current.buttonDown = el)}
      />

      {/* render at last so it stays on top of every buttons */}
      <rect
        x="120"
        y="225"
        width="41"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        className="hover:cursor-pointer"
        id="button-middle"
      />

      <rect x="325" y="425" width="275" height="15" fill="#D9D9D9" />
      <circle
        cx="795"
        cy="200"
        r="25"
        fill="#D9D9D9"
        className="hover:cursor-pointer"
        data-button-name="buttonA"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-a"
        ref={(el) => (buttonsRef.current.buttonA = el)}
      />
      <text
        x="795"
        y="212"
        fill="#B8B8B8"
        pointerEvents="none"
        textAnchor="middle"
        fontSize={48}
      >
        A
      </text>
      <circle
        cx="745"
        cy="280"
        r="25"
        fill="#D9D9D9"
        className="hover:cursor-pointer"
        data-button-name="buttonB"
        onPointerDown={onPointerDown}
        onPointerUp={resetPointerEvent}
        onPointerLeave={resetPointerEvent}
        onPointerCancel={resetPointerEvent}
        id="button-b"
        ref={(el) => (buttonsRef.current.buttonB = el)}
      />
      <text
        x="745"
        y="293"
        fill="#B8B8B8"
        pointerEvents="none"
        textAnchor="middle"
        fontSize={48}
      >
        B
      </text>

      {/* <path
        d="M235 80 h450 q15 0, 15 15 v240 q-225 60, -470 0 v-240 q0 -15, 15 -15"
        fill="url(#ScreenBgColorGradient)"
      /> */}

      <path
        d="M235 80 h450 q15 0, 15 15 v240 q0 15, -15 15 h-450 q-15 0, -15 -15 v-240 q0 -15, 15 -15"
        fill="url(#ScreenBgColorGradient)"
      />

      {children}

      <foreignObject
        x={220}
        y={80}
        width={480}
        height={280}
        clipPath="url(#ScreenClipPath)"
      >
        {CassetteContentManager({
          consoleSvgRef: consoleSvgRef,
          buttonsRef: buttonsRef,
        })}
      </foreignObject>
    </svg>
  );
}
