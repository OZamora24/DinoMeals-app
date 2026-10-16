// Prehistoric skyline along the bottom of the home-page hero: a volcano, palm and
// fern trees, a long-neck dino reaching for leaves and a T-rex on patrol.
// Pure inline SVG (no images to load); gentle sway animations in globals.css
// (.dino-scene …), switched off for people who prefer reduced motion.
export default function DinoScene() {
  return (
    <svg className="dino-scene" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="ds-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f0c0b" stopOpacity="0" />
          <stop offset="1" stopColor="#0f0c0b" stopOpacity=".9" />
        </linearGradient>
        <radialGradient id="ds-lava" cx=".5" cy="0" r=".6">
          <stop offset="0" stopColor="#ff8a3d" stopOpacity=".9" />
          <stop offset="1" stopColor="#e2372d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* far layer: volcano + hills */}
      <g className="ds-far">
        <path d="M760 260 L860 120 Q880 104 900 120 L1010 260 Z" />
        <ellipse className="ds-lava" cx="880" cy="118" rx="42" ry="20" fill="url(#ds-lava)" />
        <g className="ds-smoke">
          <circle cx="878" cy="92" r="12" /><circle cx="892" cy="70" r="16" /><circle cx="874" cy="44" r="20" />
        </g>
        <path d="M0 260 Q120 200 260 222 T560 210 T820 228 T1200 205 L1200 260 Z" />
      </g>

      {/* mid layer: trees */}
      <g className="ds-mid">
        {/* tall palm (the long-neck is eating from it) */}
        <g className="ds-palm" style={{ transformOrigin: '300px 255px' }}>
          <path d="M296 258 Q290 190 306 120 L314 121 Q302 190 308 258 Z" />
          <g className="ds-fronds" style={{ transformOrigin: '310px 120px' }}>
            <path d="M310 120 Q262 92 222 112 Q258 108 310 132 Z" />
            <path d="M310 120 Q350 86 404 100 Q356 106 312 134 Z" />
            <path d="M310 118 Q284 70 246 64 Q286 82 306 124 Z" />
            <path d="M310 118 Q336 66 376 58 Q338 80 314 124 Z" />
            <path d="M310 122 Q270 130 246 160 Q280 136 312 128 Z" />
            <path d="M310 122 Q356 128 380 158 Q346 136 310 128 Z" />
          </g>
        </g>
        {/* second palm */}
        <g className="ds-palm ds-palm-2" style={{ transformOrigin: '1080px 258px' }}>
          <path d="M1076 258 Q1084 200 1070 150 L1078 149 Q1092 200 1086 258 Z" />
          <g className="ds-fronds" style={{ transformOrigin: '1074px 150px' }}>
            <path d="M1074 150 Q1030 126 996 142 Q1032 134 1074 156 Z" />
            <path d="M1074 150 Q1112 122 1156 132 Q1114 132 1076 158 Z" />
            <path d="M1074 148 Q1050 108 1018 104 Q1054 120 1072 154 Z" />
            <path d="M1074 148 Q1098 106 1132 102 Q1100 118 1078 154 Z" />
          </g>
        </g>
        {/* tree ferns / conifers */}
        <path d="M560 258 L586 170 L612 258 Z M566 230 L586 150 L606 230 Z" />
        <path d="M170 258 L186 206 L202 258 Z" />
        <path d="M720 258 L738 196 L756 258 Z" />
        {/* ground ferns */}
        <path d="M40 258 Q60 226 84 214 Q70 236 74 258 Z M60 258 Q92 230 120 228 Q96 242 92 258 Z" />
        <path d="M640 258 Q660 232 690 222 Q676 240 678 258 Z" />
        <path d="M940 258 Q962 230 990 224 Q976 242 978 258 Z M960 258 Q990 236 1016 236 Q996 248 994 258 Z" />
      </g>

      {/* front layer: dinosaurs */}
      <g className="ds-front">
        {/* long-neck reaching the palm */}
        <g className="ds-longneck">
          <path d="M392 248 Q384 214 410 196 Q446 176 500 182 Q540 186 556 206 Q570 222 600 228 Q640 234 690 226 Q640 244 596 244 Q568 244 552 238 L548 258 L532 258 L530 240 L452 238 L450 258 L434 258 L430 236 Q408 240 404 258 L392 258 Z" />
          <g className="ds-neck" style={{ transformOrigin: '420px 200px' }}>
            <path d="M410 200 Q392 160 376 124 Q368 104 352 98 Q338 94 330 102 Q326 110 336 112 Q350 112 356 124 Q370 160 396 206 Z" />
            <circle className="ds-eye" cx="342" cy="101" r="2" />
          </g>
        </g>
        {/* T-rex on patrol */}
        <g className="ds-rex">
          <path d="M820 208 Q842 190 870 188 Q884 172 906 170 Q930 170 944 182 Q950 190 942 194 L922 196 Q916 204 902 206 Q900 214 892 216 Q890 222 884 222 L888 214 Q878 214 874 222 L870 220 Q874 210 882 206 Q872 210 862 220 L866 246 L878 258 L852 258 L850 236 Q838 228 832 226 L828 244 L840 258 L814 258 L812 230 Q790 226 760 222 Q730 220 708 224 Q736 210 770 208 Q796 206 820 208 Z" />
          <circle className="ds-eye" cx="926" cy="178" r="2.2" />
        </g>
      </g>

      <rect className="ds-ground" x="0" y="246" width="1200" height="14" />
      <rect x="0" y="0" width="1200" height="260" fill="url(#ds-fade)" opacity=".35" />
    </svg>
  );
}
