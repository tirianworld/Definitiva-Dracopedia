import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction
} from "discord.js";

export interface DiscordBotOptions {
  getArticles?: () => Promise<any[]>;
  searchArticles?: (query: string, articles: any[]) => any[];
  callAi?: (prompt: string) => Promise<string>;
}

let botOptions: DiscordBotOptions = {};

interface BotStatus {
  online: boolean;
  configured: boolean;
  username: string | null;
  guildsCount: number;
  inviteUrl: string | null;
  lastError: string | null;
}

let client: Client | null = null;
let botStatus: BotStatus = {
  online: false,
  configured: false,
  username: null,
  guildsCount: 0,
  inviteUrl: null,
  lastError: null
};

// Primordial magic pillars metadata for Discord embeds
const PRIMORDIAL_MAGIC_PILLARS = [
  {
    id: "arcana",
    name: "Magia Arcana",
    subtitle: "Polo de la Estructura y la Manipulación de Leyes Cósmicas",
    color: "#60a5fa",
    hexInt: 0x60a5fa,
    description: "La ciencia del tejido cósmico. Modela la urdimbre de la realidad mediante fórmulas, geometría astral y cálculo de energía primordial.",
    submagias: ["Geometría Arcana", "Transmutación de Leyes", "Canalización de Éter", "Abjuración Rúnica", "Crono-resonancia"],
    spells: ["Disipar Magia", "Contrahechizo", "Teletransporte", "Globo de Invulnerabilidad"]
  },
  {
    id: "divina",
    name: "Magia Divina",
    subtitle: "Polo de la Fe, la Sanación y los Decretos Sagrados",
    color: "#fbbf24",
    hexInt: 0xfbbf24,
    description: "Canalización de voluntades celestiales, devoción y luz primigenia que preserva el orden de la creación y combate la corrupción.",
    submagias: ["Luz Solar Primigenia", "Decretos de Gracia", "Resurrección y Alma", "Sentencia Celestial", "Pacto Sagrado"],
    spells: ["Palabra de Poder: Sanar", "Llama Sagrada", "Revivir", "Aura Sagrada"]
  },
  {
    id: "natural",
    name: "Magia Natural",
    subtitle: "Polo de la Biomasa, el Clima y la Quintaesencia Terrenal",
    color: "#34d399",
    hexInt: 0x34d399,
    description: "El latido viviente de los continentes, raíces de árboles madre, tormentas elementales y el flujo vital de bestias y flora.",
    submagias: ["Climatología Primordial", "Vínculo de Bestias", "Crecimiento de Raíz Madre", "Litomancia Terrenal", "Metamorfosis"],
    spells: ["Tormenta de Fuego", "Curar Heridas", "Forma Salvaje", "Terremoto"]
  },
  {
    id: "profana",
    name: "Magia Profana",
    subtitle: "Polo del Vacío, la Nigromancia y la Corrupción Umbría",
    color: "#a855f7",
    hexInt: 0xa855f7,
    description: "El eco del no-ser, la entropía inevitable, el robo de esencias vitales y la dominación de sombras y huesos.",
    submagias: ["Nigromancia de Hueso", "Sombras Entrópicas", "Maldiciones de Sangre", "Sifón de Vitalidad", "Giro del Alma"],
    spells: ["Danza Macabra", "Círculo de la Muerte", "Dedo de la Muerte", "Rayo de Enervación"]
  },
  {
    id: "salvaje",
    name: "Magia Salvaje",
    subtitle: "Polo del Caos, la Mutación y la Ignición Inestable",
    color: "#f87171",
    hexInt: 0xf87171,
    description: "La llamarada incontrolable de la energía en bruto. Desgarra patrones fijos y transmuta materia en explosiones espontáneas.",
    submagias: ["Caos Cinético", "Mutación Espontánea", "Termomancia Voraz", "Ruptura Gravitatoria", "Relámpago Ciego"],
    spells: ["Bola de Fuego", "Metamorfosis Caótica", "Rayo de Relámpago", "Telequinesis"]
  },
  {
    id: "extraplanar",
    name: "Magia Psiónica y Extraplanar",
    subtitle: "Polo de la Mente, la Singularidad y la Dimensión Astral",
    color: "#c084fc",
    hexInt: 0xc084fc,
    description: "Fuerza de pura voluntad psíquica capaz de doblar el velo entre planos, comunicarse a través de eones y quebrar el espacio.",
    submagias: ["Telepatía Cuántica", "Desplazamiento Astral", "Singularidad Mental", "Brecha Dimensional", "Clarividencia"],
    spells: ["Proyección Astral", "Laberinto", "Muro de Fuerza", "Onda Psíquica"]
  }
];

export function getDiscordBotInviteUrl(clientId?: string): string {
  const id = clientId || process.env.DISCORD_CLIENT_ID;
  if (!id) return "";
  // Permissions: View Channels, Send Messages, Send Messages in Threads, Embed Links, Attach Files, Read Message History, Use Slash Commands
  return `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=277025778752&scope=bot%20applications.commands`;
}

export function getDiscordBotStatus(): BotStatus {
  return botStatus;
}

export async function startDiscordBot(appUrl: string, options: DiscordBotOptions = {}) {
  botOptions = options;
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token) {
    botStatus = {
      online: false,
      configured: false,
      username: null,
      guildsCount: 0,
      inviteUrl: clientId ? getDiscordBotInviteUrl(clientId) : null,
      lastError: "DISCORD_BOT_TOKEN no configurado en variables de entorno."
    };
    console.log("[Discord Bot] DISCORD_BOT_TOKEN no detectado. El bot permanecerá inactivo hasta configurar el token.");
    return;
  }

  try {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    // Register Slash Commands
    const commands = [
      new SlashCommandBuilder()
        .setName("grafo")
        .setDescription("Visualiza los grafos interactivos de Dragopedia (Cosmos, Magias Primordiales o Hub)")
        .addStringOption(option =>
          option
            .setName("tipo")
            .setDescription("Elige qué grafo deseas inspeccionar")
            .setRequired(false)
            .addChoices(
              { name: "Grafo del Cosmos (Astros y Constelaciones)", value: "cosmos" },
              { name: "Magias Primordiales (Los 6 Polos del Maná)", value: "magias" },
              { name: "Compendio de Grafos (Hub General)", value: "hub" }
            )
        )
        .addStringOption(option =>
          option
            .setName("buscar")
            .setDescription("Astro, constelación o polo de magia específico a enfocar")
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName("tarot")
        .setDescription("Consulta al Gran Bibliotecario Tarot AI sobre el lore, astros o magia de Caldo de Dragón")
        .addStringOption(option =>
          option
            .setName("pregunta")
            .setDescription("Escribe tu pregunta o duda de lore...")
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("lore")
        .setDescription("Busca tomos y artículos canónicos en la Dragopedia")
        .addStringOption(option =>
          option
            .setName("termino")
            .setDescription("Nombre del dragón, lugar, facción o concepto a buscar")
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("actividad")
        .setDescription("Información y enlace para ejecutar Dragopedia directamente como Discord Activity"),

      new SlashCommandBuilder()
        .setName("ayuda")
        .setDescription("Muestra la lista de comandos disponibles del bot de Dragopedia")
    ];

    if (clientId) {
      const rest = new REST({ version: "10" }).setToken(token);
      try {
        console.log("[Discord Bot] Registrando comandos slash en Discord...");
        if (guildId) {
          await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
          console.log(`[Discord Bot] Comandos registrados exitosamente para el servidor ${guildId}`);
        } else {
          await rest.put(Routes.applicationCommands(clientId), { body: commands });
          console.log("[Discord Bot] Comandos globales registrados exitosamente.");
        }
      } catch (cmdErr) {
        console.error("[Discord Bot] Error al registrar comandos slash:", cmdErr);
      }
    }

    client.once("ready", (c) => {
      console.log(`[Discord Bot] Conectado exitosamente como ${c.user.tag}`);
      botStatus = {
        online: true,
        configured: true,
        username: c.user.tag,
        guildsCount: c.guilds.cache.size,
        inviteUrl: getDiscordBotInviteUrl(c.user.id),
        lastError: null
      };
    });

    client.on("interactionCreate", async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await handleChatInputCommand(interaction, appUrl);
        } else if (interaction.isStringSelectMenu()) {
          await handleSelectMenuInteraction(interaction, appUrl);
        }
      } catch (err: any) {
        console.error("[Discord Bot] Error al procesar interacción:", err);
        const errMsg = "Ocurrió un error al canalizar tu consulta con la Dragopedia.";
        if (interaction.isRepliable()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: errMsg, ephemeral: true });
          } else {
            await interaction.reply({ content: errMsg, ephemeral: true });
          }
        }
      }
    });

    await client.login(token);
  } catch (loginErr: any) {
    console.error("[Discord Bot] Error al iniciar sesión en Discord:", loginErr.message);
    botStatus = {
      online: false,
      configured: true,
      username: null,
      guildsCount: 0,
      inviteUrl: clientId ? getDiscordBotInviteUrl(clientId) : null,
      lastError: loginErr.message || "Fallo de autenticación con DISCORD_BOT_TOKEN"
    };
  }
}

async function handleChatInputCommand(interaction: ChatInputCommandInteraction, appUrl: string) {
  const { commandName } = interaction;
  const baseUrl = appUrl.replace(/\/$/, "");

  if (commandName === "grafo") {
    const tipo = interaction.options.getString("tipo") || "hub";
    const buscar = interaction.options.getString("buscar")?.trim();

    if (tipo === "cosmos") {
      let targetUrl = `${baseUrl}/grafos?tab=cosmos`;
      let title = "🪐 Grafo del Cosmos: Mapa Estelar y Constelaciones";
      let desc = "Mapa celeste interactivo de Caldo de Dragón. Explora astros, conexiones gravitatorias de facciones, dinastías y reinos ancestrales.";
      
      if (buscar) {
        targetUrl += `&star=${encodeURIComponent(buscar)}`;
        title = `🪐 Astro: ${buscar} — Grafo del Cosmos`;
        desc = `Enfocando el astro **${buscar}** en el mapa celeste. Haz clic en el botón de abajo para interactuar con su física orbital y red de conexiones.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(0x38bdf8)
        .setThumbnail(`${baseUrl}/images/og/grafo-cosmos.png`)
        .setImage(`${baseUrl}/images/og/grafo-cosmos.png`)
        .addFields(
          { name: "🌌 Características en Vivo", value: "• Física gravitatoria en tiempo real\n• Zoom y panorámica estelar fluida\n• Fichas de lore con un clic", inline: true },
          { name: "💫 Modos de Vista", value: "• Vista completa del Cosmos\n• Filtro por constelaciones\n• Inspección de dragones astrales", inline: true }
        )
        .setFooter({ text: "Dragopedia • Cartografía Celeste de Caldo de Dragón", iconURL: `${baseUrl}/favicon.ico` });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("🪐 Abrir Grafo Interactivo")
          .setStyle(ButtonStyle.Link)
          .setURL(targetUrl),
        new ButtonBuilder()
          .setLabel("✨ Ver Magias Primordiales")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/grafos?tab=magias`),
        new ButtonBuilder()
          .setLabel("🔮 Consultar a Tarot AI")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/tarot-chat`)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (tipo === "magias") {
      let targetUrl = `${baseUrl}/grafos?tab=magias`;
      let title = "✨ Magias Primordiales: Los 6 Polos del Maná";
      let desc = "El mandala cosmológico del equilibrio sagrado del maná: Arcana, Divina, Psiónica, Profana, Natural y Salvaje con sus submagias y compendio 5e.";

      if (buscar) {
        targetUrl += `&pillar=${encodeURIComponent(buscar.toLowerCase())}`;
        title = `✨ Polo: ${buscar} — Magias Primordiales`;
        desc = `Inspección del polo de magia **${buscar}** y sus ramificaciones concéntricas. Puedes elegir cualquier otro polo en el menú desplegable.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(0xa855f7)
        .setThumbnail(`${baseUrl}/images/og/grafo-magias.png`)
        .setImage(`${baseUrl}/images/og/grafo-magias.png`)
        .addFields(
          { name: "🔮 Los 6 Polos Sagrados", value: "• **Arcana**: Leyes y Éter\n• **Divina**: Fe y Sentencia\n• **Natural**: Biomasa y Clima", inline: true },
          { name: "⚡ Polos Opuestos", value: "• **Profana**: Vacío y Nigromancia\n• **Salvaje**: Caos y Mutación\n• **Psiónica**: Mente Extraplanar", inline: true }
        )
        .setFooter({ text: "Dragopedia • Sistema de Magias Primordiales", iconURL: `${baseUrl}/favicon.ico` });

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("✨ Abrir Mandala de Magias en Vivo")
          .setStyle(ButtonStyle.Link)
          .setURL(targetUrl),
        new ButtonBuilder()
          .setLabel("🪐 Ir al Grafo del Cosmos")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/grafos?tab=cosmos`)
      );

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_pillar")
          .setPlaceholder("Selecciona un Polo Primordial para explorar sus detalles...")
          .addOptions(
            PRIMORDIAL_MAGIC_PILLARS.map(p =>
              new StringSelectMenuOptionBuilder()
                .setLabel(p.name)
                .setDescription(p.subtitle.slice(0, 100))
                .setValue(p.id)
            )
          )
      );

      await interaction.reply({ embeds: [embed], components: [buttonRow, selectRow] });
      return;
    }

    // Default: Hub general
    const embed = new EmbedBuilder()
      .setTitle("🌌 Compendio de Grafos del Mundo | Dragopedia")
      .setDescription("Cartografía astral y mágica del universo de Caldo de Dragón. Elige qué mapa o grafo deseas explorar en tiempo real:")
      .setColor(0x8b5cf6)
      .setImage(`${baseUrl}/images/og/grafo-hub.png`)
      .addFields(
        { 
          name: "🪐 Grafo del Cosmos", 
          value: "Explora cientos de astros, estrellas de dragones, constelaciones vivas y linajes astronómicos con física gravitatoria en tiempo real.", 
          inline: false 
        },
        { 
          name: "✨ Magias Primordiales", 
          value: "El mandala cromático de los 6 polos universales, concéntricos de submagias, equilibrio elemental y hechizos oficiales 5e.", 
          inline: false 
        }
      )
      .setFooter({ text: "Dragopedia • Biblioteca de Kaliria", iconURL: `${baseUrl}/favicon.ico` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("🪐 Explorar Grafo del Cosmos")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=cosmos`),
      new ButtonBuilder()
        .setLabel("✨ Explorar Magias Primordiales")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=magias`),
      new ButtonBuilder()
        .setLabel("🔮 Consultar al Tarot AI")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/tarot-chat`)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (commandName === "tarot") {
    const pregunta = interaction.options.getString("pregunta", true);
    await interaction.deferReply();

    try {
      const articles = botOptions.getArticles ? await botOptions.getArticles() : [];
      const searchMatches = botOptions.searchArticles ? botOptions.searchArticles(pregunta, articles).slice(0, 5) : [];
      const matchedTitles = searchMatches.map((m: any) => m.article?.title || "").filter(Boolean).join(", ");

      let aiResponseText = "";
      let detectedStar: string | null = null;
      let detectedPillar: string | null = null;

      const contextLore = searchMatches.map(m => `Título: ${m.article.title}\nContenido:\n${(m.article.content || "").slice(0, 800)}`).join("\n---\n");

      const prompt = `Eres Tarot, Gran Bibliotecario Arcano de la Gran Biblioteca de Kaliria en el universo de Caldo de Dragón.
Responde de manera sabia, elocuente y mística a la siguiente consulta de un caminante:
"${pregunta}"

Contexto relevante de la biblioteca:
${contextLore || "No hay artículos exactos en caché previa."}

Instrucciones:
1. Responde en español culto, elegante y evocador.
2. Máximo 250 palabras para ajustarse a los límites de Discord.
3. Si la respuesta involucra a un dragón, deidad o lugar importante, o a una de las 6 magias primordiales (Arcana, Divina, Psiónica, Profana, Natural, Salvaje), menciónalo con naturalidad.`;

      if (botOptions.callAi) {
        try {
          aiResponseText = await botOptions.callAi(prompt);
        } catch (err: any) {
          console.warn("[Discord Bot] botOptions.callAi error:", err?.message || err);
        }
      }

      if (!aiResponseText) {
        // Fallback to direct Groq / Mistral / Cerebras
        const gKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3;
        const mKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY_2;
        if (gKey) {
          try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${gKey.trim()}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
              })
            });
            if (res.ok) {
              const d: any = await res.json();
              aiResponseText = d.choices?.[0]?.message?.content || "";
            }
          } catch (gErr: any) {
            console.warn("[Discord Bot] Groq fallback error:", gErr?.message);
          }
        }
        if (!aiResponseText && mKey) {
          try {
            const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${mKey.trim()}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "ministral-8b-latest",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
              })
            });
            if (res.ok) {
              const d: any = await res.json();
              aiResponseText = d.choices?.[0]?.message?.content || "";
            }
          } catch (mErr: any) {
            console.warn("[Discord Bot] Mistral fallback error:", mErr?.message);
          }
        }
      }

      if (!aiResponseText) {
        aiResponseText = `*Tarot ajusta sus lentes arcanos y consulta los tomos de Kaliria...*\n\nHe encontrado registros sobre: **${matchedTitles || "la creación de los mundos"}** en los manuscritos sagrados de la biblioteca.`;
      }

      // Check if any star or pillar is mentioned in the prompt or answer
      for (const p of PRIMORDIAL_MAGIC_PILLARS) {
        if (pregunta.toLowerCase().includes(p.id) || aiResponseText.toLowerCase().includes(p.name.toLowerCase())) {
          detectedPillar = p.id;
          break;
        }
      }
      for (const m of searchMatches) {
        if (pregunta.toLowerCase().includes(m.article.title.toLowerCase()) || aiResponseText.includes(m.article.title)) {
          detectedStar = m.article.title;
          break;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("🔮 Oráculo de Tarot AI • Gran Biblioteca de Kaliria")
        .setDescription(`**Pregunta del caminante:**\n> *«${pregunta}»*\n\n**Respuesta de Tarot:**\n${aiResponseText}`)
        .setColor(0x8b5cf6)
        .setThumbnail(`${baseUrl}/images/og/grafo-hub.png`)
        .setFooter({ text: "Dragopedia • Tarot AI Oracle", iconURL: `${baseUrl}/favicon.ico` });

      const buttons: ButtonBuilder[] = [];

      if (detectedStar) {
        buttons.push(
          new ButtonBuilder()
            .setLabel(`🪐 Ver "${detectedStar}" en el Cosmos`)
            .setStyle(ButtonStyle.Link)
            .setURL(`${baseUrl}/grafos?tab=cosmos&star=${encodeURIComponent(detectedStar)}`)
        );
      } else {
        buttons.push(
          new ButtonBuilder()
            .setLabel("🪐 Explorar en el Grafo del Cosmos")
            .setStyle(ButtonStyle.Link)
            .setURL(`${baseUrl}/grafos?tab=cosmos`)
        );
      }

      if (detectedPillar) {
        buttons.push(
          new ButtonBuilder()
            .setLabel(`✨ Ver Polo en Magias Primordiales`)
            .setStyle(ButtonStyle.Link)
            .setURL(`${baseUrl}/grafos?tab=magias&pillar=${detectedPillar}`)
        );
      } else {
        buttons.push(
          new ButtonBuilder()
            .setLabel("✨ Magias Primordiales")
            .setStyle(ButtonStyle.Link)
            .setURL(`${baseUrl}/grafos?tab=magias`)
        );
      }

      buttons.push(
        new ButtonBuilder()
          .setLabel("💬 Abrir Chat Completo en la Web")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/tarot-chat`)
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5));
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err: any) {
      console.error("[Discord Bot] Error en comando /tarot:", err);
      await interaction.editReply({ content: "El velo de los planos impidió a Tarot responder en este instante. Inténtalo de nuevo." });
    }
    return;
  }

  if (commandName === "lore") {
    const termino = interaction.options.getString("termino", true);
    await interaction.deferReply();

    const articles = botOptions.getArticles ? await botOptions.getArticles() : [];
    const matches = botOptions.searchArticles ? botOptions.searchArticles(termino, articles) : [];

    if (matches.length === 0) {
      const notFoundEmbed = new EmbedBuilder()
        .setTitle(`📜 Manuscrito no encontrado: "${termino}"`)
        .setDescription(`Ningún tomo en la Gran Biblioteca de Kaliria coincide exactamente con tu búsqueda. Puedes crear este tomo en la Dragopedia o consultar al Tarot AI.`)
        .setColor(0xeab308);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("🔍 Buscar en la Web")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/buscar?q=${encodeURIComponent(termino)}`),
        new ButtonBuilder()
          .setLabel("🔮 Preguntar al Tarot AI")
          .setStyle(ButtonStyle.Link)
          .setURL(`${baseUrl}/tarot-chat`)
      );

      await interaction.editReply({ embeds: [notFoundEmbed], components: [row] });
      return;
    }

    const top = matches[0].article;
    const cleanContent = (top.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 350);

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${top.title}`)
      .setDescription(top.summary || `${cleanContent}...`)
      .setColor(0x3b82f6)
      .addFields(
        { name: "🏷️ Categoría", value: top.category || "General", inline: true },
        { name: "🔗 Astro en el Cosmos", value: `[Ver ${top.title} en el Grafo](${baseUrl}/grafos?tab=cosmos&star=${encodeURIComponent(top.title)})`, inline: true }
      )
      .setFooter({ text: "Dragopedia • Tomos Canónicos", iconURL: `${baseUrl}/favicon.ico` });

    if (top.coverImage) {
      const fullCover = top.coverImage.startsWith("http") ? top.coverImage : `${baseUrl}${top.coverImage}`;
      embed.setThumbnail(fullCover);
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("📜 Leer Tomo Completo")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/articulo/${top.slug}`),
      new ButtonBuilder()
        .setLabel("🪐 Ver Astro en el Grafo")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=cosmos&star=${encodeURIComponent(top.title)}`),
      new ButtonBuilder()
        .setLabel("🔮 Consultar con Tarot")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/tarot-chat`)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  if (commandName === "actividad") {
    const embed = new EmbedBuilder()
      .setTitle("🚀 Dragopedia como Actividad en Discord")
      .setDescription(
        "¡Puedes explorar el **Grafo del Cosmos**, **Magias Primordiales** y conversar con **Tarot AI** directamente dentro de la ventana de Discord!\n\n" +
        "**Para ejecutar la actividad:**\n" +
        "1. Conéctate a un canal de voz o usa la barra de actividades de Discord.\n" +
        "2. Pulsa el icono del cohete **«Comenzar una actividad»**.\n" +
        "3. Selecciona **Dragopedia** o abre el enlace interactivo adjunto."
      )
      .setColor(0x8b5cf6)
      .setImage(`${baseUrl}/images/og/grafo-hub.png`)
      .setFooter({ text: "Dragopedia • Discord Embedded App Activity", iconURL: `${baseUrl}/favicon.ico` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("🪐 Abrir Grafo en Vivo")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=cosmos`),
      new ButtonBuilder()
        .setLabel("✨ Magias Primordiales")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=magias`),
      new ButtonBuilder()
        .setLabel("📖 Ir a la Portada")
        .setStyle(ButtonStyle.Link)
        .setURL(baseUrl)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (commandName === "ayuda") {
    const embed = new EmbedBuilder()
      .setTitle("🐉 Comandos del Bot de la Dragopedia")
      .setDescription("Bienvenido a la conexión arcana entre Discord y el universo de Caldo de Dragón:")
      .setColor(0x8b5cf6)
      .addFields(
        { name: "🪐 `/grafo [tipo] [buscar]`", value: "Abre y visualiza el **Grafo del Cosmos** o **Magias Primordiales**, con opción de enfocar un astro o polo específico." },
        { name: "🔮 `/tarot <pregunta>`", value: "Consulta al gran bibliotecario Tarot AI. Analizará tomos canónicos y adjuntará enlaces interactivos a los astros relevantes." },
        { name: "📜 `/lore <termino>`", value: "Busca un dragón, lugar o concepto y muestra su tomo canónico y enlace estelar." },
        { name: "🚀 `/actividad`", value: "Instrucciones para abrir la Dragopedia en vivo como una Discord Activity." }
      )
      .setFooter({ text: "Dragopedia • Enciclopedia de Caldo de Dragón", iconURL: `${baseUrl}/favicon.ico` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("🪐 Grafo del Cosmos")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=cosmos`),
      new ButtonBuilder()
        .setLabel("✨ Magias Primordiales")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=magias`),
      new ButtonBuilder()
        .setLabel("🔮 Tarot AI Chat")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/tarot-chat`)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }
}

async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction, appUrl: string) {
  if (interaction.customId === "select_pillar") {
    const selectedId = interaction.values[0];
    const pillar = PRIMORDIAL_MAGIC_PILLARS.find(p => p.id === selectedId);
    const baseUrl = appUrl.replace(/\/$/, "");

    if (!pillar) {
      await interaction.reply({ content: "Polo no encontrado.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`✨ ${pillar.name} — Los 6 Polos Primordiales`)
      .setDescription(`*${pillar.subtitle}*\n\n${pillar.description}`)
      .setColor(pillar.hexInt)
      .setThumbnail(`${baseUrl}/images/og/grafo-magias.png`)
      .addFields(
        { name: "🌀 Submagias Concéntricas", value: pillar.submagias.map(s => `• ${s}`).join("\n"), inline: true },
        { name: "📜 Hechizos Ilustrativos 5e", value: pillar.spells.map(s => `• ${s}`).join("\n"), inline: true }
      )
      .setFooter({ text: `Dragopedia • Magias Primordiales (${pillar.name})`, iconURL: `${baseUrl}/favicon.ico` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(`✨ Enfocar ${pillar.name} en el Mandala`)
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=magias&pillar=${pillar.id}`),
      new ButtonBuilder()
        .setLabel("🪐 Grafo del Cosmos")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/grafos?tab=cosmos`),
      new ButtonBuilder()
        .setLabel("🔮 Preguntar a Tarot AI")
        .setStyle(ButtonStyle.Link)
        .setURL(`${baseUrl}/tarot-chat`)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  }
}
