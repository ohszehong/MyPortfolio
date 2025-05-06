import ConsoleSvg from "./ConsoleSvg";

export default function Console({
  consoleSvgRef,
  cassetteInPlayIndexRef,
  isLoadingGame,
  GameMaps,
}) {
  function AnimatedDots(numberOfDots) {
    return (
      <>
        {Array.from({ length: numberOfDots }).map((_, index) => {
          const middleKeyTimes = 0.1 + index * 0.02;

          return (
            <tspan key={index} letterSpacing="3">
              .
              <animate
                attributeName="fill"
                values="transparent;white;transparent"
                keyTimes={`0;${middleKeyTimes};0.65`}
                dur="2s"
                calcMode="discrete"
                repeatDur="indefinite"
              />
            </tspan>
          );
        })}
      </>
    );
  }

  return (
    <div>
      <ConsoleSvg consoleSvgRef={consoleSvgRef} GameMaps={GameMaps}>
        <text
          x="470"
          y="200"
          fontFamily="Jersey 15"
          fontSize="48"
          textAnchor="middle"
          fill="#FFFFFF"
        >
          {cassetteInPlayIndexRef.current != null ? (
            isLoadingGame ? (
              <>
                <tspan dy="0.5em">Loading</tspan>
                {AnimatedDots(3)}
              </>
            ) : (
              <></>
            )
          ) : (
            <>
              <tspan>Drag and insert</tspan>
              <tspan x="470" dy="1em">
                any cassette below
              </tspan>
              {AnimatedDots(3)}
            </>
          )}
        </text>
      </ConsoleSvg>
    </div>
  );
}
