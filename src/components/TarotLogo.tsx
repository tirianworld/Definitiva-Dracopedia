import React from "react";

interface TarotLogoProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

export function TarotLogo({ className = "w-4 h-4", size, style }: TarotLogoProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    ...(size ? { width: size, height: size } : {}),
  };

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} fill-none shrink-0 inline-block`}
      xmlns="http://www.w3.org/2000/svg"
      style={customStyle}
    >
      {/* Outer thick glowing border */}
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" className="opacity-90" />
      {/* Inner thin dashed mystic border */}
      <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="1" className="opacity-50" strokeDasharray="3 2" />
      
      {/* Crossed Quill and Wand */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Wand / Staff */}
        <line x1="70" y1="30" x2="30" y2="70" strokeWidth="2.25" className="opacity-95" />
        {/* Wand tip sparkle */}
        <circle cx="70" cy="30" r="2" fill="currentColor" />

        {/* Feather Quill */}
        {/* Quill Shaft */}
        <line x1="30" y1="30" x2="70" y2="70" strokeWidth="1.75" className="opacity-85" />
        {/* Quill Vanes (feather blades) */}
        <path 
          d="M30,30 C37,28 48,34 56,44 C60,49 65,55 70,70 C55,65 49,60 44,56 C34,48 28,37 30,30 Z" 
          fill="currentColor" 
          fillOpacity="0.2" 
          strokeWidth="0.85" 
        />
        {/* Fine feather strands */}
        <path d="M37,34 L34,36 M42,39 L38,42 M47,45 L43,48" strokeWidth="0.85" />
      </g>

      {/* Two Mystic Eyes (Left and Right) */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Left Eye */}
        <path d="M24,51 C28,46 34,46 38,51 C34,56 28,56 24,51 Z" />
        <circle cx="31" cy="51" r="2.5" fill="currentColor" />
        
        {/* Right Eye */}
        <path d="M62,51 C66,46 72,46 76,51 C72,56 66,56 62,51 Z" />
        <circle cx="69" cy="51" r="2.5" fill="currentColor" />
      </g>

      {/* Open Arcane Tome at the bottom */}
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Left page */}
        <path d="M50,77 C42,73 33,73 25,77 L25,66 C33,62 42,62 50,66 Z" fill="currentColor" fillOpacity="0.15" />
        {/* Right page */}
        <path d="M50,77 C58,73 67,73 75,77 L75,66 C67,62 58,62 50,66 Z" fill="currentColor" fillOpacity="0.15" />
        {/* Book spine line */}
        <line x1="50" y1="66" x2="50" y2="78" strokeWidth="2" />
      </g>
    </svg>
  );
}

export { TarotLogo as TarotAISeal };
export default TarotLogo;
