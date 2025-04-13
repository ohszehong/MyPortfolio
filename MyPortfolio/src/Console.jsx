import React from "react";

export default function Console({ consoleSvgRef }) {
  return (
    <svg
      className="relative inline-block box-content 2xl:mr-8 md:w-[75%] select-none z-[5]"
      preserveAspectRatio="xMinYMin meet"
      viewBox="0 0 900 500"
      xmlns="http://www.w3.org/2000/svg"
      ref={consoleSvgRef}
    >
      <defs>
        <linearGradient id="ScreenBgColorGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="25%" stopColor="#7EA0F4" />
          <stop offset="100%" stopColor="#EAC4FA" />
        </linearGradient>
      </defs>

      <rect
        x="80"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="#D9D9D9"
      />
      <rect
        x="690"
        y="40"
        rx="20"
        ry="20"
        width="150"
        height="100"
        fill="#D9D9D9"
      />
      <path
        d="M200 20 H725 q30 100, 135 100 V350 l-200 70 l-50 40 h-300 l-50 -40 l-200 -60 v-230 q100 -20, 135 -110"
        fill="#47399D"
      />
      <rect x="90" y="225" width="115" height="45" fill="#D9D9D9" />
      <rect x="125" y="190" width="45" height="115" fill="#D9D9D9" />

      <rect x="325" y="425" width="275" height="15" fill="#D9D9D9" />
      <circle cx="795" cy="200" r="25" fill="#D9D9D9" />
      <circle cx="745" cy="280" r="25" fill="#D9D9D9" />

      <path
        d="M235 80 h450 q15 0, 15 15 v240 q-225 60, -470 0 v-240 q0 -15, 15 -15"
        fill="url(#ScreenBgColorGradient)"
      />

      <text
        x="470"
        y="200"
        fontFamily="Jersey 15"
        fontSize="48"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        <tspan>Drag and insert</tspan>
        <tspan x="470" dy="1em">
          any cassette below
        </tspan>
        <tspan letterSpacing="3">
          .
          <animate
            attributeName="fill"
            values="transparent;white;transparent"
            keyTimes="0;0.1;0.65"
            dur="2s"
            calcMode="discrete"
            repeatDur="indefinite"
          />
        </tspan>
        <tspan letterSpacing="3">
          .
          <animate
            attributeName="fill"
            values="transparent;white;transparent"
            keyTimes="0;0.13;0.65"
            dur="2s"
            calcMode="discrete"
            repeatDur="indefinite"
          />
        </tspan>
        <tspan letterSpacing="3">
          .
          <animate
            attributeName="fill"
            values="transparent;white;transparent"
            keyTimes="0;0.15;0.65"
            dur="2s"
            calcMode="discrete"
            repeatDur="indefinite"
          />
        </tspan>
      </text>
    </svg>
  );
}
