import { useState, useRef } from "react";
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

  return (
    <>
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
