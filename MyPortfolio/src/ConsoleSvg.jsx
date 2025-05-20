export default function ConsoleSvg({
  consoleSvgRef,
  CassetteContentManager,
  children,
}) {
  return (
    <svg
      className="relative inline-block box-content 2xl:mr-8 md:w-[75%] select-none z-[5]"
      preserveAspectRatio="xMinYMin meet"
      viewBox="0 0 900 500"
      xmlns="http://www.w3.org/2000/svg"
      ref={consoleSvgRef}
      style={{ overflow: "visible" }}
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
      <path
        id="console-body"
        d="M200 20 H725 q30 100, 135 100 V350 l-200 70 l-50 40 h-300 l-50 -40 l-200 -60 v-230 q100 -20, 135 -110"
        fill="#47399D"
      />
      <rect
        x="80"
        y="225"
        width="42"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        id="button-left"
      />
      <rect
        x="120"
        y="225"
        width="42"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        id="button-middle"
      />
      <rect
        x="160"
        y="225"
        width="40"
        height="45"
        fill="#D9D9D9"
        stroke="none"
        id="button-right"
      />
      <rect
        x="117"
        y="185"
        width="45"
        height="42"
        fill="#D9D9D9"
        stroke="none"
        id="button-up"
      />
      <rect
        x="117"
        y="265"
        width="45"
        height="40"
        fill="#D9D9D9"
        stroke="none"
        id="button-down"
      />

      <rect x="325" y="425" width="275" height="15" fill="#D9D9D9" />
      <circle cx="795" cy="200" r="25" fill="#D9D9D9" id="button-a" />
      <text x="795" y="212" fill="#B8B8B8" textAnchor="middle" fontSize={48}>
        A
      </text>
      <circle cx="745" cy="280" r="25" fill="#D9D9D9" id="button-b" />
      <text x="745" y="293" fill="#B8B8B8" textAnchor="middle" fontSize={48}>
        B
      </text>

      {/* <path
        d="M235 80 h450 q15 0, 15 15 v240 q-225 60, -470 0 v-240 q0 -15, 15 -15"
        fill="url(#ScreenBgColorGradient)"
      /> */}

      <path
        d="M235 80 h450 q15 0, 15 15 v240 q0 15, -15 15 h-450 q-15 0, -15 -15 v-240 q0 -15, 15 -15"
        fill="url(#ScreenBgColorGradient)"
        onClick={(event) => {
          if (event.button === 0) {
            let wrapper = document.getElementById("cassette-content-wrapper");
            if (wrapper) {
              wrapper.focus();
            }
          }
        }}
      />

      {children}

      <foreignObject
        x={220}
        y={80}
        width={480}
        height={280}
        clipPath="url(#ScreenClipPath)"
      >
        {CassetteContentManager}
      </foreignObject>
    </svg>
  );
}
