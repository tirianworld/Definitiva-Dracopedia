import React, { useState } from "react";

interface PortadoresBannerProps {
  className?: string;
  color?: string;
}

export function PortadoresBanner({
  className = "w-full h-full",
}: PortadoresBannerProps) {
  const [imgSrc, setImgSrc] = useState("/images/banners/banner_portadores_de_marca.jpg");

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none flex items-center justify-center p-0 m-0 ${className}`}
    >
      <img
        src={imgSrc}
        alt="Banner de Portadores de Marca - Reloj Astral"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-500 origin-center group-hover:scale-[1.02] block m-0 p-0"
        onError={() => setImgSrc("/images/banners/banner_portadores_de_marca.jpg")}
      />
      {/* Sutil overlay degradado para contraste y legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/20 pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none z-30" />
    </div>
  );
}
