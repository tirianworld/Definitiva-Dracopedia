import React, { useState } from "react";

interface AscendidosSilhouettesBannerProps {
  className?: string;
  color?: string;
}

export function AscendidosSilhouettesBanner({
  className = "w-full h-full",
  color = "#232e33",
}: AscendidosSilhouettesBannerProps) {
  const [imgSrc, setImgSrc] = useState("/images/caldo_ascendidos_silhouettes_solid.png?v=5");

  return (
    <div
      className={`relative w-full overflow-hidden select-none flex items-end justify-center p-0 m-0 ${className}`}
    >
      {/* Suelo sólido de extremo a extremo hasta los bordes laterales del banner */}
      <div
        className="absolute bottom-0 inset-x-0 w-full h-[4px] sm:h-[5px] md:h-[6.5px] pointer-events-none z-20"
        style={{ backgroundColor: color }}
      />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent pointer-events-none z-30" />

      {/* Solid Character Silhouettes (Arlem Díaz, Gildemar, Zaltar, Arthorius, Gorm, Zaratras, Nemuina, Thrag, Magordito y Minos) */}
      <div className="relative z-10 flex items-end justify-center w-full h-full p-0 m-0 pt-3 sm:pt-4">
        <img
          src={imgSrc}
          alt="Siluetas sólidas de Héroes Ascendidos de Caldo de Dragón: Arlem Díaz, Gildemar, Zaltar, Arthorius, Gorm, Zaratras, Nemuina, Thrag, Magordito y Minos"
          referrerPolicy="no-referrer"
          className="max-h-[86%] sm:max-h-[88%] max-w-full w-auto h-auto self-end object-contain object-bottom select-none pointer-events-none transition-transform duration-300 origin-bottom group-hover:scale-[1.01] block m-0 p-0"
          style={{ objectPosition: "center bottom" }}
          onError={() => setImgSrc("/images/caldo_ascendidos_banner.jpg")}
        />
      </div>
    </div>
  );
}
