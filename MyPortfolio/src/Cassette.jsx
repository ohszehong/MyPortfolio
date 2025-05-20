import React, { useState, useEffect, useRef } from "react";
import CassetteSvg from "./CassetteSvg";

export default function Cassette({
  consoleSvgRef,
  isDraggingCassette,
  setIsDraggingCassette,
  setShouldBlockInput,
  cassetteInPlayIndex,
  setCassetteInPlayIndex,
  setIsLoadingContent,
}) {
  const [startScrollX, setStartScrollX] = useState(0);
  const [isDraggingContainer, setIsDraggingContainer] = useState(false);

  const cassetteIntro = { title: "INTRO", bgColor: "bg-purple-300" };
  const cassetteAPInDB = { title: "API & DB", bgColor: "bg-pink-200" };
  const cassetteWebSocket = { title: "WEBSOCKET", bgColor: "bg-yellow-100" };
  const cassetteProjects = { title: "PROJECTS", bgColor: "bg-purple-100" };

  const cassetteItemsProperties = [
    cassetteIntro,
    cassetteAPInDB,
    cassetteWebSocket,
    cassetteProjects,
  ];

  const cassetteIsOverConsole = useRef(false);
  const cassetteInPlay = useRef(null);

  const prevTime = useRef(null);

  useEffect(() => {
    window.addEventListener("pointerup", handleResetContainerDrag);
    window.addEventListener("blur", handleResetContainerDrag);
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("pointerup", handleResetContainerDrag);
      window.removeEventListener("blur", handleResetContainerDrag);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  function handleWindowResize() {
    //resize cassetteInPlay to those that are in the shelf
    if (cassetteInPlay.current) {
      let cassetteIndex = parseInt(cassetteInPlay.current.dataset.index);

      if (cassetteIndex === cassetteItemsProperties.length - 1) {
        cassetteIndex = 0;
      } else {
        cassetteIndex++;
      }

      const cassetteInShelf = document.getElementById(
        `cassette${cassetteIndex}`
      );

      if (cassetteInShelf) {
        const cassetteInShelfBoundingRect =
          cassetteInShelf.getBoundingClientRect();

        cassetteInPlay.current.style.minWidth = `${cassetteInShelfBoundingRect.width}px`;
        cassetteInPlay.current.style.maxWidth = `${cassetteInShelfBoundingRect.width}px`;
      }

      //modify the left and top of the cassetteInPlay so that it stay proportional as the console size changes
      if (consoleSvgRef.current) {
        const consoleBodyBoundingRect = consoleSvgRef.current
          .querySelector("#console-body")
          .getBoundingClientRect();
        const cassetteInPlayBoundingRect =
          cassetteInPlay.current.getBoundingClientRect();

        const cassetteNewLeft =
          (consoleBodyBoundingRect.width - cassetteInPlayBoundingRect.width) /
            2 +
          consoleBodyBoundingRect.left;
        const cassetteNewTop =
          consoleBodyBoundingRect.top +
          window.scrollY -
          cassetteInPlayBoundingRect.height / 2;

        cassetteInPlay.current.style.left = `${cassetteNewLeft}px`;
        cassetteInPlay.current.style.top = `${cassetteNewTop}px`;

        const slideDistance = cassetteInPlayBoundingRect.height / 2;

        cassetteInPlay.current.style.setProperty(
          "--slide-distance",
          `${slideDistance}px`
        );

        if (
          cassetteInPlay.current.style.getPropertyValue(
            "--transition-duration"
          ) != "0s"
        ) {
          startCassetteGameOnScreen(cassetteInPlay.current);
        }
      }
    }
  }

  /** @param {React.PointerEvent} event */
  function handleContainerPointerDown(event) {
    //left click only for mouse
    if (event.pointerType == "mouse") {
      if (event.button != "0") return;
    }

    console.log("container pressed...");
    setStartScrollX(event.pageX);
    setIsDraggingContainer(true);
  }

  /** @param {React.PointerEvent} event */
  function handleResetContainerDrag(event) {
    setStartScrollX(0);
    setIsDraggingContainer(false);
  }

  /** @param {React.PointerEvent} event */
  function handleContainerPointerMove(event) {
    if (isDraggingCassette) return;

    event.preventDefault();

    /** @type {HTMLElement} */
    let cassetteContainer = event.currentTarget;

    if (cassetteContainer && isDraggingContainer) {
      const currentMouseX = event.pageX;
      const distanceXToScroll = currentMouseX - startScrollX;

      cassetteContainer.scrollLeft += distanceXToScroll * 1.5;
      setStartScrollX(currentMouseX);
    }
  }

  /** @param {React.PointerEvent} event */
  function centerEventTargetAroundCursor(event) {
    const target = event.currentTarget;

    if (target) {
      const targetBounds = target.getBoundingClientRect();
      const targetWidth = targetBounds.width;
      const targetHeight = targetBounds.height;
      const targetHalfWidth = targetWidth / 2;
      const targetHalfHeight = targetHeight / 2;
      const targetXMid = targetBounds.left + targetHalfWidth;
      const targetYMid = targetBounds.top + targetHalfHeight;
      const newLeftOffset = targetXMid - event.pageX;
      const newTopOffset = targetYMid - event.pageY;
      target.style.left = `${targetBounds.left - newLeftOffset}px`;
      target.style.top = `${targetBounds.top - newTopOffset}px`;
      target.style.position = "absolute";
      target.style.zIndex = 10;
      target.style.maxWidth = `${targetWidth}px`;
    }
  }

  /** @param {React.PointerEvent} event */
  function handleCassettePointerDown(event) {
    //left click only for mouse
    if (event.pointerType == "mouse") {
      if (event.button != "0") return;
    }

    console.log("cassette pressed...");
    event.stopPropagation();
    centerEventTargetAroundCursor(event);
    setIsDraggingCassette(true);
  }

  /** @param {React.PointerEvent} event */
  function handleCassettePointerMove(event) {
    if (isDraggingCassette) {
      event.stopPropagation();
      centerEventTargetAroundCursor(event);

      //check for collision between cassette and console
      if (consoleSvgRef.current) {
        const cassetteBoundingRect =
          event.currentTarget.getBoundingClientRect();
        const consoleBoundingRect =
          consoleSvgRef.current.getBoundingClientRect();

        //AABB collision
        cassetteIsOverConsole.current =
          cassetteBoundingRect.right >= consoleBoundingRect.left &&
          cassetteBoundingRect.left <= consoleBoundingRect.right &&
          cassetteBoundingRect.bottom >= consoleBoundingRect.top &&
          cassetteBoundingRect.top <= consoleBoundingRect.bottom;

        if (cassetteIsOverConsole.current) {
          consoleSvgRef.current.classList.add("border-8");
        } else {
          if (consoleSvgRef.current.classList.contains("border-8")) {
            consoleSvgRef.current.classList.remove("border-8");
          }
        }
      }
    }
  }

  /** @param {React.PointerEvent} event */
  function handleDropCassette(event) {
    if (!isDraggingCassette) return;
    console.log("drop cassette triggered...");

    //if the event is pointerleave or pointercancel, reset the cassette regardless
    if (event.type === "pointerleave" || event.type === "pointercancel") {
      console.log("is pointer leaving...");
      cassetteIsOverConsole.current = false;
      consoleSvgRef.current.classList.remove("border-8");
    }

    setIsDraggingCassette(false);
    const cassette = event.currentTarget;

    //Dropped on Console
    if (cassetteIsOverConsole.current && consoleSvgRef.current) {
      //Reset cassette that is currently in play, if any
      if (cassetteInPlay.current) {
        resetCassetteLayout(cassetteInPlay.current);
      }

      //auto-scroll to top
      requestAnimationFrame(smoothScrollingToTop);

      consoleSvgRef.current.classList.remove("border-8");
      cassetteInPlay.current = cassette;

      const consoleBodyBoundingRect = consoleSvgRef.current
        .querySelector("#console-body")
        .getBoundingClientRect();
      const cassetteBoundingRect =
        cassetteInPlay.current.getBoundingClientRect();
      const cassetteNewLeft =
        (consoleBodyBoundingRect.width - cassetteBoundingRect.width) / 2 +
        consoleBodyBoundingRect.left;

      const cassetteNewTop =
        consoleBodyBoundingRect.top +
        window.scrollY -
        cassetteBoundingRect.height / 2; //DOMRect top is relative to the viewport, so we need to add the scrollY to get the correct position

      cassetteInPlay.current.style.left = `${cassetteNewLeft}px`;
      cassetteInPlay.current.style.top = `${cassetteNewTop}px`;
      cassetteInPlay.current.style.zIndex = "1";

      //block all user inputs and play slide down animation for cassetteInPlay
      setShouldBlockInput(true);
      const slideDistance = cassetteBoundingRect.height / 2;

      cassetteInPlay.current.style.setProperty(
        "--slide-distance",
        `${slideDistance}px`
      );
      cassetteInPlay.current.style.setProperty("--transition-duration", "3s");
    } else {
      resetCassetteLayout(cassette);
    }
  }

  function resetCassetteLayout(cassette) {
    if (cassette) {
      cassette.style.display = "";
      cassette.style.maxWidth = "";
      cassette.style.minWidth = "";
      cassette.style.left = "";
      cassette.style.top = "";
      cassette.style.position = "";
      cassette.style.zIndex = "";
      cassette.style.setProperty("--slide-distance", "0px");
      cassette.style.setProperty("--transition-duration", "0s");
    }
  }

  function startCassetteGameOnScreen(cassette) {
    if (cassette) {
      cassette.style.setProperty("--transition-duration", "0s");
      cassette.style.display = "none";
      setShouldBlockInput(false);
      setIsLoadingContent(true);
      setCassetteInPlayIndex(parseInt(cassette.dataset.index));
    }
  }

  function smoothScrollingToTop() {
    const currentScrollY = window.scrollY;
    const scrollPerSec = currentScrollY < 150 ? 50 : 300;

    if (currentScrollY > 0) {
      const currentStartTime = document.timeline.currentTime;

      if (prevTime.current === null) {
        prevTime.current = currentStartTime;
      }

      const deltaTime =
        (document.timeline.currentTime - prevTime.current) / 1000;
      window.scrollTo(0, currentScrollY - scrollPerSec * deltaTime);

      prevTime.current = currentStartTime;
      requestAnimationFrame(smoothScrollingToTop);
    } else {
      prevTime.current = null;
    }
  }

  return (
    <>
      <div
        id="cassette-flexbox-container"
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        className="inline-flex w-[80%] gap-x-16 lg:gap-x-32 mb-10 mt-4 md:w-[70%] lg:w-[80%] hover:cursor-grab"
      >
        {cassetteItemsProperties.map((Item, index) => (
          <div
            onPointerDown={handleCassettePointerDown}
            onPointerMove={handleCassettePointerMove}
            onPointerUp={handleDropCassette}
            onPointerLeave={handleDropCassette}
            onPointerCancel={handleDropCassette}
            onTransitionEnd={(event) => {
              startCassetteGameOnScreen(event.currentTarget);
            }}
            key={index}
            data-index={index}
            id={`cassette${index}`}
            className={`flex-shrink-0 w-[70%] lg:w-[55%] 2xl:w-[60%] 3xl:w-[55%] touch-none cassette-transition`}
          >
            {/* <img draggable='false' src={'src/assets/drawing.png'} /> */}
            <CassetteSvg cassetteProperties={Item} className={"relative"} />
          </div>
        ))}
      </div>
    </>
  );
}
