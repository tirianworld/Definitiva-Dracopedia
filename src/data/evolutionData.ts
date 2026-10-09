export interface EvolutionNode {
  id: string;
  name: string;
  latinName?: string;
  type: "fauna" | "flora" | "elemental" | "dragón" | "híbrido";
  domain: "Fauna" | "Flora" | "Elementales & Híbridos" | "Linaje Dracónico";
  ancestorId?: string | null;
  magicType: "Arcana" | "Elemental" | "Sombría" | "Dracónica" | "Divina" | "Astral" | "Sangre/Naturaleza" | "Vacío";
  magicColor: string;
  planeOrigin: "Kaliria" | "Aeros" | "Avalón" | "Plano Sombrío" | "Plano Elemental" | "Plano Astral" | "El Abismo" | "Moonhaven";
  habitat: string;
  threatLevel: 1 | 2 | 3 | 4 | 5; // Stars 1 to 5
  description: string;
  evolutionaryNotes: string;
  adaptations: string[];
  weakness: string;
  loot: string[];
  articleSlug?: string;
  imageUrl?: string;
  subspecies?: string[];
}

export interface MagicBranch {
  id: string;
  name: string;
  color: string;
  description: string;
  iconName: string;
  planes: string[];
}

export interface PlanarRealm {
  id: string;
  name: string;
  description: string;
  color: string;
  dominantMagic: string;
  floraFaunaRatio: string;
}

export const MAGIC_BRANCHES: MagicBranch[] = [
  {
    id: "draconica",
    name: "Magia Dracónica",
    color: "#f97316",
    description: "Fuego ancestral, sangre purificadora y rugidos capaces de quebrarlo la materia. Origen de las grandes bestias de Icespear y Kaliria.",
    iconName: "Flame",
    planes: ["Aeros", "Kaliria", "Plano Elemental"]
  },
  {
    id: "sombria",
    name: "Magia Sombría & Umbría",
    color: "#a855f7",
    description: "Esencia extraída de las sombras de las ruinas y la noche eterna. Corrompe a las criaturas expuestas y genera líquenes nocturnos.",
    iconName: "Moon",
    planes: ["Plano Sombrío", "El Abismo", "Kaliria"]
  },
  {
    id: "arcana",
    name: "Magia Arcana & Rúnica",
    color: "#3b82f6",
    description: "Flujos de mana puro cristalizado en las vetas de la tierra. Nutre arboles rúnicos y bestias mutadas por mana denso.",
    iconName: "Zap",
    planes: ["Aeros", "Moonhaven", "Plano Astral"]
  },
  {
    id: "elemental",
    name: "Magia Elemental Primigenia",
    color: "#06b6d4",
    description: "Las cuatro fuerzas cardinales (Fuego, Hielo, Viento, Tierra). Forja espíritus elementales y plantas de esporas heladas.",
    iconName: "Sparkles",
    planes: ["Plano Elemental", "Aeros", "Kaliria"]
  },
  {
    id: "divina",
    name: "Magia Divina & Solar",
    color: "#eab308",
    description: "Luz sagrada de las deidades ancestrales. Bendice flores lunares y protege a los guardianes celestiales.",
    iconName: "Sun",
    planes: ["Avalón", "Plano Astral", "Aeros"]
  },
  {
    id: "astral",
    name: "Magia Astral & Espiritual",
    color: "#ec4899",
    description: "Energías etéreas del vacilante tejido cosmos. Da origen a criaturas traslúcidas y micelios de esporas de ensueño.",
    iconName: "Sparkles",
    planes: ["Plano Astral", "Avalón"]
  },
  {
    id: "naturaleza",
    name: "Magia de la Naturaleza & Sangre",
    color: "#22c55e",
    description: "Fuerza vital silvestre y raices primigenias. Controla la fauna boscosa y las lianas depredadoras.",
    iconName: "Leaf",
    planes: ["Avalón", "Moonhaven", "Kaliria"]
  },
  {
    id: "vacio",
    name: "Magia del Vacío Abisal",
    color: "#64748b",
    description: "La nada misma que devora luz y materia. Engendra leviatanes oscuros y líquenes parásitos sin fotosíntesis.",
    iconName: "Skull",
    planes: ["El Abismo", "Plano Sombrío"]
  }
];

export const PLANAR_REALMS: PlanarRealm[] = [
  {
    id: "Aeros",
    name: "Continente de Aeros",
    description: "Tierras altas, el Pico de Icespear y valles azotados por ventiscas. Cuna de dragones blancos y huargos del hielo.",
    color: "#38bdf8",
    dominantMagic: "Magia Dracónica & Elemental de Hielo",
    floraFaunaRatio: "40% Flora / 60% Fauna"
  },
  {
    id: "Kaliria",
    name: "Reino de Kaliria",
    description: "Tierras históricas dominadas por La Compañía y misterios antiguos. Gran diversidad de especies místicas y arcanas.",
    color: "#c8a96e",
    dominantMagic: "Magia Arcana & Sombría",
    floraFaunaRatio: "50% Flora / 50% Fauna"
  },
  {
    id: "Avalón",
    name: "Tierra Sagrada de Avalón",
    description: "Isla mística envuelta en brumas féricas donde el tiempo fluye diferente. Hábitat de sátiros, ninfas y arboles estelares.",
    color: "#4ade80",
    dominantMagic: "Magia Divina & Naturaleza",
    floraFaunaRatio: "70% Flora / 30% Fauna"
  },
  {
    id: "Plano Sombrío",
    name: "Plano Sombrío (Shadowfell)",
    description: "Dimensión paralela de penumbra constante. Las criaturas pierden pigmento y desarrollan receptores arcanos oscuros.",
    color: "#c084fc",
    dominantMagic: "Magia Sombría",
    floraFaunaRatio: "25% Flora / 75% Fauna"
  },
  {
    id: "Plano Elemental",
    name: "Plano Elemental Primigenio",
    description: "Mundo sin superficie estable hecho de fuego puro, glaciares flotantes y tormentas de piedra viva.",
    color: "#f97316",
    dominantMagic: "Magia Elemental",
    floraFaunaRatio: "15% Flora / 85% Elementales"
  },
  {
    id: "Plano Astral",
    name: "Plano Astral Cósmico",
    description: "Mar etéreo salpicado de estrellas y restos de deidades caídas. Hogar de manta-rayas astronómicas y hongos luminiscentes.",
    color: "#f472b6",
    dominantMagic: "Magia Astral",
    floraFaunaRatio: "30% Flora / 70% Fauna"
  },
  {
    id: "El Abismo",
    name: "El Abismo",
    description: "Fosa insondable bajo las aguas de Kaliria y vacíos interdimensionales donde residen leviatanes y parásitos arcanos.",
    color: "#475569",
    dominantMagic: "Magia del Vacío",
    floraFaunaRatio: "10% Flora / 90% Fauna"
  },
  {
    id: "Moonhaven",
    name: "Valle de Moonhaven",
    description: "Refugio arbolado impregnado por la energía de las tres lunas de Caldo de Dragón.",
    color: "#a7f3d0",
    dominantMagic: "Magia Divina & Sangre/Naturaleza",
    floraFaunaRatio: "65% Flora / 35% Fauna"
  }
];

export const INITIAL_EVOLUTION_TREE: EvolutionNode[] = [
  // ROOT ANCESTORS (GENESIS PRIMIGENIA)
  {
    id: "proto-organismo-mana",
    name: "Proto-Organismo de Mana Primigenio",
    latinName: "Ur-Organismus Vitalis",
    type: "elemental",
    domain: "Elementales & Híbridos",
    ancestorId: null,
    magicType: "Arcana",
    magicColor: "#3b82f6",
    planeOrigin: "Plano Astral",
    habitat: "Océano Etéreo Primigenio",
    threatLevel: 1,
    description: "Primer vestigio de vida acuñada en el tejido mismo del mana cuando el universo de Caldo de Dragón fue creado.",
    evolutionaryNotes: "Se dividió en dos grandes ramas: la Vida Biológica de Carne (Fauna) y el Micelio/Raíz Rúnica (Flora).",
    adaptations: ["Inmunidad a la entropía", "Absorción directa de nexos de mana"],
    weakness: "Campos de supresión antimagia",
    loot: ["Esencia de Mana Puro", "Fragmento de Cristal Astral"]
  },

  // BRANCH FAUNA: PROTODRAGONES
  {
    id: "protodragon-primigenio",
    name: "Protodragón de Escama de Piedra",
    latinName: "Draco Antiquus Archaios",
    type: "dragón",
    domain: "Linaje Dracónico",
    ancestorId: "proto-organismo-mana",
    magicType: "Dracónica",
    magicColor: "#f97316",
    planeOrigin: "Aeros",
    habitat: "Cumbres Heladas de Icespear",
    threatLevel: 5,
    description: "Reptiles gigantescos de escamas imbricadas con mineral volcánico y gargantas de llama primordial.",
    evolutionaryNotes: "Evolucionaron según la magia ambiental de las tierras donde anidaron (fuego, hielo, sombras).",
    adaptations: ["Garganta de combustión elemental", "Escamas de blindaje telúrico"],
    weakness: "Ataques al núcleo bajo la garganta",
    loot: ["Escama Dracónica Ancestral", "Corazón Furia de Dragón"],
    articleSlug: "icespear-9a1e7c"
  },
  {
    id: "cryovain-dragon-blanco",
    name: "Cryovain (Dragón Blanco de Icespear)",
    latinName: "Draco Cryophilus Imperator",
    type: "dragón",
    domain: "Linaje Dracónico",
    ancestorId: "protodragon-primigenio",
    magicType: "Elemental",
    magicColor: "#06b6d4",
    planeOrigin: "Aeros",
    habitat: "Pico de Icespear",
    threatLevel: 5,
    description: "Temible dragón blanco que gobernó con mano de hierro sobre las cumbres de Aeros antes de ser derrotado por Caldo de Dragón.",
    evolutionaryNotes: "Adaptación extrema al frío extremo de Icespear; convirtió su aliento en helada absoluta capaz de congelar el alma.",
    adaptations: ["Aliento de Cero Absoluto", "Garras de escarcha de diamante", "Visión en ventisca"],
    weakness: "Magia de Fuego Primigenio y armas bendecidas",
    loot: ["Escamas de Cryovain", "Huesos Helados", "Diente de Dragón Blanco"],
    articleSlug: "icespear-9a1e7c"
  },
  {
    id: "mushusu-espada-bestia",
    name: "Mushusu (Bestia-Espada Consciente)",
    latinName: "Spatha Morphica Parasitica",
    type: "híbrido",
    domain: "Elementales & Híbridos",
    ancestorId: "protodragon-primigenio",
    magicType: "Sombría",
    magicColor: "#a855f7",
    planeOrigin: "Kaliria",
    habitat: "Refugio de Caldo de Dragón / Guarida de Cryovain",
    threatLevel: 4,
    description: "Misteriosa entidad reptiliana moldeada como espada consciente con voluntad propia y tono sarcástico.",
    evolutionaryNotes: "Mutación simbiótica entre el linaje dracónico y el metal arcanamente imbuido de los Antiguos.",
    adaptations: ["Simbiosis telepática con su portador", "Corte abisal disolvente"],
    weakness: "Aislamiento psíquico",
    loot: ["Fragmento de Acero Abisal", "Ecos de Conciencia Antigüa"],
    articleSlug: "mushusu"
  },

  // BRANCH FAUNA: MAMÍFEROS & BESTIAS
  {
    id: "proto-bestia-silvestre",
    name: "Proto-Bestia Cuadrúpeda",
    latinName: "Therium Primordialis",
    type: "fauna",
    domain: "Fauna",
    ancestorId: "proto-organismo-mana",
    magicType: "Sangre/Naturaleza",
    magicColor: "#22c55e",
    planeOrigin: "Kaliria",
    habitat: "Bosques Antiguos de Kaliria",
    threatLevel: 2,
    description: "Mamífero ancestral depredador con garras retráctiles y colmillos reforzados con hierro terrestre.",
    evolutionaryNotes: "Dio paso a los huargos helados de las cumbres y a los ciervos astrales de Avalón.",
    adaptations: ["Olfato magi-sensorial", "Musculatura densa adaptable"],
    weakness: "Trampas de foso rúnico",
    loot: ["Garra de Proto-Bestia", "Cuero Reforzado"]
  },
  {
    id: "huargo-de-las-nieves",
    name: "Huargo Helado de Icespear",
    latinName: "Canis Glacialis Aeros",
    type: "fauna",
    domain: "Fauna",
    ancestorId: "proto-bestia-silvestre",
    magicType: "Elemental",
    magicColor: "#06b6d4",
    planeOrigin: "Aeros",
    habitat: "Laderas y cavernas de Icespear",
    threatLevel: 3,
    description: "Superdepredador canino del norte que caza en manadas guiadas por aullidos helados que aturden a las presas.",
    evolutionaryNotes: "Desarrolló pelaje grueso reflectante de calor y colmillos de hielo cristalino.",
    adaptations: ["Aullido de Choque Sonoro", "Camuflaje de Nieve"],
    weakness: "Fuego y calor extremo",
    loot: ["Piel de Huargo Helado", "Colmillo de Hielo"]
  },
  {
    id: "ciervo-astral-lunar",
    name: "Ciervo Astral de Avalón",
    latinName: "Cervus Starlight Sylvanus",
    type: "fauna",
    domain: "Fauna",
    ancestorId: "proto-bestia-silvestre",
    magicType: "Astral",
    magicColor: "#ec4899",
    planeOrigin: "Avalón",
    habitat: "Claros de Luna en Avalón",
    threatLevel: 2,
    description: "Majestuoso cérvido cuyas cornamentas irradian luz estelar dorada. Puede desplazarse a través de planos al saltar.",
    evolutionaryNotes: "Surgió cuando las bestias terrestres quedaron atrapadas en las brumas mágicas de Avalón.",
    adaptations: ["Paso etéreo interdimensional", "Aura de curación silvestre"],
    weakness: "Trampas de Hierro Frío",
    loot: ["Asta de Luz Astral", "Polvo de Estrellas"]
  },

  // BRANCH FLORA: ARBOLES & HONGOS
  {
    id: "micelio-runico-madre",
    name: "Micelio Rúnico Ancestral",
    latinName: "Mycelium Arcana Mater",
    type: "flora",
    domain: "Flora",
    ancestorId: "proto-organismo-mana",
    magicType: "Arcana",
    magicColor: "#3b82f6",
    planeOrigin: "Kaliria",
    habitat: "Subsuelo Profundo de Kaliria y Moonhaven",
    threatLevel: 1,
    description: "Red subterránea gigante de esporas arcanas que interconecta la vida vegetal del mundo.",
    evolutionaryNotes: "Base evolutiva de los Hongos Abisales, los Árboles Lunares de Moonhaven y la Flora Rúnica.",
    adaptations: ["Telepatía vegetal subterránea", "Biorresonancia de mana"],
    weakness: "Fuego de Azufre",
    loot: ["Espora Rúnica Luminosa", "Raíz de Mana Conductora"]
  },
  {
    id: "arbol-lunar-moonhaven",
    name: "Árbol Lunar de Tres Copas",
    latinName: "Arbor Selenitis Moonhaven",
    type: "flora",
    domain: "Flora",
    ancestorId: "micelio-runico-madre",
    magicType: "Divina",
    magicColor: "#eab308",
    planeOrigin: "Moonhaven",
    habitat: "Valle Sagrado de Moonhaven",
    threatLevel: 2,
    description: "Árbol gigantesco cuyas hojas plateadas brillan con intensidad dependiendo de las fases de las tres lunas.",
    evolutionaryNotes: "Evolución por acumulación de luz sagrada selenita. Produce savia sanadora única.",
    adaptations: ["Luminiscencia sanadora", "Ramas de madera incombustible"],
    weakness: "Hacha mellada con sangre corrupta",
    loot: ["Savia Lunar Curativa", "Madera Selenita"]
  },
  {
    id: "hongo-espora-sombría",
    name: "Hongo Parásito Sombrío",
    latinName: "Fungus Umbra Parasiticus",
    type: "flora",
    domain: "Flora",
    ancestorId: "micelio-runico-madre",
    magicType: "Sombría",
    magicColor: "#a855f7",
    planeOrigin: "Plano Sombrío",
    habitat: "Bosques Negros de Shadowfell",
    threatLevel: 3,
    description: "Hongo carnoso violeta que lanza esporas alucinatorias y consume la vitalidad de animales desorientados.",
    evolutionaryNotes: "Mutación por exposición continuada a las brumas corruptoras del Plano Sombrío.",
    adaptations: ["Nube de esporas venenosas", "Luminiscencia de engaño"],
    weakness: "Luz Solar Directa o Magia Divina",
    loot: ["Polvo de Esporas Umbrías", "Sombrerete Corrupto"]
  },

  // BRANCH ELEMENTALES & ENTIDADES
  {
    id: "espiritu-elemental-primordial",
    name: "Núcleo Elemental Inestable",
    latinName: "Core Elementalis Chaos",
    type: "elemental",
    domain: "Elementales & Híbridos",
    ancestorId: "proto-organismo-mana",
    magicType: "Elemental",
    magicColor: "#06b6d4",
    planeOrigin: "Plano Elemental",
    habitat: "Vórtices Elementales",
    threatLevel: 4,
    description: "Masa de plasma magmático, hielo y rayo atrapada en un bucle gravitatorio sin forma fija.",
    evolutionaryNotes: "Se cristalizó en Golems de Piedra, Krakens de Agua o Serpientes de Fuego según la materia del entorno.",
    adaptations: ["Cambio de fase elemental", "Regeneración por absorción de daño"],
    weakness: "Elemento opuesto de contra balance",
    loot: ["Núcleo de Cristal Elemental", "Gema Fusión"]
  },
  {
    id: "kraken-del-abismo",
    name: "Kraken Abisal de Kaliria",
    latinName: "Leviathan Abyssus Tentaculatus",
    type: "híbrido",
    domain: "Elementales & Híbridos",
    ancestorId: "espiritu-elemental-primordial",
    magicType: "Vacío",
    magicColor: "#64748b",
    planeOrigin: "El Abismo",
    habitat: "Fosa Marina de Kaliria y Trincheras del Vacío",
    threatLevel: 5,
    description: "Bestia marina de tamaño insondable cuyos tentáculos generan remolinos arcanos que tragan barcos enteros.",
    evolutionaryNotes: "Adaptación del núcleo acuático al vacío insondable del Abismo; sustituyó sangre por bilis negra estelar.",
    adaptations: ["Presión bioluminiscente de vacío", "Tentáculos de absorción de vida"],
    weakness: "Rayo Arcano Concentrado al Ojo Central",
    loot: ["Tinta de Vacío Abisal", "Tentáculo Gigante", "Ojo de Kraken"]
  }
];
