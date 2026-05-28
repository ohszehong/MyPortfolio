import { useState, useRef, useEffect } from "react";
import "./App.css";
import BlockInputModal from "./BlockInputModal";
import BgBlocks from "./BgBlocks";
import Console from "./Console";
import Cassette from "./Cassette";
import CassetteContentManager from "./CassetteContentManager";

function App() {
  const [isDraggingCassette, setIsDraggingCassette] = useState(false);
  const [shouldBlockInput, setShouldBlockInput] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [cassetteInPlayIndex, setCassetteInPlayIndex] = useState(null);

  const consoleSvgRef = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (cursorRef.current) {
        //cursorRef.current.style.left = event.clientX + "px";
        //cursorRef.current.style.top = event.clientY + "px";

        //Use transform for GPU acceleration
        cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={cursorRef}></div>
      <BlockInputModal shouldBlockInput={shouldBlockInput} />
      <p className="p-7">Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console
        consoleSvgRef={consoleSvgRef}
        cassetteInPlayIndex={cassetteInPlayIndex}
        isLoadingContent={isLoadingContent}
        CassetteContentManager={(props) => (
          <CassetteContentManager
            {...props}
            cassetteInPlayIndex={cassetteInPlayIndex}
            setIsLoadingContent={setIsLoadingContent}
          />
        )}
      />
      <Cassette
        consoleSvgRef={consoleSvgRef}
        isDraggingCassette={isDraggingCassette}
        setIsDraggingCassette={setIsDraggingCassette}
        setShouldBlockInput={setShouldBlockInput}
        cassetteInPlayIndex={cassetteInPlayIndex}
        setCassetteInPlayIndex={setCassetteInPlayIndex}
        setIsLoadingContent={setIsLoadingContent}
      />
    </>
  );
}

export default App;
