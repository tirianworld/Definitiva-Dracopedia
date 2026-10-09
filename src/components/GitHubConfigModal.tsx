import React, { useState, useEffect } from "react";
import { 
  X, Github, Key, CheckCircle2, AlertCircle, Loader2, 
  ExternalLink, RefreshCw, ShieldCheck, ArrowRight, Database, FolderGit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GitHubConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GitHubConfigModal({ isOpen, onClose, onSuccess }: GitHubConfigModalProps) {
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState("tirianworld/Cdd-wiki-V3");
  const [branch, setBranch] = useState("main");
  const [isConfigured, setIsConfigured] = useState(false);
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushingAll, setPushingAll] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/github-config");
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(!!data.configured);
        if (data.repo) setRepo(data.repo);
        if (data.branch) setBranch(data.branch);
        if (data.user) setUserLogin(data.user);
      }
      // Check localStorage fallback
      const localToken = localStorage.getItem("dragopedia_github_token");
      if (localToken && !token) {
        setToken(localToken);
      }
    } catch (err) {
      console.error("Error loading GitHub config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim() && !isConfigured) {
      setMessage({ type: "error", text: "Por favor introduce un Personal Access Token (PAT) de GitHub." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/github-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim() || undefined,
          repo: repo.trim(),
          branch: branch.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al verificar el token de GitHub.");
      }

      if (token.trim()) {
        localStorage.setItem("dragopedia_github_token", token.trim());
      }
      localStorage.setItem("dragopedia_github_repo", repo.trim());
      localStorage.setItem("dragopedia_github_branch", branch.trim());

      setIsConfigured(true);
      if (data.user) setUserLogin(data.user);
      setMessage({ 
        type: "success", 
        text: `¡Conexión verificada con éxito! Repositorio: ${repo} (Usuario: ${data.user || "Autenticado"})` 
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al conectar con GitHub." });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage({ type: "info", text: "Sincronizando categorías, subcategorías y orden con GitHub..." });

    try {
      const activeToken = token.trim() || localStorage.getItem("dragopedia_github_token") || "";
      const res = await fetch("/api/github-sync", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(activeToken ? { "x-github-token": activeToken } : {})
        },
        body: JSON.stringify({ target: "categories" })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error en la sincronización.");
      }

      setMessage({ 
        type: "success", 
        text: `✓ ${data.message || "Subcategorías y orden sincronizados en GitHub exitosamente."}` 
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al sincronizar con GitHub." });
    } finally {
      setSyncing(false);
    }
  };

  const handlePushAllNow = async () => {
    setPushingAll(true);
    setMessage({ type: "info", text: "Subiendo todo el repositorio (código, 510 imágenes y artículos) a GitHub..." });

    try {
      const activeToken = token.trim() || localStorage.getItem("dragopedia_github_token") || "";
      const res = await fetch("/api/github-push-all", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(activeToken ? { "x-github-token": activeToken } : {})
        },
        body: JSON.stringify({ token: activeToken })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Error al subir todo a GitHub.");
      }

      setMessage({ 
        type: "success", 
        text: `✓ ${data.message || "¡Todo el repositorio fue subido a GitHub exitosamente!"}` 
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al subir a GitHub." });
    } finally {
      setPushingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="relative bg-card border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-foreground tracking-wide flex items-center gap-2">
                Conexión con GitHub
                {isConfigured && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Conectado
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Guarda automáticamente al crear, reordenar o asignar subcategorías.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Verificando estado de sincronización...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Repositorio y Rama */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FolderGit2 className="h-3 w-3 text-primary" />
                    Repositorio GitHub
                  </label>
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="usuario/repositorio"
                    className="w-full bg-secondary/50 border border-border/70 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary/60"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Rama
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-secondary/50 border border-border/70 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary/60"
                    required
                  />
                </div>
              </div>

              {/* Token Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Key className="h-3 w-3 text-amber-400" />
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Dragopedia%20Cdd-wiki-V3%20Sync"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    Crear token en GitHub <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={isConfigured ? "•••••••••••••••••••••••••••••••• (Configurado)" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                  className="w-full bg-secondary/50 border border-border/70 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary/60"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Requiere permiso <span className="text-amber-400 font-mono">repo</span> (o <span className="text-amber-400 font-mono">Contents: Read and write</span>) para poder hacer commits de subcategorías y artículos en <span className="font-semibold text-foreground">{repo}</span>.
                </p>
              </div>

              {/* Message Banner */}
              {message && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
                  message.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : message.type === "error"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-300"
                }`}>
                  {message.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />}
                  {message.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />}
                  {message.type === "info" && <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin text-sky-400" />}
                  <span className="text-xs">{message.text}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={saving || syncing}
                  className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Verificando y Guardando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{isConfigured ? "Actualizar Conexión" : "Conectar con GitHub"}</span>
                    </>
                  )}
                </button>

                {isConfigured && (
                  <>
                    <button
                      type="button"
                      onClick={handlePushAllNow}
                      disabled={saving || syncing || pushingAll}
                      className="py-2.5 px-4 bg-purple-600/25 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 hover:border-purple-500/60 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                      title="Sube todo el código fuente, las 510 imágenes descargadas y los artículos actualizados a GitHub"
                    >
                      {pushingAll ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                          <span>Subiendo Repositorio...</span>
                        </>
                      ) : (
                        <>
                          <FolderGit2 className="h-3.5 w-3.5 text-purple-400" />
                          <span>Subir Todo (510 Imágenes y Código)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={saving || syncing || pushingAll}
                      className="py-2.5 px-4 bg-secondary/80 hover:bg-secondary text-foreground font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-border/70 disabled:opacity-50"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Sincronizando...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
                          <span>Sincronizar Artículos</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-border/40 bg-secondary/15 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3 text-sky-400" />
            Auto-guardado activo en reorden, creación y asignación.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:underline font-medium"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
