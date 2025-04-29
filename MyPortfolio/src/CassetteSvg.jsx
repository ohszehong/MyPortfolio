export default function CassetteSvg({ cassetteProperties, className, style }) {
  return (
    //     <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    // <!-- Created with Inkscape (http://www.inkscape.org/) -->

    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="svg1"
      style={{ width: "100%", height: "auto", ...style }}
      className={className}
      version="1.1"
      viewBox="0 0 410.918 179.031"
    >
      <g id="layer1" transform="translate(-67.296 -212.24)">
        <path
          id="rect24"
          fill="#dc0c0c"
          fillOpacity="0.484"
          fillRule="nonzero"
          stroke="#3b2484"
          strokeDasharray="none"
          strokeOpacity="1"
          strokeWidth="2.445"
          d="M92.958 244.897h359.594V390.05H92.958z"
          paintOrder="markers stroke fill"
        ></path>
        <path
          id="rect172"
          strokeWidth="0.263"
          d="M80.825 212.24h383.86c7.495 0 13.53 6.087 13.53 13.648v21.366c0 12.327-.34 12.855-5.571 12.844l-403.756-.802c-1.137-.002-1.592-.468-1.592-12.042v-21.366c0-7.56 6.034-13.647 13.53-13.647"
        ></path>
        <path
          id="rect173"
          fill="#000"
          strokeWidth="0.265"
          d="M117.421 267.386h310.667v113.189H117.421z"
        ></path>
        <text
          xmlSpace="preserve"
          id="text173"
          x="230.8"
          y="309.062"
          fill="#fff"
          fillOpacity="1"
          strokeWidth="0.265"
          direction="ltr"
          fontSize="50.8"
          style={{
            textAlign: "center",
            whiteSpace: "pre",
            inlineSize: "341.771",
          }}
          textAnchor="middle"
          transform="translate(43.332 28.29)"
          writingMode="lr-tb"
        >
          <tspan id="tspan1" x="230.8" y="309.062">
            {cassetteProperties.title || "Hello World"}
          </tspan>
        </text>
      </g>
    </svg>
  );
}
