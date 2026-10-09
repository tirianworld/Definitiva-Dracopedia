import React, { useState, useEffect } from "react";
import { 
  X, 
  Bot, 
  ExternalLink, 
  Check, 
  Copy, 
  Terminal, 
  Sparkles, 
  Orbit, 
  Server, 
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  MessageSquare
} from "lucide-react";

interface DiscordBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BotStatusResponse {
  online: boolean;
  configured: boolean;
  username: string | null;
  guildsCount: number;
  inviteUrl: string | null;
  lastError: string | null;
}

export function DiscordBotModal({ isOpen, onClose }: DiscordBotModalProps) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [status, setStatus] = useState<BotStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn("Could not fetch bot status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const defaultInvite = status?.inviteUrl || "https://discord.com/developers/applications";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#090d16] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-[#0e1424] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <span>Bot de Discord de la Dragopedia</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-normal">
                  v2.0 Slash Commands
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Visualiza grafos, consulta al Tarot AI y explora tomos de lore directamente en Discord
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors"
              title="Actualizar estado"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-foreground/90">
          
          {/* Live Status Card */}
          <div className="p-4 rounded-xl border bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border/70">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5">
                <div className={`w-3 h-3 rounded-full ${status?.online ? "bg-emerald-500" : status?.configured ? "bg-amber-500" : "bg-slate-500"}`} />
                {status?.online && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                )}
              </div>
              <div>
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>{status?.online ? `Bot En Línea: ${status.username}` : status?.configured ? "Bot Configurado (Conectando)" : "Bot Pendiente de Token"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status?.online 
                    ? `Activo en ${status.guildsCount} servidor(es). Comandos slash listos para usar.`
                    : status?.lastError 
                      ? `Aviso: ${status.lastError}`
                      : "Configura DISCORD_BOT_TOKEN en tus variables de entorno para que el bot inicie automáticamente."}
                </p>
              </div>
            </div>

            {status?.online && status?.inviteUrl ? (
              <a
                href={status.inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Invitar a mi Servidor</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            ) : (
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center gap-2 transition-all shrink-0"
              >
                <span>Portal de Desarrolladores</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
          </div>

          {/* Quick Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <Orbit className="w-4 h-4" />
                <span>Visualizador de Grafos</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usa <code className="text-cyan-300 font-mono">/grafo tipo:cosmos</code> o <code className="text-cyan-300 font-mono">/grafo tipo:magias</code>. Muestra previsualizaciones ricas con botones interactivos que llevan directo al astro enfocado.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Tarot AI en Discord</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usa <code className="text-purple-300 font-mono">/tarot &lt;pregunta&gt;</code>. El gran bibliotecario consulta el canon de la Dragopedia y adjunta botones directos al mapa estelar.
              </p>
            </div>
          </div>

          {/* Commands List */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Comandos Slash Disponibles</span>
            </h3>

            <div className="space-y-2">
              {[
                {
                  cmd: "/grafo tipo:cosmos [buscar:nombre]",
                  desc: "Abre el mapa celeste interactivo o enfoca un astro específico."
                },
                {
                  cmd: "/grafo tipo:magias [buscar:polo]",
                  desc: "Abre el mandala de los 6 polos de maná con selector de submagias."
                },
                {
                  cmd: "/tarot pregunta:¿Quién es Gravatax?",
                  desc: "Consulta oracular con Tarot AI y generación de accesos rápidos a los grafos."
                },
                {
                  cmd: "/lore termino:Boletaria",
                  desc: "Muestra ficha canónica del tomo y enlace de astro cósmico."
                },
                {
                  cmd: "/actividad",
                  desc: "Instrucciones para abrir Dragopedia dentro de Discord como Activity."
                }
              ].map((item) => (
                <div 
                  key={item.cmd}
                  className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-cyan-300 font-medium">{item.cmd}</span>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.cmd.split(" ")[0], item.cmd)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
                    title="Copiar comando"
                  >
                    {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Setup Guide */}
          <div className="space-y-3 border-t border-border/80 pt-4">
            <h3 className="font-heading font-semibold text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>¿Cómo instalar el Bot en tu servidor? (Paso a Paso)</span>
            </h3>

            <ol className="space-y-3 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
              <li className="pl-1">
                <span className="text-foreground font-medium">Crear aplicación en Discord Developer:</span> Ve a{" "}
                <a 
                  href="https://discord.com/developers/applications" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary underline hover:text-primary/80"
                >
                  discord.com/developers/applications
                </a>{" "}
                y pulsa <strong>«New Application»</strong> (nómbrala <em>Dragopedia</em>).
              </li>
              <li className="pl-1">
                <span className="text-foreground font-medium">Obtener credenciales:</span>
                <div className="mt-1 pl-4 space-y-1 text-[11px]">
                  <div>• En <strong>Bot</strong>: Pulsa <em>«Reset Token»</em> y copia el token en la variable <code className="text-amber-300 font-mono">DISCORD_BOT_TOKEN</code>.</div>
                  <div>• Activa el interruptor <strong>Message Content Intent</strong> en Privileged Gateway Intents.</div>
                  <div>• En <strong>General Information</strong>: Copia el <em>Application ID</em> en <code className="text-amber-300 font-mono">DISCORD_CLIENT_ID</code>.</div>
                </div>
              </li>
              <li className="pl-1">
                <span className="text-foreground font-medium">Configurar variables:</span> Añade <code className="text-amber-300 font-mono">DISCORD_BOT_TOKEN</code> y <code className="text-amber-300 font-mono">DISCORD_CLIENT_ID</code> en el panel de Ajustes / Variables de entorno del proyecto.
              </li>
              <li className="pl-1">
                <span className="text-foreground font-medium">¡Listo!:</span> El servidor conectará el bot automáticamente, registrará los comandos slash globales y podrás invitarlo a cualquier servidor con un solo clic.
              </li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border/80 bg-[#0e1424] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Permisos seguros para servidores de rol y comunidad</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
