import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Radio, Play, Pause, Volume2, VolumeX, Music, ChevronDown, 
  Disc, Volume1, Sparkles, SkipBack, SkipForward, Repeat, Shuffle,
  Anchor, Shield, Flame, Swords, Compass, Ghost, Crosshair
} from "lucide-react";

export interface FranchiseInfo {
  id: string;
  name: string;
  shortName: string;
  composer: string;
  color: string;
  icon: React.ElementType;
  badge: string;
}

export interface Track {
  id: string;
  franchiseId: string;
  franchise: string;
  title: string;
  composer: string;
  url: string;
  style: string;
  color: string;
  description: string;
}

export const FRANCHISES: FranchiseInfo[] = [
  {
    id: "potc",
    name: "Piratas del Caribe",
    shortName: "Piratas",
    composer: "Hans Zimmer & Klaus Badelt",
    color: "#0284c7",
    icon: Anchor,
    badge: "Alta Mar"
  },
  {
    id: "lotr",
    name: "El Señor de los Anillos",
    shortName: "ESDLA",
    composer: "Howard Shore",
    color: "#eab308",
    icon: Shield,
    badge: "Tolkien"
  },
  {
    id: "dark_souls",
    name: "Dark Souls",
    shortName: "Dark Souls",
    composer: "Motoi Sakuraba",
    color: "#f97316",
    icon: Flame,
    badge: "Ceniza"
  },
  {
    id: "witcher",
    name: "The Witcher",
    shortName: "The Witcher",
    composer: "M. Przybyłowicz & Percival",
    color: "#a855f7",
    icon: Swords,
    badge: "Lobo Blanco"
  },
  {
    id: "skyrim",
    name: "Skyrim",
    shortName: "Skyrim",
    composer: "Jeremy Soule",
    color: "#06b6d4",
    icon: Compass,
    badge: "Dovahkiin"
  },
  {
    id: "hollow_knight",
    name: "Hollow Knight",
    shortName: "Hollow Knight",
    composer: "Christopher Larkin",
    color: "#38bdf8",
    icon: Ghost,
    badge: "Hallownest"
  },
  {
    id: "assassins_creed",
    name: "Assassin's Creed",
    shortName: "Assassin's",
    composer: "Jesper Kyd",
    color: "#ef4444",
    icon: Crosshair,
    badge: "Hermandad"
  }
];

export const STATION_TRACKS: Track[] = [
  // ==========================================
  // --- PIRATAS DEL CARIBE (10 Oficiales) ---
  // ==========================================
  {
    id: "potc_hes_a_pirate",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "He's a Pirate",
    composer: "Klaus Badelt & Hans Zimmer",
    url: "https://archive.org/download/bestsoundtrack01/03.%20Hans%20Zimmer%20-%20He%20is%20a%20pirate%20%28from%20Pirates%20of%20the%20Caribbean%29.mp3",
    style: "Cuerdas heroicas, timbales marineros y metales de abordaje",
    color: "#0284c7",
    description: "El tema legendario del Capitán Jack Sparrow y la Perla Negra surcando aguas traicioneras."
  },
  {
    id: "potc_davy_jones",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Davy Jones (Theme)",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.dead.mans.chest/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20Dead%20Man%27s%20Chest/03%20-%20Davy%20Jones%20%28Score%29.mp3",
    style: "Caja de música trágica y colosal órgano de tubos",
    color: "#0284c7",
    description: "La melancolía inmortal y el poder sobrenatural del Capitán del Holandés Errante."
  },
  {
    id: "potc_up_is_down",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Up Is Down",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.at.worlds.end_201910/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End/05%20-%20Up%20Is%20Down%20%28From%20_Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End__Score%29.mp3",
    style: "Jiga celta acelerada, violines festivos y compás marinero",
    color: "#0284c7",
    description: "La audaz maniobra volteando el navío entre la puesta de sol y el amanecer en el Fin del Mundo."
  },
  {
    id: "potc_the_kraken",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "The Kraken",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.dead.mans.chest/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20Dead%20Man%27s%20Chest/02%20-%20The%20Kraken%20%28Score%29.mp3",
    style: "Órgano monumental, bajos atronadores y tensión abisal",
    color: "#0284c7",
    description: "La bestia del abismo triturando los cascos de madera bajo el mandato del cofre de la muerte."
  },
  {
    id: "potc_jack_sparrow",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Jack Sparrow",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.dead.mans.chest/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20Dead%20Man%27s%20Chest/01%20-%20Jack%20Sparrow%20%28Score%29.mp3",
    style: "Cello travieso, metales ebrios y fanfarria bucanera",
    color: "#0284c7",
    description: "La extravagancia y genialidad impredecible del capitán pirata más escurridizo de los siete mares."
  },
  {
    id: "potc_two_hornpipes",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Two Hornpipes (Tortuga)",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.dead.mans.chest/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20Dead%20Man%27s%20Chest/07%20-%20Two%20Hornpipes%20%28Tortuga%29%20%28Score%29.mp3",
    style: "Acordeón y violín de taberna pirata en Tortuga",
    color: "#0284c7",
    description: "Danza festiva con jarras de ron, cantos de taberna y peleas entre marineros bribones."
  },
  {
    id: "potc_wheel_of_fortune",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Wheel of Fortune",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.dead.mans.chest/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20Dead%20Man%27s%20Chest/09%20-%20Wheel%20of%20Fortune%20%28Score%29.mp3",
    style: "Duelo a tres espadas y crescendo orquestal en la rueda del molino",
    color: "#0284c7",
    description: "La mítica batalla frenética en la isla Cruces disputándose la llave del cofre de Davy Jones."
  },
  {
    id: "potc_hoist_the_colours",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Hoist the Colours",
    composer: "Hans Zimmer & Gore Verbinski",
    url: "https://archive.org/download/pirates.of.the.caribbean.at.worlds.end_201910/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End/01%20-%20Hoist%20the%20Colours%20%28From%20_Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End__Soundtrack%20Version%29.mp3",
    style: "Canto fúnebre pirata a capella y campanas de horca",
    color: "#0284c7",
    description: "El solemne canto que convoca a la Corte de la Hermandad a alzar las velas contra la tiranía."
  },
  {
    id: "potc_parlay",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Parlay",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.at.worlds.end_201910/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End/08%20-%20Parlay%20%28From%20_Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End__Score%29.mp3",
    style: "Guitarra española de duelo, viento marino y tensión solemne",
    color: "#0284c7",
    description: "La tregua de honor y negociación en el banco de arena antes de la confrontación en el remolino."
  },
  {
    id: "potc_drink_up_me_hearties",
    franchiseId: "potc",
    franchise: "Piratas del Caribe",
    title: "Drink Up Me Hearties Yo Ho",
    composer: "Hans Zimmer",
    url: "https://archive.org/download/pirates.of.the.caribbean.at.worlds.end_201910/Various%20Artists%20-%20Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End/13%20-%20Drink%20Up%20Me%20Hearties%20Yo%20Ho%20%28From%20_Pirates%20of%20the%20Caribbean_%20At%20World%27s%20End__Score%29.mp3",
    style: "Suite orquestal apoteósica, viento en popa y brújula al horizonte",
    color: "#0284c7",
    description: "La conclusión triunfal de la trilogía navegando hacia la Fuente de la Juventud eterna."
  },

  // ===============================================
  // --- EL SEÑOR DE LOS ANILLOS (10 Oficiales) ---
  // ===============================================
  {
    id: "lotr_concerning_hobbits",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "Concerning Hobbits",
    composer: "Howard Shore",
    url: "https://archive.org/download/concerning-hobbits/Howard_Shore_London_Philharmonic_Orchestra_The_London_Voices_The_Lo_-_Concerning_Hobbits_68331931.mp3",
    style: "Flauta Celta, Violín, Arpa y Orquesta Cálida",
    color: "#eab308",
    description: "Melodías nostálgicas, pacíficas y de gran fantasía de los campos de la Comarca."
  },
  {
    id: "lotr_riders_of_rohan",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "The Riders of Rohan",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/3.%20The%20Riders%20of%20Rohan.mp3",
    style: "Violín Hardanger nórdico, cuerdas de galope y trompas",
    color: "#eab308",
    description: "El viento libre sobre las praderas doradas y la nobleza indómita de los señores de los caballos."
  },
  {
    id: "lotr_evenstar",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "Evenstar",
    composer: "Howard Shore & Isabel Bayrakdarian",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/8.%20Evenstar.mp3",
    style: "Voz élfica solista, arpa mística y cuerdas crepusculares",
    color: "#eab308",
    description: "Elegía del amor inmortal de Arwen Undómiel en las cascadas sagradas de Rivendel."
  },
  {
    id: "lotr_ride_of_rohirrim",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "The Ride of the Rohirrim",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheReturnoftheKing_CompleteOriginalMotionPictureSoundtrack/7.%20The%20Ride%20of%20the%20Rohirrim.mp3",
    style: "Cuernos de guerra, trompetas triunfales y marcha épica",
    color: "#eab308",
    description: "La legendaria carga al amanecer en los Campos del Pelennor disipando la oscuridad de Mordor."
  },
  {
    id: "lotr_uruk_hai",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "The Uruk-hai",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/5.%20The%20Uruk-hai.mp3",
    style: "Compás industrial 5/4, percusión de hierro y furia de Isengard",
    color: "#eab308",
    description: "Las forjas oscuras de Saruman marchando implacables a través de las colinas de Rohan."
  },
  {
    id: "lotr_king_golden_hall",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "The King of the Golden Hall",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/6.%20The%20King%20of%20the%20Golden%20Hall.mp3",
    style: "Lamento en lengua anglosajona, cuerdas de Meduseld y renacer",
    color: "#eab308",
    description: "La liberación del Rey Théoden del hechizo oscuro y la vigilia ante la tumba de Théodred."
  },
  {
    id: "lotr_white_rider",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "The White Rider",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/9.%20The%20White%20Rider.mp3",
    style: "Campanas luminosas, coro celestial y galope de Sombragris",
    color: "#eab308",
    description: "Gandalf el Blanco regresando de la muerte para liderar a los pueblos libres de la Tierra Media."
  },
  {
    id: "lotr_forth_eorlingas",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "Forth Eorlingas",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheTwoTowers_CompleteOriginalMotionPictureSoundtrack/16.%20Forth%20Eorlingas.mp3",
    style: "El Cuerno de Helm Mano de Hierro y la salida al abismo",
    color: "#eab308",
    description: "La desesperada salida a caballo de Théoden y Aragorn al amanecer del quinto día en el Abismo de Helm."
  },
  {
    id: "lotr_minas_tirith",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "Minas Tirith",
    composer: "Howard Shore & Ben Del Maestro",
    url: "https://archive.org/download/TheLordoftheRings_TheReturnoftheKing_CompleteOriginalMotionPictureSoundtrack/3.%20Minas%20Tirith%20%28feat.%20Ben%20Del%20Maestro%29%20.mp3",
    style: "Voz infantil angelical, metales de Gondor y la Ciudad Blanca",
    color: "#eab308",
    description: "La majestuosa visión de los siete niveles de la ciudad de piedra recortada contra las Montañas Blancas."
  },
  {
    id: "lotr_anduril",
    franchiseId: "lotr",
    franchise: "El Señor de los Anillos",
    title: "Andúril (Flame of the West)",
    composer: "Howard Shore",
    url: "https://archive.org/download/TheLordoftheRings_TheReturnoftheKing_CompleteOriginalMotionPictureSoundtrack/10.%20Anduril.mp3",
    style: "Cuerdas solemnes y el himno de los Reyes de los Hombres",
    color: "#eab308",
    description: "La espada rota reforjada por los herreros elfos entregada al legítimo heredero de Isildur."
  },

  // ===================================
  // --- DARK SOULS (10 Oficiales) ---
  // ===================================
  {
    id: "ds_prologue",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Prologue / Dark Souls Theme",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/01%20Prologue.mp3",
    style: "Coros Góticos, Órgano de Tubos y Cello Oscuro",
    color: "#f97316",
    description: "La leyenda primordial de la Primera Llama, los Señores de Lordran y los Dragones Eternos."
  },
  {
    id: "ds_firelink",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Firelink Shrine",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/02%20Firelink%20Shrine.mp3",
    style: "Guitarra acústica tenue, sosiego y silencio ante la hoguera",
    color: "#f97316",
    description: "El único refugio sereno donde los no muertos descansan al cobijo de las ascuas."
  },
  {
    id: "ds_bell_gargoyle",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Bell Gargoyle",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/04%20Bell%20Gargoyle.mp3",
    style: "Metales agudos y coros de batalla en el tejado de la parroquia",
    color: "#f97316",
    description: "El enfrentamiento en las alturas de la Parroquia de los No Muertos para tañer la Primera Campana."
  },
  {
    id: "ds_quelaag",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Chaos Witch Quelaag",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/07%20Chaos%20Witch%20Quelaag.mp3",
    style: "Cuerdas tensas y llamas del dominio del caos en Blighttown",
    color: "#f97316",
    description: "La trágica hija de la Bruja de Izalith defendiendo a su hermana ciega entre lava y telarañas."
  },
  {
    id: "ds_ornstein_smough",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Ornstein & Smough",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/10%20Ornstein%20%26%20Smough.mp3",
    style: "Coro colosal y percusión épica en la catedral del sol",
    color: "#f97316",
    description: "La prueba definitiva de los no muertos elegidos en el corazón de Anor Londo."
  },
  {
    id: "ds_gwynevere",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Gwynevere, Princess of Sunlight",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/11%20Gwynevere%2C%20Princess%20of%20Sunlight.mp3",
    style: "Armonías vocales celestiales y calor dorado divino",
    color: "#f97316",
    description: "La reconfortante presencia de la Reina Solar entregando la Vasija del Señor a los héroes."
  },
  {
    id: "ds_sif",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Great Grey Wolf Sif",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/12%20Great%20Grey%20Wolf%20Sif.mp3",
    style: "Cuerdas fúnebres de lealtad eterna y espada en la boca",
    color: "#f97316",
    description: "La conmovedora defensa de la tumba de Artorias el Caminante del Abismo por su fiel compañero canino."
  },
  {
    id: "ds_four_kings",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Four Kings",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/15%20Four%20Kings.mp3",
    style: "Ecos desorientadores y oscuridad infinita en el fondo del Abismo",
    color: "#f97316",
    description: "El descenso a las ruinas sumergidas de Nuevo Londo ante los monarcas corrompidos por la Sombra."
  },
  {
    id: "ds_gwyn",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Gwyn, Lord of Cinder",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/22%20Gwyn%2C%20Lord%20of%20Cinder.mp3",
    style: "Piano solo melancólico e íntimo a tres manos sin teclas negras",
    color: "#f97316",
    description: "El duelo fúnebre y desolador contra el monarca marchito en el Horno de la Primera Llama."
  },
  {
    id: "ds_nameless",
    franchiseId: "dark_souls",
    franchise: "Dark Souls",
    title: "Nameless Song",
    composer: "Motoi Sakuraba",
    url: "https://archive.org/download/motoi-sakuraba-yuji-takenouchi-dark-souls-original-game-soundtrack/23%20Nameless%20Song.mp3",
    style: "Voz femenina etérea, arpa luminosa y paz final",
    color: "#f97316",
    description: "La canción de cuna que sella el final del ciclo de la llama y bendice el descanso eterno."
  },

  // ===================================
  // --- THE WITCHER 3 (10 Oficiales) ---
  // ===================================
  {
    id: "witcher_ard_skellig",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "The Fields of Ard Skellig",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-wild-hunt-ost-the-fields-of-ard-skellig-extended/the-witcher-3-wild-hunt-ost-the-fields-of-ard-skellig-extended.mp3",
    style: "Voz mística gaélica, gaita irlandesa y brisa marina",
    color: "#a855f7",
    description: "Cantos tradicionales y bruma gélida sobre los fiordos y acantilados de las Islas Skellige."
  },
  {
    id: "witcher_silver_for_monsters",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Silver for Monsters",
    composer: "Marcin Przybyłowicz & Percival",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Silver%20for%20Monsters.mp3",
    style: "Coro eslavo tribal 'Banana Tiger', cítara y tambores",
    color: "#a855f7",
    description: "Acero para los hombres, plata para los monstruos. La furia del combate brujo en los pantanos."
  },
  {
    id: "witcher_wolven_storm",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "The Wolven Storm (Priscilla)",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Bard%20Song%20-%20Tavern%20Song%20-%20The%20Wolven%20Storm%20%28Full%20Lyrics%29.mp3",
    style: "Laúd de bardo, voz cálida de taberna y poesía íntima",
    color: "#a855f7",
    description: "La balada lírica sobre las heridas, la violeta y grosella entre Geralt y Yennefer."
  },
  {
    id: "witcher_lullaby_of_woe",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Lullaby of Woe",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Lullaby%20of%20Woe%20%28special%20single%29.mp3",
    style: "Voz oscura susurrada, cuerdas inquietantes y cuento gótico",
    color: "#a855f7",
    description: "La advertencia sobre los colmillos y sombras que acechan cuando el sol se oculta."
  },
  {
    id: "witcher_back_on_the_path",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Back on the Path (Gwent Tavern)",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Back%20on%20the%20Path%20%28Gwent%20%20%20Tavern%29.mp3",
    style: "Laúd rítmico, flauta vivaz y apuestas de cartas Gwent",
    color: "#a855f7",
    description: "El inconfundible ritmo de taberna donde los viajeros apuestan sus mejores barajas de Gwent."
  },
  {
    id: "witcher_tavern_music",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Tavern Music",
    composer: "Marcin Przybyłowicz & Percival",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Tavern%20Music%20%28Extended%29.mp3",
    style: "Cuerdas folclóricas rústicas, jarros de hidromiel y bullicio",
    color: "#a855f7",
    description: "El calor y refugio de las posadas de Velen y Novigrado al caer la noche tras una cacería."
  },
  {
    id: "witcher_bloody_baron",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "The Bloody Baron",
    composer: "Mikolai Stroinski",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/The%20Bloody%20Baron%27s%20Family.mp3",
    style: "Cello melancólico, dolor familiar y redención trágica",
    color: "#a855f7",
    description: "El sobrecogedor arco narrativo de Phillip Strenger y sus culpas imborrables en Velen."
  },
  {
    id: "witcher_crows_perch",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Crow's Perch Theme",
    composer: "Mikolai Stroinski",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unofficial%20Tracks/Crow%27s%20Perch%20Theme.mp3",
    style: "Gaita eslava, percusión terrenal y murallas de madera",
    color: "#a855f7",
    description: "El fuerte fortificado de Percha del Cuervo alzándose sobre la tierra de nadie en Tierra de Nadie."
  },
  {
    id: "witcher_oxenfurt",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Oxenfurt",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unreleased%20Tracks/Oxenfurt.mp3",
    style: "Cuerdas barrocas ilustradas y brisa universitaria",
    color: "#a855f7",
    description: "La academia de eruditos, boticarios y artistas a orillas del majestuoso río Pontar."
  },
  {
    id: "witcher_versus_eredin",
    franchiseId: "witcher",
    franchise: "The Witcher",
    title: "Versus Eredin",
    composer: "Marcin Przybyłowicz",
    url: "https://archive.org/download/the-witcher-3-gamerips/High%20Quality%20Gamerips%20of%20The%20Witcher%203%20-%20The%20Wild%20Hunt/The%20Witcher%203%20Wild%20Hunt%20Unreleased%20Tracks/Versus%20Eredin.mp3",
    style: "Orquesta apocalíptica, metales gélidos y choque de acero",
    color: "#a855f7",
    description: "El clímax final en Naglfar combatiendo al Rey de la Cacería Salvaje sobre el mar helado."
  },

  // ==============================
  // --- SKYRIM (10 Oficiales) ---
  // ==============================
  {
    id: "skyrim_dragonborn",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Dragonborn (Dovahkiin)",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/01%20-%20Dragonborn.mp3",
    style: "Coro nórdico de 30 guerreros, timbales y metales",
    color: "#06b6d4",
    description: "El himno sagrado en lengua de dragones que celebra la llegada del último Sangre de Dragón."
  },
  {
    id: "skyrim_past_to_present",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "From Past to Present",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/03%20-%20From%20Past%20to%20Present.mp3",
    style: "Flauta pastoril, cuerdas suaves y aire de tundra nórdica",
    color: "#06b6d4",
    description: "La serena inmensidad de los prados de Skyrim al disiparse la neblina matinal."
  },
  {
    id: "skyrim_unbroken_road",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Unbroken Road",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/04%20-%20Unbroken%20Road.mp3",
    style: "Sinfonía montañosa noble, trompas y viaje a pie",
    color: "#06b6d4",
    description: "El ascenso por los Siete Mil Escalones rumbo a Alto Hrothgar entre el viento helado."
  },
  {
    id: "skyrim_ancient_stones",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Ancient Stones",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/05%20-%20Ancient%20Stones.mp3",
    style: "Dulcémele cristalino, cuerdas cálidas y magia arcana",
    color: "#06b6d4",
    description: "Los menhires y túmulos milenarios que custodian los secretos arcanos de los Primeros Hombres."
  },
  {
    id: "skyrim_dragonsreach",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Dragonsreach",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/08%20-%20Dragonsreach.mp3",
    style: "Trompas imperiales y honor en la corte del Jarl",
    color: "#06b6d4",
    description: "La imponente sala de madera donde antaño el rey Olaf Ojo de Dragón aprisionó a Numinex."
  },
  {
    id: "skyrim_dawn",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Dawn",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/14%20-%20Dawn.mp3",
    style: "Voces corales translúcidas y primera luz solar en la nieve",
    color: "#06b6d4",
    description: "El amanecer tiñendo de oro las cumbres nevadas de la Garganta del Mundo."
  },
  {
    id: "skyrim_secunda",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Secunda",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/17%20-%20Secunda.mp3",
    style: "Piano nocturno, cuerdas glaciales y luna de medianoche",
    color: "#06b6d4",
    description: "La luz plateada de las lunas de Nirn sobre los glaciares y tundras silenciosas de Skyrim."
  },
  {
    id: "skyrim_far_horizons",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "Far Horizons",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/24%20-%20Far%20Horizons.mp3",
    style: "Voz pastoral, trompas serenas y contemplación infinita",
    color: "#06b6d4",
    description: "El sol naciendo sobre los valles infinitos y cumbres escarpadas de la provincia nórdica."
  },
  {
    id: "skyrim_bannered_mare",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "The Bannered Mare",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/26%20-%20The%20Bannered%20Mare.mp3",
    style: "Flauta de taberna alegre, laúd rítmico e hidromiel nórdico",
    color: "#06b6d4",
    description: "La posada de La Yegua Enjaezada llena de bardos, risas de cazadores y carne asada."
  },
  {
    id: "skyrim_streets_of_whiterun",
    franchiseId: "skyrim",
    franchise: "Skyrim",
    title: "The Streets of Whiterun",
    composer: "Jeremy Soule",
    url: "https://archive.org/download/53-skyrim-atmospheres/27%20-%20The%20Streets%20of%20Whiterun.mp3",
    style: "Cuerdas cálidas, oboe nostálgico y sosiego ciudadano",
    color: "#06b6d4",
    description: "La apacible atmósfera de Carrera Blanca, sus chimeneas encendidas y la hospitalidad nórdica."
  },

  // =====================================
  // --- HOLLOW KNIGHT (10 Oficiales) ---
  // =====================================
  {
    id: "hk_enter_hallownest",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Enter Hallownest",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/01%20-%20Enter%20Hallownest.mp3",
    style: "Cello solitario, piano enigmático y eco de caverna",
    color: "#38bdf8",
    description: "El descenso al reino en ruinas de insectos y sombras bajo las colinas desérticas."
  },
  {
    id: "hk_dirtmouth",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Dirtmouth",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/02%20-%20Dirtmouth.mp3",
    style: "Piano desolado, campanas distantes y viento apagado",
    color: "#38bdf8",
    description: "La villa menguante en la superficie donde solo el viejo Elderbug aguarda a los viajeros."
  },
  {
    id: "hk_crossroads",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Crossroads",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/03%20-%20Crossroads.mp3",
    style: "Cuerdas misteriosas, goteo de estalactitas y exploración subterránea",
    color: "#38bdf8",
    description: "Los caminos olvidados cruzados por fósiles, raíces antiguas y ecos de un imperio caído."
  },
  {
    id: "hk_greenpath",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Greenpath",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/05%20-%20Greenpath.mp3",
    style: "Cuerdas vivaces de hojas, musgo húmedo y flora salvaje",
    color: "#38bdf8",
    description: "Los frondosos y traicioneros jardines silvestres de Sendero Verde gobernados por la vegetación."
  },
  {
    id: "hk_hornet",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Hornet",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/06%20-%20Hornet.mp3",
    style: "Violín ágil y enérgico, compás acrobático de aguja e hilo",
    color: "#38bdf8",
    description: "El duelo acrobático contra la protectora encapuchada de Hallownest armando su aguja letal."
  },
  {
    id: "hk_mantis_lords",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Mantis Lords",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/08%20-%20Mantis%20Lords.mp3",
    style: "Clavecín vertiginoso, percusión marcial y duelo de respeto",
    color: "#38bdf8",
    description: "El combate a tres sobre tronos de espinas en la Aldea Mantis para ganar la reverencia de la tribu."
  },
  {
    id: "hk_city_of_tears",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "City of Tears",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/09%20-%20City%20of%20Tears.mp3",
    style: "Voz femenina melancólica, piano pluvial y lluvia infinita",
    color: "#38bdf8",
    description: "La lluvia que cae eternamente desde el Lago Azul sobre las torres y vitrales de la capital de Hallownest."
  },
  {
    id: "hk_dung_defender",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Dung Defender",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/10%20-%20Dung%20Defender.mp3",
    style: "Metales heráldicos alegres, bravura caballeresca y ¡DOMA DOMA!",
    color: "#38bdf8",
    description: "Ogrim, uno de los Cinco Grandes Caballeros, vigilando lealmente los Canales Reales con júbilo."
  },
  {
    id: "hk_crystal_peak",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Crystal Peak",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/11%20-%20Crystal%20Peak.mp3",
    style: "Glockenspiel brillante, resonancia mineral y maquinaria minera",
    color: "#38bdf8",
    description: "Las minas de cuarzo rosa donde la luz cristalina zumba con cantos hipnóticos y rayos láser."
  },
  {
    id: "hk_resting_grounds",
    franchiseId: "hollow_knight",
    franchise: "Hollow Knight",
    title: "Resting Grounds",
    composer: "Christopher Larkin",
    url: "https://archive.org/download/official-hollow-knight-original-soundtrack/Hollow%20Knight%20-%20Official%20Soundtrack/15%20-%20Resting%20Grounds.mp3",
    style: "Arpa celestial, tranquilidad espectral y sueño de polillas",
    color: "#38bdf8",
    description: "El santuario de los soñadores donde mora la Vidente y florece la raíz del Aguijón Onírico."
  },

  // ======================================
  // --- ASSASSIN'S CREED (10 Oficiales) ---
  // ======================================
  {
    id: "ac_ezios_family",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Ezio's Family",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-03%20Ezio%27s%20Family.mp3",
    style: "Voz femenina etérea, guitarra acústica y cuerda emotiva inmortal",
    color: "#ef4444",
    description: "El himno definitivo de la saga: 'Es una buena vida la que llevamos, hermano. Que nunca cambie'."
  },
  {
    id: "ac_venice_rooftops",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Venice Rooftops",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-02%20Venice%20Rooftops.mp3",
    style: "Guitarra eléctrica renacentista, pulso acelerado de parkour y campanas",
    color: "#ef4444",
    description: "La vertiginosa carrera sobre los tejados de teja roja saltando entre cúpulas y canales venecianos."
  },
  {
    id: "ac_earth",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Earth",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-01%20Earth.mp3",
    style: "Coro renacentista solemne, cuerdas dramáticas y destino del Credo",
    color: "#ef4444",
    description: "El nacimiento de la venganza y el despertar de Ezio Auditore da Firenze ante la conspiración."
  },
  {
    id: "ac_florence_tarantella",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Florence Tarantella",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-04%20Florence%20Tarantella.mp3",
    style: "Mandolina rápida, pandereta festiva y vitalidad toscana",
    color: "#ef4444",
    description: "El bullicio de los mercados y las plazas florentinas en el apogeo del Renacimiento italiano."
  },
  {
    id: "ac_home_in_florence",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Home In Florence",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-05%20Home%20In%20Florence.mp3",
    style: "Laúd contemplativo, calidez hogareña y nostalgia de los días felices",
    color: "#ef4444",
    description: "El recuerdo sereno del Palazzo Auditore antes de la traición que cambió el destino de Italia."
  },
  {
    id: "ac_tour_of_venice",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Tour of Venice",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-10%20Tour%20of%20Venice.mp3",
    style: "Góndolas nocturnas, violines elegantes y misterio carnavalesco",
    color: "#ef4444",
    description: "Navegando entre los palacios flotantes y el Puente de Rialto bajo las máscaras del Carnaval."
  },
  {
    id: "ac_flight_over_venice",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Flight Over Venice",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-11%20Flight%20Over%20Venice%201.mp3",
    style: "Vuelo de planeador, viento en la cara e ingenio de Leonardo da Vinci",
    color: "#ef4444",
    description: "Sobrevolando el Palacio Ducal en la máquina voladora de Leonardo para infiltrarse en el senado."
  },
  {
    id: "ac_dreams_of_venice",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Dreams of Venice",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/1-13%20Dreams%20of%20Venice.mp3",
    style: "Sintetizadores etéreos del Animus fundidos con cuerdas renacentistas",
    color: "#ef4444",
    description: "La conexión de ADN a través de los siglos desvelando las memorias de la Serenísima República."
  },
  {
    id: "ac_sanctuary",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Sanctuary",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/2-02%20Sanctuary.mp3",
    style: "Coro gregoriano oscuro, ecos de cripta y secretos de Altaïr",
    color: "#ef4444",
    description: "La cripta oculta bajo Villa Auditore en Monteriggioni donde reposa la armadura legendaria."
  },
  {
    id: "ac_ezio_in_florence",
    franchiseId: "assassins_creed",
    franchise: "Assassin's Creed",
    title: "Ezio In Florence",
    composer: "Jesper Kyd",
    url: "https://archive.org/download/jesper-kyd-assassins-creed-ii-original-game-soundtrack/2-06%20Ezio%20In%20Florence.mp3",
    style: "Cuerdas solemnes de determinación y la hoja oculta desenvainada",
    color: "#ef4444",
    description: "El maestro Asesino regresando a su ciudad natal para impartir justicia contra los templarios."
  }
];

export function ScribeRadio() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("potc");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoopingSingle, setIsLoopingSingle] = useState(false);
  // Default to random franchise alternation as requested: "haz que alterne entre las canciones de la franquicia aleatoriamente"
  const [isFranchiseShuffle, setIsFranchiseShuffle] = useState<boolean>(() => {
    const saved = localStorage.getItem("scribe_radio_shuffle");
    return saved !== null ? saved === "true" : true;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("scribe_radio_volume");
    return saved ? parseFloat(saved) : 0.4;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // History stack for back navigation during random play
  const historyRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = STATION_TRACKS[currentTrackIndex] || STATION_TRACKS[0];

  // Tracks for the currently selected franchise tab
  const franchiseTracks = useMemo(() => {
    return STATION_TRACKS.filter(t => t.franchiseId === selectedFranchiseId);
  }, [selectedFranchiseId]);

  // Current Franchise metadata
  const currentFranchise = useMemo(() => {
    return FRANCHISES.find(f => f.id === currentTrack.franchiseId) || FRANCHISES[0];
  }, [currentTrack.franchiseId]);

  // Function to calculate next track (Random within current franchise or sequential)
  const getNextTrackIndex = (currentIdx: number, shuffleMode: boolean): number => {
    const activeTrack = STATION_TRACKS[currentIdx] || STATION_TRACKS[0];
    
    if (shuffleMode) {
      // Find all tracks belonging to the SAME franchise
      const sameFranchiseTracks = STATION_TRACKS
        .map((t, idx) => ({ track: t, index: idx }))
        .filter(item => item.track.franchiseId === activeTrack.franchiseId);

      if (sameFranchiseTracks.length <= 1) {
        return currentIdx;
      }

      // Pick a random track from this franchise that is NOT the current one
      const candidates = sameFranchiseTracks.filter(item => item.index !== currentIdx);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      return chosen.index;
    } else {
      // Sequential within the entire library
      return (currentIdx + 1) % STATION_TRACKS.length;
    }
  };

  // Initialize or update audio when track changes
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio(currentTrack.url);
      audio.loop = isLoopingSingle;
      audioRef.current = audio;
    } else {
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        audioRef.current.pause();
      }
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      if (wasPlaying) {
        setIsConnecting(true);
        audioRef.current.play()
          .then(() => setIsConnecting(false))
          .catch((err) => {
            console.error("Audio playback interrupted", err);
            setIsPlaying(false);
            setIsConnecting(false);
          });
      }
    }

    // Keep franchise tab in sync with playing track
    setSelectedFranchiseId(currentTrack.franchiseId);
    localStorage.setItem("scribe_radio_track_id", currentTrack.id);
  }, [currentTrackIndex]);

  // Loop mode handler
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLoopingSingle;
    }
  }, [isLoopingSingle]);

  // Wire up audio event listeners for track completion (auto-advance with random franchise alternation)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (!isLoopingSingle) {
        setCurrentTrackIndex((prev) => {
          historyRef.current.push(prev);
          return getNextTrackIndex(prev, isFranchiseShuffle);
        });
      }
    };

    const handleWaiting = () => setIsConnecting(true);
    const handlePlaying = () => {
      setIsConnecting(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
    };
  }, [isLoopingSingle, isFranchiseShuffle]);

  // Sync volume state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem("scribe_radio_volume", volume.toString());
  }, [volume, isMuted]);

  // Save shuffle state
  useEffect(() => {
    localStorage.setItem("scribe_radio_shuffle", isFranchiseShuffle.toString());
  }, [isFranchiseShuffle]);

  // Restore track index on first mount
  useEffect(() => {
    const savedTrackId = localStorage.getItem("scribe_radio_track_id");
    if (savedTrackId) {
      const index = STATION_TRACKS.findIndex(t => t.id === savedTrackId);
      if (index !== -1) {
        setCurrentTrackIndex(index);
        setSelectedFranchiseId(STATION_TRACKS[index].franchiseId);
      }
    }
  }, []);

  // Handle Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsConnecting(true);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsConnecting(false);
        })
        .catch((err) => {
          console.error("Audio playback blocked by browser", err);
          setIsPlaying(false);
          setIsConnecting(false);
        });
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => {
      historyRef.current.push(prev);
      return getNextTrackIndex(prev, isFranchiseShuffle);
    });
  };

  const handlePrevTrack = () => {
    if (historyRef.current.length > 0) {
      const prevIdx = historyRef.current.pop()!;
      setCurrentTrackIndex(prevIdx);
    } else {
      // If no history, move back sequentially within same franchise
      const sameFranchise = STATION_TRACKS
        .map((t, idx) => ({ track: t, index: idx }))
        .filter(item => item.track.franchiseId === currentTrack.franchiseId);
      
      const currentPos = sameFranchise.findIndex(item => item.index === currentTrackIndex);
      if (currentPos > 0) {
        setCurrentTrackIndex(sameFranchise[currentPos - 1].index);
      } else {
        setCurrentTrackIndex(sameFranchise[sameFranchise.length - 1].index);
      }
    }
  };

  const handleSelectTrack = (trackId: string) => {
    const index = STATION_TRACKS.findIndex(t => t.id === trackId);
    if (index !== -1) {
      historyRef.current.push(currentTrackIndex);
      setCurrentTrackIndex(index);
      if (!isPlaying) {
        setTimeout(() => {
          audioRef.current?.play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }, 50);
      }
    }
  };

  // Quick action to start playing a random song from a selected franchise
  const handleShuffleFranchise = (franchiseId: string) => {
    const tracks = STATION_TRACKS
      .map((t, idx) => ({ track: t, index: idx }))
      .filter(item => item.track.franchiseId === franchiseId);

    if (tracks.length === 0) return;

    // Pick random track
    const randomPick = tracks[Math.floor(Math.random() * tracks.length)];
    historyRef.current.push(currentTrackIndex);
    setCurrentTrackIndex(randomPick.index);
    setSelectedFranchiseId(franchiseId);
    setIsFranchiseShuffle(true);

    setTimeout(() => {
      audioRef.current?.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }, 50);
  };

  const currentFranchiseColor = currentTrack.color;

  return (
    <div className="fixed bottom-5 left-4 lg:left-[260px] z-40 font-sans select-none pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-[420px] max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-18rem)] bg-card/95 border border-border/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-3 bg-secondary/40 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Radio className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[12px] font-bold text-foreground tracking-wider uppercase">
                      Sintonizador Épico
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-medium">
                      70 OST Oficiales
                    </span>
                    {isFranchiseShuffle && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 rounded font-sans font-medium flex items-center gap-1">
                        <Shuffle className="h-2.5 w-2.5" /> Aleatorio activo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    7 universos legendarios con alternancia inteligente de franquicia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Minimizar sintonizador"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Franchise Selection Tabs */}
            <div className="p-2 border-b border-border/40 bg-background/50 flex gap-1 overflow-x-auto no-scrollbar shrink-0">
              {FRANCHISES.map((franchise) => {
                const isSelected = selectedFranchiseId === franchise.id;
                const Icon = franchise.icon;
                const isCurrentPlayingFranchise = currentTrack.franchiseId === franchise.id;
                return (
                  <button
                    key={franchise.id}
                    onClick={() => setSelectedFranchiseId(franchise.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 shrink-0 relative ${
                      isSelected
                        ? "bg-secondary text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                    }`}
                  >
                    <Icon 
                      className="h-3.5 w-3.5" 
                      style={{ color: isSelected || isCurrentPlayingFranchise ? franchise.color : "currentColor" }} 
                    />
                    <span>{franchise.shortName}</span>
                    {isCurrentPlayingFranchise && isPlaying && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Body */}
            <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1">
              {/* Now Playing Widget */}
              <div className="relative p-3 rounded-xl bg-secondary/30 border border-border/50 overflow-hidden flex items-center gap-3">
                {/* Colored background glow */}
                <div 
                  className="absolute inset-0 opacity-10 blur-xl transition-all duration-500 pointer-events-none" 
                  style={{ backgroundColor: currentFranchiseColor }}
                />

                {/* Spinning vinyl disk */}
                <div className="relative shrink-0">
                  <div 
                    className={`h-12 w-12 rounded-full border border-border/70 flex items-center justify-center bg-zinc-950 transition-all duration-1000 ${
                      isPlaying && !isConnecting ? "animate-spin" : ""
                    }`}
                    style={{ animationDuration: "5s" }}
                  >
                    <Disc className="h-6 w-6 text-muted-foreground/70" />
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-600" />
                  </div>
                  {isPlaying && !isConnecting && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentFranchiseColor }}></span>
                      <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: currentFranchiseColor }}></span>
                    </span>
                  )}
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span 
                      className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all duration-500"
                      style={{ backgroundColor: `${currentFranchiseColor}20`, color: currentFranchiseColor }}
                    >
                      {currentTrack.franchise}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 truncate">
                      {currentTrack.composer}
                    </span>
                  </div>
                  <h5 className="text-[12px] font-semibold text-foreground truncate">
                    {currentTrack.title}
                  </h5>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {currentTrack.style}
                  </p>
                </div>
              </div>

              {/* Franchise Playlist (Tracks for the active franchise tab) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                    <Music className="h-3 w-3" style={{ color: FRANCHISES.find(f => f.id === selectedFranchiseId)?.color }} />
                    Canciones de {FRANCHISES.find(f => f.id === selectedFranchiseId)?.name}
                  </span>
                  
                  {/* Quick Shuffle Franchise Button */}
                  <button
                    onClick={() => handleShuffleFranchise(selectedFranchiseId)}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-border/60 hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                    title={`Reproducir aleatoriamente canciones de ${FRANCHISES.find(f => f.id === selectedFranchiseId)?.name}`}
                  >
                    <Shuffle className="h-2.5 w-2.5" />
                    <span>Barajar ({franchiseTracks.length})</span>
                  </button>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  {franchiseTracks.map((track, i) => {
                    const isSelected = currentTrack.id === track.id;
                    return (
                      <button
                        key={track.id}
                        onClick={() => handleSelectTrack(track.id)}
                        className={`w-full p-2 rounded-xl text-left border transition-all flex items-center justify-between gap-2.5 relative overflow-hidden ${
                          isSelected 
                            ? "border-primary/50 bg-primary/10 text-foreground shadow-sm" 
                            : "border-border/40 hover:border-border/80 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Track Number / Playing indicator */}
                          <div 
                            className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-secondary/80 text-muted-foreground"
                            }`}
                          >
                            {isSelected && isPlaying ? (
                              <Music className="h-3 w-3 animate-bounce" />
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h6 className="text-[11px] font-semibold truncate leading-snug">
                              {track.title}
                            </h6>
                            <p className="text-[9px] opacity-75 truncate">
                              {track.style}
                            </p>
                          </div>
                        </div>

                        {/* Status Icon */}
                        {isSelected && (
                          <div 
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                            style={{ backgroundColor: `${track.color}25`, color: track.color }}
                          >
                            {isPlaying ? "En Vivo" : "Pausado"}
                          </div>
                        )}

                        {/* Active bar */}
                        {isSelected && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-0.5" 
                            style={{ backgroundColor: track.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Controls */}
              <div className="pt-2 border-t border-border/40 space-y-2.5">
                {/* Primary Player Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Previous Track */}
                    <button
                      onClick={handlePrevTrack}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Pista anterior (historial)"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    {/* Play / Pause */}
                    <button
                      onClick={togglePlay}
                      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                      title={isPlaying ? "Pausar música" : "Reproducir música"}
                    >
                      {isConnecting ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4 fill-primary-foreground" />
                      ) : (
                        <Play className="h-4 w-4 fill-primary-foreground translate-x-0.5" />
                      )}
                    </button>

                    {/* Next Track */}
                    <button
                      onClick={handleNextTrack}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={isFranchiseShuffle ? "Siguiente pista aleatoria de la franquicia" : "Siguiente pista"}
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    {/* Random Franchise Toggle (Requested Feature) */}
                    <button
                      onClick={() => setIsFranchiseShuffle(!isFranchiseShuffle)}
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                        isFranchiseShuffle 
                          ? "bg-primary/20 text-primary border border-primary/30" 
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                      title={isFranchiseShuffle ? "Modo aleatorio en franquicia: ACTIVO (alterna al azar entre canciones del mismo universo)" : "Modo aleatorio: DESACTIVADO (modo secuencial)"}
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>

                    {/* Loop Single Track Toggle */}
                    <button
                      onClick={() => setIsLoopingSingle(!isLoopingSingle)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isLoopingSingle 
                          ? "bg-primary/20 text-primary border border-primary/30" 
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                      title={isLoopingSingle ? "Repetir canción actual (Bucle activo)" : "Continuar reproducción"}
                    >
                      <Repeat className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Volume Slider Section */}
                  <div className="flex items-center gap-2 max-w-[140px] flex-1 justify-end">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title={isMuted ? "Quitar silencio" : "Silenciar"}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4 text-red-400" />
                      ) : volume < 0.3 ? (
                        <Volume1 className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-16 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Animated Equalizer Visualizer & Description */}
                <div className="p-2 bg-secondary/20 rounded-xl border border-border/30">
                  {isPlaying && !isConnecting ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider">
                        <span style={{ color: currentFranchiseColor }}>
                          Reproduciendo: {currentTrack.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isFranchiseShuffle && (
                            <span className="text-[8px] px-1 py-0.2 bg-primary/20 rounded text-primary font-mono lowercase">
                              modo aleatorio
                            </span>
                          )}
                          <Sparkles className="h-2.5 w-2.5 animate-pulse" style={{ color: currentFranchiseColor }} />
                        </div>
                      </div>
                      <div className="flex items-end gap-1 h-3.5 px-0.5">
                        {Array.from({ length: 32 }).map((_, idx) => {
                          const animationDuration = `${0.35 + ((idx % 7) * 0.12)}s`;
                          return (
                            <div
                              key={idx}
                              className="flex-1 rounded-t-sm transition-all"
                              style={{
                                animationName: "pulseMusic",
                                animationDuration,
                                animationIterationCount: "infinite",
                                animationTimingFunction: "ease-in-out",
                                backgroundColor: currentFranchiseColor
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                      {currentTrack.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`h-12 w-12 rounded-full flex items-center justify-center shadow-xl border backdrop-blur-md transition-all ${
          isOpen
            ? "bg-primary text-primary-foreground border-primary"
            : isPlaying && !isConnecting
            ? "bg-secondary/95 border-primary/50 text-primary shadow-primary/20"
            : "bg-secondary/90 hover:bg-secondary border-border text-muted-foreground hover:text-foreground"
        }`}
        title="Radio Épica de Fantasía (70 OST Oficiales - 7 Universos)"
      >
        <div className="relative">
          {isPlaying && !isConnecting ? (
            <Disc 
              className="h-5 w-5 animate-spin" 
              style={{ animationDuration: "3.5s", color: isOpen ? "currentColor" : currentFranchiseColor }} 
            />
          ) : (
            <Radio className="h-5 w-5" />
          )}
          {isPlaying && !isConnecting && !isOpen && (
            <span 
              className="absolute -top-2 -right-2 h-2.5 w-2.5 rounded-full animate-ping"
              style={{ backgroundColor: currentFranchiseColor }}
            />
          )}
        </div>
      </motion.button>

      {/* CSS for Equalizer Bars */}
      <style>{`
        @keyframes pulseMusic {
          0%, 100% { height: 12%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
