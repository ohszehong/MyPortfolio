import { useEffect, useRef } from "react";

import ClientStatesManager from "./ClientStatesManager/ClientStatesManager";

const CassetteContentManager = ({
  cassetteInPlayIndex,
  setIsLoadingContent,
  consoleSvgRef,
  buttonsRef,
}) => {
  /** @type {{current: HTMLDivElement}} */
  const contentParentDivRef = useRef(null);

  /** @type {{current: ClientStatesManager}} */
  const ClientStatesManagerRef = useRef(null);

  useEffect(() => {
    ClientStatesManagerRef.current = new ClientStatesManager(
      consoleSvgRef,
      buttonsRef
    );

    return () => {
      console.log("resetting from []");
      ClientStatesManagerRef.current.resetStates();
    };
  }, []);

  useEffect(() => {
    //console.log("mounted. Source: CassetteContentManager");

    //for height transition effect
    if (contentParentDivRef?.current) {
      contentParentDivRef.current.style.width = "0px";
      contentParentDivRef.current.style.height = "0px";

      //force reflow since offsetHeight is one of the layout dependent property in which the browser have to get all the latest surrounding dom elements to get the correct offset value.
      contentParentDivRef.current.offsetHeight;
    }

    const shouldAbortRef = { current: false };

    const loadContent = async () => {
      console.log("play index: ", cassetteInPlayIndex);

      try {
        if (ClientStatesManagerRef.current) {
          await ClientStatesManagerRef.current.loadCassette(
            cassetteInPlayIndex,
            shouldAbortRef
          );
          setIsLoadingContent(false);

          if (contentParentDivRef.current) {
            contentParentDivRef.current.style.width = "100%";
            contentParentDivRef.current.style.height = "100%";
            contentParentDivRef.current.appendChild(
              ClientStatesManagerRef.current.getContentCanvas()
            );
            contentParentDivRef.current.offsetHeight;
          }

          //ClientStatesManagerRef.current.startGameLoop();
        }
      } catch (err) {
        setIsLoadingContent(null);
        console.log("failed to load content: ", err);
      }
    };

    if (cassetteInPlayIndex != null) loadContent();

    return () => {
      //console.log("unmounted. Source: CassetteContentManager");
      shouldAbortRef.current = true;

      if (ClientStatesManagerRef.current && cassetteInPlayIndex != null) {
        console.log("resetting from cassetteInPlayIndex");
        ClientStatesManagerRef.current.resetStates();
      }
    };
  }, [cassetteInPlayIndex]);

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
};

export default CassetteContentManager;
