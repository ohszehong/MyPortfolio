import { useState, useRef } from "react";
import "./App.css";
import BlockInputModal from "./BlockInputModal";
import BgBlocks from "./BgBlocks";
import Console from "./Console";
import Cassette from "./Cassette";

function App() {
  const [isDraggingCassette, setIsDraggingCassette] = useState(false);
  const [shouldBlockInput, setShouldBlockInput] = useState(false);

  const consoleSvgRef = useRef(null);

  return (
    <>
      <BlockInputModal shouldBlockInput={shouldBlockInput} />
      <p className="p-7">Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console consoleSvgRef={consoleSvgRef} />
      <Cassette
        consoleSvgRef={consoleSvgRef}
        isDraggingCassette={isDraggingCassette}
        setIsDraggingCassette={setIsDraggingCassette}
        setShouldBlockInput={setShouldBlockInput}
      />
    </>
  );
}

export default App;
