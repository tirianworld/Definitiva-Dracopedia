import React, { useState, useEffect } from "react";

export interface CarriageLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "fullscreen";
  text?: string;
  subtext?: string;
  className?: string;
  showRoad?: boolean;
}

// 24 fluid, continuous tweened frames centered in the dead middle of a 480x250 canvas
const CARRIAGE_FRAMES = Array.from({ length: 24 }, (_, i) => 
  `/images/carriage_fluid/frame_${String(i).padStart(2, "0")}.png`
);

export function CarriageLoader({
  size = "md",
  text,
  subtext,
  className = "",
  showRoad = true,
}: CarriageLoaderProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Preload all 24 frames once so playback is silky smooth from frame 0
  useEffect(() => {
    CARRIAGE_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Fluid 24-frame clock: 75ms per frame = 1.8s total cycle duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % CARRIAGE_FRAMES.length);
    }, 75);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    xs: "w-36 max-w-[90vw]",
    sm: "w-52 max-w-[90vw]",
    md: "w-72 max-w-[90vw]",
    lg: "w-96 max-w-[90vw]",
    xl: "w-[480px] max-w-[90vw]",
    fullscreen: "w-80 md:w-[460px] max-w-[90vw]",
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center text-center mx-auto my-auto select-none ${className}`}>
      {/* Hidden preloader */}
      <div className="hidden" aria-hidden="true">
        {CARRIAGE_FRAMES.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
      </div>

      {/* Frame-accurate Sprite: 24 fluid frames, strictly one active frame, 100% position lock in the dead center */}
      <div className={`relative ${sizeClasses} mx-auto flex flex-col items-center justify-center`}>
        <div className="w-full aspect-[480/250] relative flex items-center justify-center overflow-hidden mx-auto">
          <img
            key={currentFrame}
            src={CARRIAGE_FRAMES[currentFrame]}
            alt="Cargando..."
            className="w-full h-full object-contain mx-auto block drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Ambient Moving Road Track Centered with Wheels */}
        {showRoad && (
          <div className="w-full mt-[-6px] relative flex items-center justify-center overflow-hidden px-4 mx-auto">
            <div className="w-full max-w-[440px] h-[2px] bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent relative mx-auto">
              <div 
                className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_16px,rgba(203,247,245,0.45)_16px,rgba(203,247,245,0.45)_32px)] animate-[roadflow_0.55s_linear_infinite]" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Text & Ambient Subtitle centered */}
      {(text || subtext) && (
        <div className="mt-3 text-center space-y-1 animate-pulse mx-auto">
          {text && (
            <p className="font-heading font-extrabold text-xs md:text-sm tracking-widest uppercase text-foreground/90">
              {text}
            </p>
          )}
          {subtext && (
            <p className="font-serif italic text-[11px] text-muted-foreground/80">
              {subtext}
            </p>
          )}
        </div>
      )}

      {/* Road animation CSS */}
      <style>{`
        @keyframes roadflow {
          0% { transform: translateX(0); }
          100% { transform: translateX(32px); }
        }
      `}</style>
    </div>
  );

  if (size === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md transition-all">
        {content}
      </div>
    );
  }

  return content;
}
