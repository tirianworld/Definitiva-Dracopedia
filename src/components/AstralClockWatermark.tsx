import React from "react";

interface AstralClockWatermarkProps {
  className?: string;
  size?: number | string;
  opacity?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * 12 Dial Configurations matching LOGO RELOJ ASTRAL
 * Clockwise starting from top (12 o'clock / -90 deg)
 */
export const ASTRAL_12_DIALS = [
  { label: "Y", angle: -90, type: "rune-12-y" },            // 12 o'clock: Upright Y
  { label: "k", angle: -60, type: "rune-1-curved-y" },      // 1 o'clock: Curved sickle Y
  { label: "X", angle: -30, type: "rune-2-x" },             // 2 o'clock: X cross
  { label: "<", angle: 0,   type: "rune-3-notched-chev" },  // 3 o'clock: Notched chevron <
  { label: "X", angle: 30,  type: "rune-4-x" },             // 4 o'clock: X cross
  { label: "k", angle: 60,  type: "rune-5-curved-y" },      // 5 o'clock: Curved sickle Y lower
  { label: "Y", angle: 90,  type: "rune-6-inv-y" },         // 6 o'clock: Inverted Y
  { label: "Y", angle: 120, type: "rune-7-branch-y" },      // 7 o'clock: Branched Y lower-left
  { label: "r", angle: 150, type: "rune-8-crescent-low" },  // 8 o'clock: Crescent with lower branch
  { label: ">|<", angle: 180, type: "rune-9-brackets" },    // 9 o'clock: > | <
  { label: "r", angle: 210, type: "rune-10-crescent-high" },// 10 o'clock: Crescent with upper branch
  { label: "Y", angle: 240, type: "rune-11-branch-y" },     // 11 o'clock: Branched Y upper-left
];

export function AstralClockLogo({
  className = "w-4 h-4",
  size,
  opacity = 1,
  color = "currentColor",
  style,
}: AstralClockWatermarkProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    opacity,
    color,
    ...(size ? { width: size, height: size } : {}),
  };

  return (
    <svg
      viewBox="0 0 600 600"
      className={`${className} shrink-0 inline-block select-none`}
      xmlns="http://www.w3.org/2000/svg"
      style={customStyle}
    >
      <g fill="currentColor" stroke="currentColor">
        {/* Outer Scalloped Bridges in the crevices between adjacent medallions (12 positions) */}
        <g strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) - 75;
            const rad = (angle * Math.PI) / 180;
            const cx = 300 + 266 * Math.cos(rad);
            const cy = 300 + 266 * Math.sin(rad);
            const perpX = -Math.sin(rad);
            const perpY = Math.cos(rad);
            return (
              <g key={`cusp-${i}`}>
                <path
                  d={`M ${cx - perpX * 18 - Math.cos(rad) * 8} ${cy - perpY * 18 - Math.sin(rad) * 8} Q ${cx + Math.cos(rad) * 6} ${cy + Math.sin(rad) * 6} ${cx + perpX * 18 - Math.cos(rad) * 8} ${cy + perpY * 18 - Math.sin(rad) * 8}`}
                />
                <circle cx={cx + Math.cos(rad) * 2} cy={cy + Math.sin(rad) * 2} r="3" fill="currentColor" stroke="none" />
              </g>
            );
          })}
        </g>

        {/* Interstitial Calligraphic Flourishes between Spheres and Medallions (12 positions) */}
        <g strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) - 75;
            const rad = (angle * Math.PI) / 180;
            const fx = 300 + 166 * Math.cos(rad);
            const fy = 300 + 166 * Math.sin(rad);
            const perpX = -Math.sin(rad);
            const perpY = Math.cos(rad);

            return (
              <g key={`flourish-between-${i}`}>
                {/* Left curl */}
                <path
                  d={`M ${fx} ${fy + 0.01} C ${fx - perpX * 8 + Math.cos(rad) * 8} ${fy - perpY * 8 + Math.sin(rad) * 8}, ${fx - perpX * 16 + Math.cos(rad) * 4} ${fy - perpY * 16 + Math.sin(rad) * 4}, ${fx - perpX * 14 - Math.cos(rad) * 4} ${fy - perpY * 14 - Math.sin(rad) * 4}`}
                />
                <circle cx={fx - perpX * 14 - Math.cos(rad) * 4} cy={fy - perpY * 14 - Math.sin(rad) * 4} r="2.5" fill="currentColor" stroke="none" />
                {/* Right curl */}
                <path
                  d={`M ${fx} ${fy} C ${fx + perpX * 8 + Math.cos(rad) * 8} ${fy + perpY * 8 + Math.sin(rad) * 8}, ${fx + perpX * 16 + Math.cos(rad) * 4} ${fy + perpY * 16 + Math.sin(rad) * 4}, ${fx + perpX * 14 - Math.cos(rad) * 4} ${fy + perpY * 14 - Math.sin(rad) * 4}`}
                />
                <circle cx={fx + perpX * 14 - Math.cos(rad) * 4} cy={fy + perpY * 14 - Math.sin(rad) * 4} r="2.5" fill="currentColor" stroke="none" />
              </g>
            );
          })}
        </g>

        {/* 12 Astral Rune Medallions */}
        {renderRuneDials()}

        {/* 12 Solid Celestial Spheres with Outer Rings (radially aligned with the 12 Medallions) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) - 90;
          const rad = (angle * Math.PI) / 180;
          const sx = 300 + 138 * Math.cos(rad);
          const sy = 300 + 138 * Math.sin(rad);
          return (
            <g key={`mid-dot-${i}`}>
              {/* Outer thin ring around sphere */}
              <circle cx={sx} cy={sy} r="24" fill="none" strokeWidth="3" />
              {/* Solid dark sphere */}
              <circle cx={sx} cy={sy} r="18" fill="currentColor" stroke="none" />
            </g>
          );
        })}

        {/* Center Concentric Rings (Matching LOGO RELOJ ASTRAL) */}
        {/* Outer Core Ring */}
        <circle cx="300" cy="300" r="96" fill="none" strokeWidth="11" />
        {/* Inner Thick Solid Donut Ring */}
        <circle cx="300" cy="300" r="50" fill="none" strokeWidth="28" />
      </g>
    </svg>
  );
}

function renderRuneDials() {
  return ASTRAL_12_DIALS.map((cfg, idx) => {
    const rad = (cfg.angle * Math.PI) / 180;
    const cx = 300 + 228 * Math.cos(rad);
    const cy = 300 + 228 * Math.sin(rad);

    return (
      <g key={`rune-dial-${idx}`}>
        {/* Outer solid medallion border */}
        <circle cx={cx} cy={cy} r="55" fill="none" strokeWidth="4.5" />
        {/* Middle stippled bead ring */}
        <circle cx={cx} cy={cy} r="50.5" fill="none" strokeWidth="3.5" strokeDasharray="3 3.5" />
        {/* Inner solid boundary rim */}
        <circle cx={cx} cy={cy} r="46" fill="none" strokeWidth="2.5" />

        {/* Bold Rune Character Inscription */}
        <g strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {renderRunePath(cfg.type, cx, cy)}
        </g>
      </g>
    );
  });
}

function renderRunePath(type: string, cx: number, cy: number) {
  switch (type) {
    case "rune-12-y": // 12 o'clock: Upright Y
      return (
        <path d={`M ${cx} ${cy + 28} L ${cx} ${cy + 2} M ${cx} ${cy + 2} L ${cx - 18} ${cy - 26} M ${cx} ${cy + 2} L ${cx + 18} ${cy - 26}`} />
      );
    case "rune-1-curved-y": // 1 o'clock: Curved sickle Y
      return (
        <g>
          <path d={`M ${cx - 24} ${cy + 16} L ${cx + 26} ${cy - 10}`} />
          <path d={`M ${cx - 14} ${cy - 26} C ${cx - 16} ${cy + 2}, ${cx - 2} ${cy + 18}, ${cx + 20} ${cy + 24}`} />
        </g>
      );
    case "rune-2-x": // 2 o'clock: X cross
    case "rune-4-x": // 4 o'clock: X cross
      return (
        <path d={`M ${cx - 22} ${cy - 22} L ${cx + 22} ${cy + 22} M ${cx + 18} ${cy - 22} L ${cx - 18} ${cy + 22}`} />
      );
    case "rune-3-notched-chev": // 3 o'clock: Notched chevron <
      return (
        <path d={`M ${cx + 10} ${cy - 26} L ${cx - 8} ${cy - 4} L ${cx - 2} ${cy} L ${cx - 8} ${cy + 4} L ${cx + 10} ${cy + 26}`} />
      );
    case "rune-5-curved-y": // 5 o'clock: Curved sickle Y lower
      return (
        <g>
          <path d={`M ${cx - 22} ${cy - 14} L ${cx + 24} ${cy + 12}`} />
          <path d={`M ${cx - 16} ${cy + 24} C ${cx - 16} ${cy - 2}, ${cx - 2} ${cy - 18}, ${cx + 22} ${cy - 20}`} />
        </g>
      );
    case "rune-6-inv-y": // 6 o'clock: Inverted Y
      return (
        <path d={`M ${cx} ${cy - 28} L ${cx} ${cy - 2} M ${cx} ${cy - 2} L ${cx - 18} ${cy + 26} M ${cx} ${cy - 2} L ${cx + 18} ${cy + 26}`} />
      );
    case "rune-7-branch-y": // 7 o'clock: Branched Y lower-left
      return (
        <g>
          <path d={`M ${cx - 28} ${cy + 6} L ${cx + 4} ${cy - 4} L ${cx - 6} ${cy + 26}`} />
          <path d={`M ${cx - 8} ${cy - 26} C ${cx + 2} ${cy - 6}, ${cx + 12} ${cy + 8}, ${cx + 26} ${cy + 14}`} />
        </g>
      );
    case "rune-8-crescent-low": // 8 o'clock: Crescent with lower branch
      return (
        <g>
          <path d={`M ${cx - 20} ${cy - 22} C ${cx + 6} ${cy - 6}, ${cx + 6} ${cy + 14}, ${cx - 16} ${cy + 26}`} />
          <path d={`M ${cx - 2} ${cy + 12} Q ${cx + 12} ${cy + 12} ${cx + 24} ${cy + 16}`} />
        </g>
      );
    case "rune-9-brackets": // 9 o'clock: > | <
      return (
        <g>
          <path d={`M ${cx - 30} ${cy - 12} L ${cx - 18} ${cy} L ${cx - 30} ${cy + 12}`} />
          <path d={`M ${cx - 2} ${cy - 28} Q ${cx - 6} ${cy} ${cx - 2} ${cy + 28}`} />
          <path d={`M ${cx + 26} ${cy - 12} L ${cx + 12} ${cy} L ${cx + 26} ${cy + 12}`} />
        </g>
      );
    case "rune-10-crescent-high": // 10 o'clock: Crescent with upper branch
      return (
        <g>
          <path d={`M ${cx - 16} ${cy - 26} C ${cx + 6} ${cy - 14}, ${cx + 6} ${cy + 6}, ${cx - 20} ${cy + 22}`} />
          <path d={`M ${cx - 2} ${cy - 12} Q ${cx + 12} ${cy - 12} ${cx + 24} ${cy - 16}`} />
        </g>
      );
    case "rune-11-branch-y": // 11 o'clock: Branched Y upper-left
      return (
        <g>
          <path d={`M ${cx - 28} ${cy - 6} L ${cx + 4} ${cy + 4} L ${cx - 6} ${cy - 26}`} />
          <path d={`M ${cx - 8} ${cy + 26} C ${cx + 2} ${cy + 6}, ${cx + 12} ${cy - 8}, ${cx + 26} ${cy - 14}`} />
        </g>
      );
    default:
      return (
        <path d={`M ${cx - 18} ${cy - 18} L ${cx + 18} ${cy + 18} M ${cx + 18} ${cy - 18} L ${cx - 18} ${cy + 18}`} />
      );
  }
}

/**
 * Ornate Calligraphic Corner Floritura (Flourish) in the exact style of the Astral Clock
 */
export function AstralCornerFlourish({
  className = "w-24 h-24",
  position = "top-left",
  color = "currentColor",
}: {
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  color?: string;
}) {
  let transform = "";
  if (position === "top-right") transform = "scaleX(-1)";
  if (position === "bottom-left") transform = "scaleY(-1)";
  if (position === "bottom-right") transform = "scale(-1, -1)";

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} pointer-events-none select-none`}
      style={{ transform, color }}
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Corner pivot rosette node */}
        <circle cx="16" cy="16" r="4" fill="currentColor" stroke="none" />
        <circle cx="16" cy="16" r="8" strokeWidth="1.5" opacity="0.7" strokeDasharray="2 2" />

        {/* Primary Horizontal S-Flourish Scroll */}
        <path
          d="M 16 16 C 36 16, 52 10, 74 14 C 92 18, 104 28, 114 22 C 118 19, 116 13, 110 13 C 104 13, 102 19, 106 23"
          strokeWidth="2"
        />
        {/* Foliate sprig on horizontal arm */}
        <path d="M 48 14 C 54 8, 64 6, 68 8" strokeWidth="1.5" />
        <circle cx="68" cy="8" r="1.5" fill="currentColor" stroke="none" />
        <path d="M 82 16 C 88 10, 96 10, 98 12" strokeWidth="1.2" />

        {/* Primary Vertical S-Flourish Scroll (Mirror) */}
        <path
          d="M 16 16 C 16 36, 10 52, 14 74 C 18 92, 28 104, 22 114 C 19 118, 13 116, 13 110 C 13 104, 19 102, 23 106"
          strokeWidth="2"
        />
        {/* Foliate sprig on vertical arm */}
        <path d="M 14 48 C 8 54, 6 64, 8 68" strokeWidth="1.5" />
        <circle cx="8" cy="68" r="1.5" fill="currentColor" stroke="none" />
        <path d="M 16 82 C 10 88, 10 96, 12 98" strokeWidth="1.2" />

        {/* Inner Astral Arc with stippled dots and mini-rune */}
        <path
          d="M 16 52 C 34 50, 50 34, 52 16"
          strokeWidth="1.5"
          strokeDasharray="2.5 3"
          opacity="0.8"
        />
        <circle cx="34" cy="34" r="7" strokeWidth="1.5" />
        {/* Mini rune inside corner medallion */}
        <path d="M 34 39 L 34 33 M 34 33 L 30 29 M 34 33 L 38 29" strokeWidth="1.5" />

        {/* Diagonal tendril curl towards screen center */}
        <path
          d="M 39 39 C 48 48, 58 56, 72 62 C 80 65, 86 63, 86 58 C 86 54, 80 54, 78 57"
          strokeWidth="1.8"
        />
        <circle cx="78" cy="57" r="1.5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * Astral Calligraphic Flourish Divider (for headings, cards or margins)
 */
export function AstralFlourishDivider({
  className = "w-full max-w-md h-8",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 40"
      className={`${className} pointer-events-none select-none`}
      style={{ color }}
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Center Astral Eye / Medallion */}
        <circle cx="200" cy="20" r="10" strokeWidth="2" />
        <circle cx="200" cy="20" r="13" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        <circle cx="200" cy="20" r="4" fill="currentColor" stroke="none" />
        {/* Mini rune lines */}
        <line x1="200" y1="5" x2="200" y2="8" strokeWidth="2" />
        <line x1="200" y1="32" x2="200" y2="35" strokeWidth="2" />

        {/* Left Flourish Wing */}
        <path
          d="M 186 20 C 160 20, 140 14, 110 22 C 86 28, 62 14, 40 22 C 28 26, 22 20, 24 16 C 26 12, 32 14, 30 18"
          strokeWidth="1.8"
        />
        {/* Left foliate curls */}
        <path d="M 148 18 C 142 12, 130 10, 126 13" strokeWidth="1.4" />
        <circle cx="126" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <path d="M 94 25 C 88 30, 78 30, 74 27" strokeWidth="1.2" />

        {/* Right Flourish Wing (Symmetric Mirror) */}
        <path
          d="M 214 20 C 240 20, 260 14, 290 22 C 314 28, 338 14, 360 22 C 372 26, 378 20, 376 16 C 374 12, 368 14, 370 18"
          strokeWidth="1.8"
        />
        {/* Right foliate curls */}
        <path d="M 252 18 C 258 12, 270 10, 274 13" strokeWidth="1.4" />
        <circle cx="274" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <path d="M 306 25 C 312 30, 322 30, 326 27" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/**
 * Returns raw SVG string for injecting directly into print HTML iframe document
 */
export function getAstralClockSvgString(color: string = "#8b6f4e", opacity: number = 0.08): string {
  return `
    <svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; opacity: ${opacity}; color: ${color};">
      <g fill="${color}" stroke="${color}">
        <!-- Scalloped solar lobes (12) -->
        <g stroke-width="2.5" fill="none" opacity="0.85">
          ${Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 300 + 236 * Math.cos(rad);
            const cy = 300 + 236 * Math.sin(rad);
            return `<circle cx="${cx}" cy="${cy}" r="48" stroke-width="2.5" stroke-dasharray="3 3" />`;
          }).join("")}
        </g>
        <!-- Interstitial flourishes -->
        <g stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9">
          ${Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) - 75;
            const rad = (angle * Math.PI) / 180;
            const fx = 300 + 236 * Math.cos(rad);
            const fy = 300 + 236 * Math.sin(rad);
            const perpX = -Math.sin(rad);
            const perpY = Math.cos(rad);
            return `
              <circle cx="${fx}" cy="${fy}" r="2.5" fill="${color}" stroke="none" />
              <path d="M ${fx} ${fy} C ${fx + perpX * 10 - Math.cos(rad) * 6} ${fy + perpY * 10 - Math.sin(rad) * 6}, ${fx + perpX * 18 + Math.cos(rad) * 12} ${fy + perpY * 18 + Math.sin(rad) * 12}, ${fx + perpX * 22} ${fy + perpY * 22}" />
              <path d="M ${fx} ${fy} C ${fx - perpX * 10 - Math.cos(rad) * 6} ${fy - perpY * 10 - Math.sin(rad) * 6}, ${fx - perpX * 18 + Math.cos(rad) * 12} ${fy - perpY * 18 + Math.sin(rad) * 12}, ${fx - perpX * 22} ${fy - perpY * 22}" />
            `;
          }).join("")}
        </g>
        <!-- Concentric circles -->
        <circle cx="300" cy="300" r="236" fill="none" stroke-width="1.5" opacity="0.4" stroke-dasharray="4 4" />
        <circle cx="300" cy="300" r="190" fill="none" stroke-width="2.5" opacity="0.8" />
        <circle cx="300" cy="300" r="138" fill="none" stroke-width="1.5" opacity="0.5" stroke-dasharray="2 4" />
        
        <!-- 12 satellite nodes -->
        ${Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) - 75;
          const rad = (angle * Math.PI) / 180;
          const sx = 300 + 138 * Math.cos(rad);
          const sy = 300 + 138 * Math.sin(rad);
          return `
            <circle cx="${sx}" cy="${sy}" r="18" fill="none" stroke-width="2.5" />
            <circle cx="${sx}" cy="${sy}" r="12" fill="${color}" stroke="none" />
          `;
        }).join("")}

        <!-- 12 Dials with Runes -->
        ${ASTRAL_12_DIALS.map((cfg) => {
          const rad = (cfg.angle * Math.PI) / 180;
          const cx = 300 + 236 * Math.cos(rad);
          const cy = 300 + 236 * Math.sin(rad);
          let pathSvg = "";
          if (cfg.type === "rune-y-top") {
            pathSvg = `<path d="M ${cx} ${cy + 22} L ${cx} ${cy - 2} M ${cx} ${cy - 2} L ${cx - 18} ${cy - 22} M ${cx} ${cy - 2} L ${cx + 18} ${cy - 22}" />`;
          } else if (cfg.type === "rune-sickle-slash") {
            pathSvg = `<path d="M ${cx - 14} ${cy - 20} Q ${cx - 2} ${cy - 12} ${cx + 14} ${cy + 18}" /><path d="M ${cx - 16} ${cy + 2} Q ${cx} ${cy - 4} ${cx + 12} ${cy - 12}" />`;
          } else if (cfg.type === "rune-x" || cfg.type === "rune-x-bold") {
            pathSvg = `<path d="M ${cx - 18} ${cy - 18} L ${cx + 18} ${cy + 18} M ${cx + 18} ${cy - 18} L ${cx - 18} ${cy + 18}" />`;
          } else if (cfg.type === "rune-chevron") {
            pathSvg = `<path d="M ${cx + 12} ${cy - 18} L ${cx - 10} ${cy} L ${cx + 12} ${cy + 18}" /><line x1="${cx - 10}" y1="${cy}" x2="${cx - 18}" y2="${cy}" />`;
          } else if (cfg.type === "rune-y-inv-slash") {
            pathSvg = `<path d="M ${cx - 10} ${cy - 22} L ${cx + 14} ${cy + 20}" /><path d="M ${cx + 12} ${cy - 14} Q ${cx} ${cy - 2} ${cx - 14} ${cy + 8}" />`;
          } else if (cfg.type === "rune-y-inv") {
            pathSvg = `<path d="M ${cx} ${cy + 22} L ${cx} ${cy} M ${cx} ${cy} L ${cx - 16} ${cy - 20} M ${cx} ${cy} L ${cx + 16} ${cy - 20}" />`;
          } else if (cfg.type === "rune-y-inv-angled") {
            pathSvg = `<path d="M ${cx - 6} ${cy + 22} L ${cx + 2} ${cy}" /><path d="M ${cx + 2} ${cy} L ${cx - 16} ${cy - 20}" /><path d="M ${cx + 2} ${cy} L ${cx + 16} ${cy - 16}" />`;
          } else if (cfg.type === "rune-sickle-cross") {
            pathSvg = `<path d="M ${cx - 14} ${cy - 18} C ${cx + 4} ${cy - 12}, ${cx + 14} ${cy + 2}, ${cx - 8} ${cy + 20}" /><line x1="${cx - 16}" y1="${cy}" x2="${cx + 12}" y2="${cy}" />`;
          } else if (cfg.type === "rune-brackets") {
            pathSvg = `<path d="M ${cx - 16} ${cy - 18} Q ${cx - 22} ${cy} ${cx - 16} ${cy + 18}" /><path d="M ${cx - 4} ${cy - 16} Q ${cx + 2} ${cy} ${cx - 4} ${cy + 16}" /><path d="M ${cx + 16} ${cy - 12} L ${cx + 8} ${cy} L ${cx + 16} ${cy + 12}" />`;
          } else if (cfg.type === "rune-hook-left") {
            pathSvg = `<path d="M ${cx - 16} ${cy - 16} Q ${cx + 12} ${cy - 16} ${cx + 12} ${cy} Q ${cx + 12} ${cy + 20} ${cx - 10} ${cy + 20}" />`;
          } else if (cfg.type === "rune-y-branch") {
            pathSvg = `<path d="M ${cx - 18} ${cy + 18} L ${cx + 2} ${cy} L ${cx + 18} ${cy - 20} M ${cx + 2} ${cy} L ${cx - 12} ${cy - 16}" />`;
          }
          return `
            <circle cx="${cx}" cy="${cy}" r="45" fill="none" stroke-width="5.5" stroke-dasharray="2.5 3.5" />
            <circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke-width="3" />
            <circle cx="${cx}" cy="${cy}" r="38" fill="none" stroke-width="1.5" opacity="0.6" />
            <g stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
              ${pathSvg}
            </g>
          `;
        }).join("")}

        <!-- Center Hub -->
        <circle cx="300" cy="300" r="95" fill="none" stroke-width="8" />
        <circle cx="300" cy="300" r="88" fill="none" stroke-width="1.5" opacity="0.7" />
        <circle cx="300" cy="300" r="54" fill="none" stroke-width="24" />
        <circle cx="300" cy="300" r="38" fill="none" stroke-width="2.5" opacity="0.8" />
      </g>
    </svg>
  `;
}

