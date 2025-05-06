import { useState, useRef } from "react";
import "./App.css";
import BlockInputModal from "./BlockInputModal";
import BgBlocks from "./BgBlocks";
import Console from "./Console";
import Cassette from "./Cassette";
import GameMaps from "./GameMaps";

function App() {
  const [isDraggingCassette, setIsDraggingCassette] = useState(false);
  const [shouldBlockInput, setShouldBlockInput] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(false);

  const consoleSvgRef = useRef(null);
  const cassetteInPlayIndex = useRef(null);

  return (
    <>
      <BlockInputModal shouldBlockInput={shouldBlockInput} />
      <p className="p-7">Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console
        consoleSvgRef={consoleSvgRef}
        cassetteInPlayIndexRef={cassetteInPlayIndex}
        isLoadingGame={isLoadingGame}
        GameMaps={<GameMaps />}
      />
      <Cassette
        consoleSvgRef={consoleSvgRef}
        isDraggingCassette={isDraggingCassette}
        setIsDraggingCassette={setIsDraggingCassette}
        setShouldBlockInput={setShouldBlockInput}
        cassetteInPlayIndexRef={cassetteInPlayIndex}
        setIsLoadingGame={setIsLoadingGame}
      />
    </>
  );
}

export default App;
