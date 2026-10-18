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
        {/* T-rex on patrol: big head + jaw, tiny arms, thick legs, tail out back */}
        {/* shifted left + up so the whole rex shows on phones and its legs clear the ground strip */}
        <g transform="translate(-50 -10)">
        <g className="ds-rex">
          <path d="M 682 214 C 720 206 770 196 806 184 C 830 175 856 168 878 166 C 890 165 897 160 900 150 L 903 140 C 908 132 924 130 944 133 L 964 139 C 972 142 974 150 970 154 L 952 157 L 968 161 C 968 168 958 172 946 172 L 922 173 C 912 176 906 183 904 190 C 900 202 890 210 876 214 C 878 222 876 232 868 240 L 870 251 L 884 255 L 884 259 L 848 259 L 850 252 L 849 244 C 840 241 832 234 829 226 C 824 230 819 233 815 235 L 813 248 L 824 255 L 824 259 L 796 259 L 798 250 L 798 234 C 791 228 788 221 786 214 C 760 214 720 216 682 214 Z" />
          <path d="M 898 192 C 906 192 912 196 914 202 L 910 204 C 907 199 902 198 896 198 Z" />
          <circle className="ds-eye" cx="932" cy="145" r="2.4" />
        </g>
        </g>
      </g>

      <rect className="ds-ground" x="0" y="246" width="1200" height="14" />
      <rect x="0" y="0" width="1200" height="260" fill="url(#ds-fade)" opacity=".35" />
    </svg>
  );
}
