import React, { useState } from "react";
import {
  CALDO_PRIMORDIAL_SOL_SOLID_SRC,
  CALDO_PRIMORDIAL_SOL_FALLBACK_URL,
  CALDO_PRIMORDIAL_HIELO_SOLID_SRC,
  CALDO_PRIMORDIAL_HIELO_FALLBACK_URL,
  CALDO_PRIMORDIAL_NATURALEZA_SOLID_SRC,
  CALDO_PRIMORDIAL_NATURALEZA_FALLBACK_URL,
  CALDO_PRIMORDIAL_SOMBRA_SOLID_SRC,
  CALDO_PRIMORDIAL_SOMBRA_FALLBACK_URL,
  CALDO_PRIMORDIAL_REFLEJO_SOLID_SRC,
  CALDO_PRIMORDIAL_REFLEJO_FALLBACK_URL,
  CALDO_PRIMORDIAL_ELFO_SOLID_SRC,
  CALDO_PRIMORDIAL_ELFO_FALLBACK_URL,
} from "../assets/caldoPrimordialesSolidData";

interface PrimordialesSilhouettesBannerProps {
  className?: string;
  color?: string;
}

interface PrimordialFigure {
  id: string;
  name: string;
  title: string;
  element: string;
  auraColor: string;
  auraGlow: string;
  bgGlow: string;
  src: string;
  fallback: string;
}

const PRIMORDIALS: PrimordialFigure[] = [
  {
    id: "sol",
    name: "Primordial del Sol y la Luz",
    title: "Señor de la Luz y el Fuego Solar",
    element: "Luz / Sol",
    auraColor: "#f59e0b",
    auraGlow:
      "drop-shadow(0 0 10px rgba(245, 158, 11, 0.55)) drop-shadow(0 0 22px rgba(245, 158, 11, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55))",
    bgGlow:
      "radial-gradient(circle at 50% 60%, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.04) 50%, transparent 75%)",
    src: CALDO_PRIMORDIAL_SOL_SOLID_SRC,
    fallback: CALDO_PRIMORDIAL_SOL_FALLBACK_URL,
  },
  {
    id: "hielo",
    name: "Primordial del Hielo y la Escarcha",
    title: "Monarca Invernal de los Glaciares",
    element: "Hielo / Escarcha",
    auraColor: "#38bdf8",
    auraGlow:
      "drop-shadow(0 0 10px rgba(56, 189, 248, 0.55)) drop-shadow(0 0 22px rgba(56, 189, 248, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55))",
    bgGlow:
      "radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 75%)",
    src: CALDO_PRIMORDIAL_HIELO_SOLID_SRC,
    fallback: CALDO_PRIMORDIAL_HIELO_FALLBACK_URL,
  },
  {
    id: "naturaleza",
    name: "Primordial de la Naturaleza y el Bosque",
    title: "Anciano Arbóreo de la Floresta y la Vida",
    element: "Naturaleza / Bosque",
    auraColor: "#22c55e",
    auraGlow:
      "drop-shadow(0 0 10px rgba(34, 197, 94, 0.55)) drop-shadow(0 0 22px rgba(34, 197, 94, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55))",
    bgGlow:
      "radial-gradient(circle at 50% 60%, rgba(34, 197, 94, 0.16) 0%, rgba(34, 197, 94, 0.04) 50%, transparent 75%)",
    src: CALDO_PRIMORDIAL_NATURALEZA_SOLID_SRC,
    fallback: CALDO_PRIMORDIAL_NATURALEZA_FALLBACK_URL,
  },
  {
    id: "sombra",
    name: "Primordial de la Sombra y el Vacío",
    title: "Místico del Cuervo y la Magia Sombría",
    element: "Sombra / Vacío",
    auraColor: "#a855f7",
    auraGlow:
      "drop-shadow(0 0 10px rgba(168, 85, 247, 0.55)) drop-shadow(0 0 22px rgba(168, 85, 247, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55))",
    bgGlow:
      "radial-gradient(circle at 50% 60%, rgba(168, 85, 247, 0.16) 0%, rgba(168, 85, 247, 0.04) 50%, transparent 75%)",
    src: CALDO_PRIMORDIAL_SOMBRA_SOLID_SRC,
    fallback: CALDO_PRIMORDIAL_SOMBRA_FALLBACK_URL,
  },
];

/**
 * Banner de siluetas de los 4 Primordiales para la categoría Primordiales.
 * Muestra a los seres en el suelo a nivel de la línea inferior,
 * con su silueta sólida en #232e33 y su sutil aura elemental:
 * - Sol: Dorado / Ámbar (#f59e0b)
 * - Hielo: Azul Glacial (#38bdf8) + Reflejo astral detrás a su derecha
 * - Naturaleza: Verde Esmeralda (#22c55e)
 * - Sombra: Púrpura / Violeta Vacío (#a855f7)
 */
export function PrimordialesSilhouettesBanner({
  className = "w-full h-28 sm:h-36 md:h-44",
}: PrimordialesSilhouettesBannerProps) {
  const [sources, setSources] = useState<Record<string, string>>({
    sol: CALDO_PRIMORDIAL_SOL_SOLID_SRC,
    hielo: CALDO_PRIMORDIAL_HIELO_SOLID_SRC,
    naturaleza: CALDO_PRIMORDIAL_NATURALEZA_SOLID_SRC,
    sombra: CALDO_PRIMORDIAL_SOMBRA_SOLID_SRC,
    reflejo: CALDO_PRIMORDIAL_REFLEJO_SOLID_SRC,
    elfo: CALDO_PRIMORDIAL_ELFO_SOLID_SRC,
  });

  const handleError = (id: string, fallback: string) => {
    setSources((prev) => ({ ...prev, [id]: fallback }));
  };

  return (
    <div
      className={`relative w-full overflow-hidden select-none flex items-end justify-center p-0 m-0 ${className}`}
    >
      {/* Línea nítida de suelo a nivel inferior */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 via-border/80 to-transparent pointer-events-none z-30" />
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent blur-[1px] pointer-events-none z-20" />

      {/* Alineación centrada de los Primordiales al ras del suelo y sin márgenes laterales */}
      <div className="relative z-10 flex items-end justify-center gap-4 sm:gap-10 md:gap-16 lg:gap-20 p-0 m-0 h-full w-full pt-3 sm:pt-4">
        {PRIMORDIALS.map((p) => (
          <div
            key={p.id}
            className="relative group flex items-end justify-center h-full p-0 m-0"
            title={`${p.name} (${p.element})`}
          >
            {/* Resplandor ambiental suave detrás de cada figura */}
            <div
              className="absolute -inset-4 sm:-inset-6 pointer-events-none rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: p.bgGlow }}
            />

            {/* Silueta del Reflejo colocada DETRÁS a la DERECHA de la silueta azul (Hielo) */}
            {p.id === "hielo" && (
              <div
                className="absolute bottom-0 -right-5 sm:-right-8 md:-right-11 lg:-right-13 z-[5] h-full flex items-end justify-center pointer-events-none transition-transform duration-300 origin-bottom group-hover:translate-x-1 p-0 m-0"
                title="Reflejo del Hielo (Avatar Espectral de la Escarcha y los Espejos)"
              >
                {/* Resplandor astral etéreo del reflejo */}
                <div
                  className="absolute -inset-3 sm:-inset-5 pointer-events-none rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.25) 0%, rgba(125, 211, 252, 0.08) 50%, transparent 75%)",
                  }}
                />

                {/* Reflejo de luz a nivel de suelo para el Reflejo */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-12 sm:w-16 rounded-full blur-sm opacity-60 pointer-events-none z-0"
                  style={{
                    backgroundColor: "#38bdf8",
                    boxShadow: "0 0 10px 2px #38bdf8",
                  }}
                />

                <img
                  src={sources.reflejo || CALDO_PRIMORDIAL_REFLEJO_SOLID_SRC}
                  alt="Silueta del Reflejo del Hielo detrás a la derecha"
                  referrerPolicy="no-referrer"
                  className="relative z-[5] w-auto h-[90%] max-h-24 sm:max-h-32 md:max-h-36 self-end object-contain object-bottom select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-all duration-300 origin-bottom group-hover:scale-[1.02] block m-0 p-0"
                  style={{
                    objectPosition: "center bottom",
                    filter:
                      "drop-shadow(0 0 10px rgba(56, 189, 248, 0.55)) drop-shadow(0 0 20px rgba(125, 211, 252, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5))",
                  }}
                  onError={() =>
                    handleError("reflejo", CALDO_PRIMORDIAL_REFLEJO_FALLBACK_URL)
                  }
                />
              </div>
            )}

            {/* Silueta del Elfo Ancestral colocada DETRÁS a la DERECHA de la silueta verde (Naturaleza) */}
            {p.id === "naturaleza" && (
              <div
                className="absolute bottom-0 -right-6 sm:-right-9 md:-right-12 lg:-right-14 z-[5] h-full flex items-end justify-center pointer-events-none transition-transform duration-300 origin-bottom group-hover:translate-x-1 p-0 m-0"
                title="Monarca Elfo del Trono Arbóreo (Avatar de la Naturaleza)"
              >
                {/* Resplandor esmeralda etéreo del elfo */}
                <div
                  className="absolute -inset-3 sm:-inset-5 pointer-events-none rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 60%, rgba(34, 197, 94, 0.25) 0%, rgba(74, 222, 128, 0.08) 50%, transparent 75%)",
                  }}
                />

                {/* Reflejo de luz a nivel de suelo para el Elfo */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-12 sm:w-16 rounded-full blur-sm opacity-60 pointer-events-none z-0"
                  style={{
                    backgroundColor: "#22c55e",
                    boxShadow: "0 0 10px 2px #22c55e",
                  }}
                />

                <img
                  src={sources.elfo || CALDO_PRIMORDIAL_ELFO_SOLID_SRC}
                  alt="Silueta del Elfo Ancestral detrás a la derecha del Primordial Verde"
                  referrerPolicy="no-referrer"
                  className="relative z-[5] w-auto h-[88%] max-h-24 sm:max-h-32 md:max-h-36 self-end object-contain object-bottom select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-all duration-300 origin-bottom group-hover:scale-[1.02] block m-0 p-0"
                  style={{
                    objectPosition: "center bottom",
                    filter:
                      "drop-shadow(0 0 10px rgba(34, 197, 94, 0.55)) drop-shadow(0 0 20px rgba(74, 222, 128, 0.28)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5))",
                  }}
                  onError={() =>
                    handleError("elfo", CALDO_PRIMORDIAL_ELFO_FALLBACK_URL)
                  }
                />
              </div>
            )}

            {/* Reflejo sutil de suelo directamente en la base de la figura */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 sm:w-22 rounded-full blur-sm opacity-60 pointer-events-none z-0"
              style={{
                backgroundColor: p.auraColor,
                boxShadow: `0 0 10px 2px ${p.auraColor}`,
              }}
            />

            {/* Silueta principal de cada Primordial a nivel exacto de suelo */}
            <img
              src={sources[p.id]}
              alt={`Silueta de ${p.name}`}
              className="relative z-10 w-auto h-full max-h-[86%] sm:max-h-[88%] self-end object-contain object-bottom select-none pointer-events-none transition-transform duration-300 origin-bottom group-hover:scale-[1.03] block m-0 p-0"
              style={{
                objectPosition: "center bottom",
                filter: p.auraGlow,
              }}
              onError={() => handleError(p.id, p.fallback)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
