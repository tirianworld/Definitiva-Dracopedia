import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, BookOpen, FilePlus, Loader2, Minimize2, Maximize2, Edit2, Paperclip, FileText, Check, History, Plus, MessageSquare, Trash2, ArrowLeft, ExternalLink, Menu, Orbit, Sparkles, Compass } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { TarotLogo, TarotAISeal } from "./TarotLogo";
import { renderTarotContent, extractCleanChatMessage } from "../utils/tarotFormatter";
import { useCategories } from "../context/CategoryContext";

interface SuggestedAction {
  type: "create_article" | "view_article" | "view_dm" | "view_graph";
  title: string;
  payload?: {
    title?: string;
    category?: string;
    content?: string;
    summary?: string;
    slug?: string;
    path?: string;
    graphType?: "cosmos" | "magias" | "hub";
    star?: string;
    pillar?: string;
  };
}

interface ExecutionResult {
  success: boolean;
  action: string;
  details: string;
  modifiedSlugs?: string[];
}

interface PendingEdit {
  isNew: boolean;
  isDelete?: boolean;
  isBatch?: boolean;
  action?: string;
  instructions?: string;
  targetSlugs?: string[];
  slug?: string;
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
  changeInstructions?: string;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  suggestedAction?: SuggestedAction | null;
  executionResult?: ExecutionResult | null;
  attachedFileName?: string;
}

interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  history: ChatMessage[];
}

function TarotChatbotInner({ standalone = false }: { standalone?: boolean }) {
  const [internalIsOpen, setInternalIsOpen] = useState(standalone ? true : false);
  const isOpen = standalone || internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (!standalone) {
      setInternalIsOpen(val);
    }
  };
  const { mergedCategories } = useCategories();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Threads / sessions managed in browser local cache
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const cached = localStorage.getItem("tarot_chats_history");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((t: any, i: number) => ({
            id: t?.id || `thread-${i}-${Date.now()}`,
            title: t?.title || `Consulta #${i + 1}`,
            createdAt: typeof t?.createdAt === "number" ? t.createdAt : Date.now(),
            history: Array.isArray(t?.history)
              ? t.history
                  .map((m: any) => ({
                    ...m,
                    text: m?.text || m?.message || m?.response || ""
                  }))
                  .filter((m: any) => m && typeof m.text === "string" && m.text.trim())
              : []
          })).filter(t => t.history.length > 0);

          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch (e) {
      console.error("Error reading cached threads:", e);
    }
    return [{
      id: "default-thread",
      title: "Consulta Inicial",
      createdAt: Date.now(),
      history: [
        {
          role: "model",
          text: "<p>Mi nombre es Tarot, gran bibliotecario de la Gran Biblioteca de Kaliria. Pues tengo todas las respuestas, pero también todas las preguntas. Por ello todo el que desea conocer ha de saber primero.</p><p>Pues bien ¿Qué deseas conocer?</p>"
        }
      ]
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    try {
      const cachedActiveId = localStorage.getItem("tarot_active_thread_id");
      return cachedActiveId || "default-thread";
    } catch {
      return "default-thread";
    }
  });

  const [isThreadsOpen, setIsThreadsOpen] = useState(false);
  const [inlineGraphTarget, setInlineGraphTarget] = useState<{
    isOpen: boolean;
    graphType: "cosmos" | "magias" | "hub";
    star?: string;
    pillar?: string;
  } | null>(null);

  // Sync threads to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem("tarot_chats_history", JSON.stringify(threads));
    } catch (e) {
      console.warn("Could not save tarot_chats_history:", e);
    }
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem("tarot_active_thread_id", activeThreadId);
    } catch (e) {
      console.warn("Could not save tarot_active_thread_id:", e);
    }
  }, [activeThreadId]);

  // Derived state: current active thread and its history
  const activeThread = (threads && threads.find(t => t && t.id === activeThreadId)) || threads?.[0] || { 
    id: "default-thread",
    title: "Consulta Inicial",
    createdAt: Date.now(),
    history: [] 
  };
  const history = Array.isArray(activeThread?.history) ? activeThread.history : [];

  // Custom setter for active thread history
  const setHistory = (newHistoryOrFunc: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setThreads(prevThreads => {
      const list = Array.isArray(prevThreads) ? prevThreads : [];
      return list.map(t => {
        if (t && t.id === activeThreadId) {
          const currentH = Array.isArray(t.history) ? t.history : [];
          const nextHistory = typeof newHistoryOrFunc === "function" ? newHistoryOrFunc(currentH) : newHistoryOrFunc;
          
          let nextTitle = t.title;
          if (t.title === "Consulta Inicial" || t.title.startsWith("Nueva consulta")) {
            const firstUserMsg = Array.isArray(nextHistory) ? nextHistory.find(m => m && m.role === "user") : undefined;
            if (firstUserMsg && typeof firstUserMsg.text === "string") {
              const maxLen = 22;
              nextTitle = firstUserMsg.text.length > maxLen 
                ? firstUserMsg.text.slice(0, maxLen) + "..." 
                : firstUserMsg.text;
            }
          }

          return {
            ...t,
            title: nextTitle,
            history: Array.isArray(nextHistory) ? nextHistory : []
          };
        }
        return t;
      });
    });
  };

  // New features states
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Multimodal file attachment
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    mimeType: string;
    base64Data: string;
    dataUrl?: string; // used for images preview
    size: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edición directa pendiente de confirmación mediante contraseña de administrador
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingEdit | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading, isOpen, isFullscreen]);

  // Listener for opening Tarot chat with an article focus
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{
        articleTitle: string;
        articleSlug: string;
        actionText?: string;
      }>;
      const { articleTitle, articleSlug, actionText } = customEvent.detail || {};
      if (!articleTitle) {
        setIsOpen(true);
        if (actionText) {
          setMessage(actionText);
        }
        return;
      }

      setIsOpen(true);
      
      const newId = `edit-thread-${articleSlug}-${Date.now()}`;
      const prefilledPrompt = actionText || `Quiero editar el artículo "${articleTitle}" (slug: ${articleSlug}). ¿Podrías sugerirme mejoras o cambios basados en la información real?`;
      
      const newThread: ChatThread = {
        id: newId,
        title: `Editar: ${articleTitle.slice(0, 15)}...`,
        createdAt: Date.now(),
        history: [
          {
            role: "model",
            text: `<p>He cargado el tomo sagrado de <strong>${articleTitle}</strong>. He preparado mi pluma de fénix y el tintero místico para ayudarte a editar este manuscrito con total fidelidad a las fuentes.</p><p>Dime, ¿qué aspectos de este códice deseas alterar, complementar o reescribir? (Por ejemplo: <em>"Añade un párrafo sobre su origen"</em> o <em>"Reescribe el resumen de forma más poética"</em>).</p>`
          }
        ]
      };
      
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newId);
      setIsThreadsOpen(false);
      setMessage(prefilledPrompt);
    };

    window.addEventListener("open-tarot-chat", handleOpenChat);
    return () => window.removeEventListener("open-tarot-chat", handleOpenChat);
  }, []);

  const getSerializableCategories = () => {
    return (mergedCategories || []).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      color: c.color,
      parentId: c.parentId || null,
      parentSlug: c.parentSlug || null
    }));
  };

  // Handlers for managing multiple sessions
  const handleCreateNewThread = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: `Nueva consulta #${threads.length + 1}`,
      createdAt: Date.now(),
      history: [
        {
          role: "model",
          text: "<p>Mi nombre es Tarot, gran bibliotecario de la Gran Biblioteca de Kaliria. Pues tengo todas las respuestas, pero también todas las preguntas. Por ello todo el que desea conocer ha de saber primero.</p><p>Pues bien ¿Qué deseas conocer?</p>"
        }
      ]
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
    setIsThreadsOpen(false);
    setMessage("");
    setAttachedFile(null);
    setPendingConfirmation(null);
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (threads.length === 1) {
      setThreads([{
        id: "default-thread",
        title: "Consulta Inicial",
        createdAt: Date.now(),
        history: [
          {
            role: "model",
            text: "<p>Mi nombre es Tarot, gran bibliotecario de la Gran Biblioteca de Kaliria. Pues tengo todas las respuestas, pero también todas las preguntas. Por ello todo el que desea conocer ha de saber primero.</p><p>Pues bien ¿Qué deseas conocer?</p>"
          }
        ]
      }]);
      setActiveThreadId("default-thread");
      return;
    }

    const nextThreads = threads.filter(t => t.id !== threadId);
    setThreads(nextThreads);

    if (activeThreadId === threadId) {
      const activeIdx = threads.findIndex(t => t.id === threadId);
      const nextActiveThread = threads[activeIdx === 0 ? 1 : activeIdx - 1];
      setActiveThreadId(nextActiveThread ? nextActiveThread.id : nextThreads[0].id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { // raised limit to 4MB for PDFs, images, docs
      alert("El archivo es demasiado pesado (máximo 4MB para análisis místico).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Parts = dataUrl.split(",");
      const base64Data = base64Parts[1] || "";
      
      setAttachedFile({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        base64Data: base64Data,
        dataUrl: file.type.startsWith("image/") ? dataUrl : undefined,
        size: file.size
      });
    };
    reader.onerror = () => {
      alert("No se pudo leer el archivo celestial.");
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditSubmit = async (idx: number) => {
    if (!editingText.trim() || isLoading) return;

    const updatedText = editingText.trim();
    setEditingIdx(null);

    // Truncate history at this point and recreate user message
    const truncatedHistory = history.slice(0, idx);
    setHistory([...truncatedHistory, { role: "user", text: updatedText }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: updatedText,
          history: truncatedHistory.slice(-10), // Context of previous messages
          clientCategories: getSerializableCategories()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawExtracted =
          (typeof data?.message === "string" && data.message.trim())
            ? data.message
            : (typeof data?.respuesta === "string" && data.respuesta.trim())
              ? data.respuesta
              : (typeof data?.mensaje === "string" && data.mensaje.trim())
                ? data.mensaje
                : (typeof data?.response === "string" && data.response.trim())
                  ? data.response
                  : (typeof data?.text === "string" && data.text.trim())
                    ? data.text
                    : (typeof data?.answer === "string" && data.answer.trim())
                      ? data.answer
                      : (typeof data?.content === "string" && data.content.trim())
                        ? data.content
                        : (typeof data === "string" ? data : "<p>Tarot no ha devuelto un texto legible.</p>");

        const extractedText = extractCleanChatMessage(rawExtracted);

        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            text: extractedText,
            suggestedAction: data.suggestedAction || null,
            executionResult: data.executionResult || null
          }
        ]);

        if (data.executionResult && data.executionResult.success) {
          window.dispatchEvent(new Event("wiki-articles-updated"));
        }
      } else {
        let serverError = "Error en la conexión con el servidor.";
        try {
          const errData = await response.json();
          if (errData && (errData.error || errData.message)) {
            serverError = errData.error || errData.message;
          }
        } catch {
          // ignore
        }
        throw new Error(serverError);
      }
    } catch (error: any) {
      console.error("Tarot Chatbot Edit Error:", error);
      setHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: `<p className="text-red-400 font-medium">Error al consultar los archivos de Tarot:</p><p className="text-xs text-foreground/80 mt-1">${error.message || "Error al conectar con el servidor. Inténtalo de nuevo."}</p>`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPendingEdit = async (pending: PendingEdit) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/confirm-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "OKI",
          confirmed: true,
          pendingEdit: pending
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPendingConfirmation(null);
        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            text: `<p class="text-primary font-medium">✨ Modificación aplicada con éxito en la enciclopedia real.</p>`,
            executionResult: data.executionResult || {
              success: true,
              action: pending.isBatch ? "batch_modify_articles" : pending.isNew ? "chat_direct_edit_create" : pending.isDelete ? "chat_direct_edit_delete" : "chat_direct_edit_update",
              details: pending.isBatch
                ? "Se han modificado múltiples tomos en lote según tus instrucciones."
                : `El tomo **${pending.title || pending.slug}** ha sido actualizado directamente en los registros reales de la Dragopedia.`,
              modifiedSlugs: pending.targetSlugs || [pending.slug || ""]
            }
          }
        ]);
        window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
        window.dispatchEvent(new CustomEvent("genealogy-tree-updated"));
      } else {
        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            text: `<p class="text-red-400 font-medium">Error al aplicar la modificación:</p><p class="text-xs text-muted-foreground mt-1">${data.error || "Error interno al aplicar el cambio."}</p>`
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setHistory((prev) => [
        ...prev,
        { role: "model", text: `<p class="text-red-400">Error de conexión al aplicar el cambio.</p>` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPendingEdit = () => {
    setPendingConfirmation(null);
    setHistory((prev) => [
      ...prev,
      { role: "model", text: "<p>Petición cancelada. El tomo permanece sin modificar.</p>" }
    ]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!message.trim() && !attachedFile) || isLoading) return;

    const userMessage = message.trim();
    const currentAttachment = attachedFile;

    setMessage("");
    setAttachedFile(null);

    // Si hay una edición directa pendiente de confirmación, este mensaje se
    // interpreta como la confirmación/contraseña.
    if (pendingConfirmation) {
      setHistory((prev) => [...prev, { role: "user", text: userMessage }]);

      if (userMessage.trim().toUpperCase() === "CANCELAR") {
        handleCancelPendingEdit();
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/ai/confirm-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: userMessage,
            confirmed: true,
            pendingEdit: pendingConfirmation
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setPendingConfirmation(null);
          setHistory((prev) => [
            ...prev,
            {
              role: "model",
              text: "<p class=\"text-primary font-medium\">✨ Modificación aplicada con éxito en la enciclopedia real.</p>",
              executionResult: data.executionResult || null
            }
          ]);
          window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
          window.dispatchEvent(new CustomEvent("genealogy-tree-updated"));
        } else {
          setHistory((prev) => [
            ...prev,
            {
              role: "model",
              text: `<p class="text-red-400 font-medium">Error al aplicar la modificación:</p><p class="text-xs text-muted-foreground mt-1">${data.error || "No se pudo aplicar el cambio."}</p>`
            }
          ]);
        }
      } catch (error: any) {
        console.error(error);
        setHistory((prev) => [
          ...prev,
          { role: "model", text: `<p class="text-red-400">Error al conectar con el servidor. Inténtalo de nuevo.</p>` }
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Append user message with potential attachment name
    setHistory((prev) => [
      ...prev, 
      { 
        role: "user", 
        text: userMessage || `He adjuntado el pergamino "${currentAttachment?.name}" para tu análisis místico.`,
        attachedFileName: currentAttachment?.name 
      }
    ]);
    setIsLoading(true);

    try {
      const payloadAttachment = currentAttachment ? {
        name: currentAttachment.name,
        mimeType: currentAttachment.mimeType,
        base64Data: currentAttachment.base64Data
      } : null;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: history.slice(-10), // Limit history context
          attachment: payloadAttachment,
          clientCategories: getSerializableCategories()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawExtracted =
          (typeof data?.message === "string" && data.message.trim())
            ? data.message
            : (typeof data?.respuesta === "string" && data.respuesta.trim())
              ? data.respuesta
              : (typeof data?.mensaje === "string" && data.mensaje.trim())
                ? data.mensaje
                : (typeof data?.response === "string" && data.response.trim())
                  ? data.response
                  : (typeof data?.text === "string" && data.text.trim())
                    ? data.text
                    : (typeof data?.answer === "string" && data.answer.trim())
                      ? data.answer
                      : (typeof data?.content === "string" && data.content.trim())
                        ? data.content
                        : (typeof data === "string" ? data : "<p>Tarot no ha devuelto un texto legible.</p>");

        const extractedText = extractCleanChatMessage(rawExtracted);

        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            text: extractedText,
            suggestedAction: data.suggestedAction || null,
            executionResult: data.executionResult || null
          }
        ]);

        if (data.pendingEdit) {
          // Registramos el cambio propuesto; queda a la espera de la contraseña
          setPendingConfirmation(data.pendingEdit);
        }

        if (data.executionResult && data.executionResult.success) {
          // Trigger instant refresh of components
          window.dispatchEvent(new Event("wiki-articles-updated"));
        }
      } else {
        let serverError = "Error en la conexión con el servidor.";
        try {
          const errData = await response.json();
          if (errData && (errData.error || errData.message)) {
            serverError = errData.error || errData.message;
          }
        } catch {
          // ignore
        }
        throw new Error(serverError);
      }
    } catch (error: any) {
      console.error("Tarot Chatbot Send Error:", error);
      setHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: `<p className="text-red-400 font-medium">Error al consultar los archivos de Tarot:</p><p className="text-xs text-foreground/80 mt-1">${error.message || "Error al conectar con el servidor. Inténtalo de nuevo."}</p>`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Intercept anchor clicks inside rendered HTML
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("/")) {
        e.preventDefault();
        navigate(href);
        setIsOpen(false); // Close chatbot upon clicking internal links
      }
    }
  };

  // Perform Suggested Actions
  const handleActionClick = (action?: SuggestedAction | null) => {
    if (!action) return;
    const payload = action.payload || {};
    if (action.type === "create_article") {
      navigate("/nuevo", { state: { draft: payload } });
      setIsOpen(false);
    } else if (action.type === "view_article" && payload.slug) {
      navigate(`/articulo/${payload.slug}`);
      setIsOpen(false);
    } else if (action.type === "view_graph") {
      setInlineGraphTarget({
        isOpen: true,
        graphType: (payload.graphType as any) || "cosmos",
        star: payload.star,
        pillar: payload.pillar
      });
    }
  };

  const renderInlineGraphModal = () => {
    if (!inlineGraphTarget?.isOpen) return null;
    const { graphType, star, pillar } = inlineGraphTarget;
    const iframeSrc = `/grafos?tab=${graphType}${star ? `&star=${encodeURIComponent(star)}` : ""}${pillar ? `&pillar=${encodeURIComponent(pillar)}` : ""}`;

    return (
      <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-6xl h-[90vh] bg-[#06080e] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="px-4 py-3 bg-[#0c1222] border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Orbit className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  <span>{graphType === "magias" ? "Magias Primordiales: Los 6 Polos" : "Grafo del Cosmos: Cartografía Celeste"}</span>
                  {star && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono">
                      Astro: {star}
                    </span>
                  )}
                  {pillar && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 font-mono">
                      Polo: {pillar}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                  Exploración interactiva en tiempo real enlazada con Tarot AI
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-black/50 p-1 rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setInlineGraphTarget(prev => prev ? { ...prev, graphType: "cosmos" } : null)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    graphType === "cosmos"
                      ? "bg-cyan-500 text-black font-semibold shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cosmos
                </button>
                <button
                  type="button"
                  onClick={() => setInlineGraphTarget(prev => prev ? { ...prev, graphType: "magias" } : null)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    graphType === "magias"
                      ? "bg-purple-600 text-white font-semibold shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Magias
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate(iframeSrc);
                  setInlineGraphTarget(null);
                }}
                className="p-2 rounded-xl border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground bg-secondary/40 transition-colors cursor-pointer"
                title="Abrir a pantalla completa en la wiki"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setInlineGraphTarget(null)}
                className="p-2 rounded-xl border border-border/80 hover:border-red-500/50 text-muted-foreground hover:text-red-400 bg-secondary/40 transition-colors cursor-pointer"
                title="Cerrar y volver a la conversación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Iframe */}
          <div className="flex-1 w-full h-full relative bg-[#06080e]">
            <iframe
              src={iframeSrc}
              title="Grafo Interactivo en Tarot Chatbot"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderInnerContent = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between bg-secondary/30 relative shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center bg-primary/5 animate-pulse-slow">
                <TarotAISeal className="w-8 h-8" />
              </div>
              {/* Flashing Online Jewel */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card animate-ping" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xs text-foreground flex items-center gap-1">
                Tarot AI
                <TarotLogo className="w-3 h-3 text-primary animate-pulse" />
              </h3>
              <p className="text-[10px] text-muted-foreground">Gran Bibliotecario de Kaliria</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {standalone && (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/50 transition-colors flex items-center gap-1.5 mr-2"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Volver a la Dragopedia</span>
              </button>
            )}


            {/* History Threads Toggle Button */}
            <button
              type="button"
              onClick={() => setIsThreadsOpen(!isThreadsOpen)}
              className={`p-1.5 rounded-md border transition-all ${
                isThreadsOpen 
                  ? "text-primary bg-primary/10 border-primary/30 shadow-sm" 
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/60"
              }`}
              title="Historial de consultas (Caché)"
            >
              <History className="w-4 h-4" />
            </button>

            {!standalone && (
              <>
                {/* External Standalone Chat Page Button */}
                <button
                  type="button"
                  onClick={() => {
                    navigate("/tarot-chat");
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title="Abrir en pantalla completa dedicada"
                >
                  <ExternalLink className="w-4.5 h-4.5" />
                </button>

                {/* Fullscreen Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title={isFullscreen ? "Restaurar tamaño" : "Pantalla completa"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title="Minimizar archivero"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar de Chats/Hilos */}
        <AnimatePresence>
          {isThreadsOpen && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsThreadsOpen(false)}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30"
              />
              {/* Sliding Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute left-0 top-[53px] bottom-0 w-64 bg-secondary/95 border-r border-primary/20 z-40 flex flex-col shadow-2xl backdrop-blur-md"
              >
                {/* Sidebar Header */}
                <div className="p-3 border-b border-border flex items-center justify-between bg-card/50">
                  <h4 className="font-heading font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Historial de Consultas
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsThreadsOpen(false)}
                    className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3">
                  <button
                    type="button"
                    onClick={handleCreateNewThread}
                    className="w-full py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                    Nueva Consulta
                  </button>
                </div>

                {/* Threads List */}
                <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1.5 scrollbar-thin">
                  {threads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          setActiveThreadId(thread.id);
                          setIsThreadsOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isActive
                            ? "bg-primary/15 border-primary/35 text-foreground shadow-sm"
                            : "bg-card/40 border-border/50 hover:bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                          <span className="text-xs truncate font-medium">{thread.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteThread(thread.id, e)}
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Borrar consulta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" onClick={handleContentClick}>
          {history.map((msg, idx) => {
            const isModel = msg.role === "model";
            return (
              <div
                key={idx}
                className={`flex flex-col ${isModel ? "items-start" : "items-end"}`}
              >
                {/* Role Label & Edit Button */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {isModel ? "Tarot AI" : "Tú"}
                  </span>
                  {!isModel && editingIdx !== idx && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIdx(idx);
                        setEditingText(msg.text);
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded cursor-pointer"
                      title="Editar consulta"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Message Bubble or Inline Editor */}
                {!isModel && editingIdx === idx ? (
                  <div className="w-full max-w-[85%] bg-secondary/50 border border-primary/25 rounded-2xl p-2.5 space-y-2 mt-1 rounded-tr-none text-left">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full text-xs bg-background border border-border focus:border-primary/45 rounded-xl p-2 outline-none text-foreground resize-none min-h-[60px]"
                      rows={3}
                      disabled={isLoading}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingIdx(null)}
                        className="px-2 py-1 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancelar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditSubmit(idx)}
                        disabled={!editingText.trim() || isLoading}
                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-[10px] hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Reenviar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed transition-all ${
                      isModel
                        ? "bg-secondary/40 border border-primary/10 text-foreground rounded-tl-none select-text markdown-body"
                        : "bg-primary/15 border border-primary/25 text-foreground rounded-tr-none select-text text-left"
                    }`}
                  >
                    {isModel ? (
                      <div 
                        className="space-y-2 prose prose-invert prose-xs max-w-none [&>p]:leading-relaxed [&>p]:mb-2 [&_a]:text-primary [&_a]:underline [&_a]:font-medium"
                        dangerouslySetInnerHTML={{ __html: renderTarotContent(msg.text || "") }} 
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.attachedFileName && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-[9.5px] font-mono text-primary border border-primary/20 max-w-full">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{msg.attachedFileName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Suggestion Card */}
                {isModel && msg.suggestedAction && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleActionClick(msg.suggestedAction)}
                    className="mt-2 text-left p-3.5 max-w-[85%] rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/30 shadow-sm flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    {msg.suggestedAction.type === "view_graph" ? (
                      <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 group-hover:bg-cyan-500/30 transition-colors shrink-0">
                        <Orbit className="w-4 h-4 text-cyan-400" />
                      </div>
                    ) : msg.suggestedAction.type === "create_article" ? (
                      <div className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/30 group-hover:bg-primary/30 transition-colors shrink-0">
                        <FilePlus className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-secondary/50 text-foreground/80 border border-border shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                        {msg.suggestedAction.type === "view_graph" ? "Exploración en el Grafo" : "Acción recomendada"}
                      </p>
                      <h4 className="text-xs font-semibold text-foreground mt-0.5 truncate group-hover:text-primary transition-colors">
                        {msg.suggestedAction.title || "Ver elemento"}
                      </h4>
                      {msg.suggestedAction.payload?.star && (
                        <p className="text-[10px] text-cyan-300 mt-0.5 truncate">
                          Astro estelar: {msg.suggestedAction.payload.star}
                        </p>
                      )}
                      {msg.suggestedAction.payload?.pillar && (
                        <p className="text-[10px] text-purple-300 mt-0.5 truncate">
                          Polo Primordial: {msg.suggestedAction.payload.pillar}
                        </p>
                      )}
                      {msg.suggestedAction.payload?.title && !msg.suggestedAction.payload?.star && !msg.suggestedAction.payload?.pillar && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          Título: {msg.suggestedAction.payload.title} • {msg.suggestedAction.payload.category || "General"}
                        </p>
                      )}
                    </div>
                  </motion.button>
                )}

                {/* Execution Result Log Box */}
                {isModel && msg.executionResult && (
                  <div className="mt-2 text-left p-3.5 max-w-[85%] rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/25 shadow-sm space-y-2 transition-all">
                    <div className="flex items-center gap-1.5 text-primary">
                      <TarotLogo className="w-3.5 h-3.5 animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Modificación de Archivo Completada</p>
                    </div>
                    <div className="text-[11px] text-foreground/90 space-y-1">
                      <div 
                        className="prose prose-invert prose-xs leading-relaxed max-w-none text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary" 
                        dangerouslySetInnerHTML={{ __html: renderTarotContent(msg.executionResult.details || "") }} 
                      />
                    </div>
                    {msg.executionResult.modifiedSlugs && msg.executionResult.modifiedSlugs.length > 0 && (
                      <div className="pt-2 border-t border-primary/15">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">Tomos Modificados:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.executionResult.modifiedSlugs.map((slug) => (
                            <button
                              key={slug}
                              onClick={() => {
                                navigate(`/articulo/${slug}`);
                                if (!standalone) setIsOpen(false);
                              }}
                              className="px-2 py-1 rounded-md text-[10px] bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/40 text-primary transition-all cursor-pointer font-medium"
                            >
                              {slug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Loader Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start animate-fadeIn">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 px-1">Tarot AI</span>
              <div className="bg-secondary/30 border border-primary/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2.5 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span>Consultando los viejos pergaminos...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Attached File Preview Chip */}
        {attachedFile && (
          <div className="mx-3 my-1 p-2 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-[11px] text-muted-foreground animate-fadeIn gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {attachedFile.dataUrl ? (
                <img 
                  src={attachedFile.dataUrl} 
                  alt="Vista previa" 
                  className="w-8 h-8 rounded-lg object-cover border border-primary/30 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-foreground text-[10px]">{attachedFile.name}</span>
                <span className="text-[9px] text-muted-foreground">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              title="Eliminar adjunto"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Pending Edit Action Card */}
        {pendingConfirmation && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-primary/10 border border-primary/40 shadow-sm flex flex-col gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {pendingConfirmation.isBatch
                    ? "Modificación masiva en lote"
                    : pendingConfirmation.isNew
                    ? "Nuevo tomo preparado"
                    : pendingConfirmation.isDelete
                    ? "Confirmar borrado de tomo"
                    : "Modificación lista para el tomo real"}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 max-w-[140px] truncate">
                {pendingConfirmation.isBatch
                  ? (pendingConfirmation.category ? `Cat: ${pendingConfirmation.category}` : pendingConfirmation.targetSlugs?.length ? `${pendingConfirmation.targetSlugs.length} tomos` : "Múltiples tomos")
                  : (pendingConfirmation.slug || pendingConfirmation.title)}
              </span>
            </div>
            <p className="text-xs text-foreground/90 line-clamp-2">
              {pendingConfirmation.instructions || pendingConfirmation.changeInstructions || pendingConfirmation.summary || pendingConfirmation.title || "Aplicar cambios directamente sobre los artículos oficiales."}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleConfirmPendingEdit(pendingConfirmation)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {pendingConfirmation.isBatch
                    ? "Aplicar edición masiva"
                    : pendingConfirmation.isDelete
                    ? "Confirmar eliminación"
                    : "Aplicar al artículo real"}
                </span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCancelPendingEdit}
                className="py-1.5 px-3 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Descartar</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Footer Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-border/60 bg-secondary/10 flex items-center gap-2 relative shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.js,.ts,.html,.css,.xml,.yaml,.yml"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-border/80 hover:border-primary/45 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
            title="Adjuntar manuscrito (Imagen, PDF, Word, Texto...)"
            disabled={isLoading}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              pendingConfirmation
                ? "Escribe 'confirmar' (o 'cancelar')..."
                : "Pregunta a Tarot, o pídele editar un tomo..."
            }
            className={`flex-1 text-xs bg-background border rounded-xl px-3 py-2.5 outline-none text-foreground placeholder:text-muted-foreground/60 transition-colors ${
              pendingConfirmation ? "border-primary/60 focus:border-primary" : "border-border/80 focus:border-primary/45"
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={(!message.trim() && !attachedFile) || isLoading}
            className="p-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
            title="Enviar consulta"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    );
  };

  const renderStandaloneSidebar = (isMobile = false) => {
    return (
      <div className="flex flex-col h-full min-h-0 relative">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/40 flex items-center gap-2.5 bg-[#101216]">
          <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5">
            <TarotAISeal className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-xs text-foreground flex items-center gap-1">
              Kaliria Tarot AI
              <TarotLogo className="w-3 h-3 text-primary" />
            </h4>
            <p className="text-[10px] text-muted-foreground font-mono">Archivos Históricos</p>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              handleCreateNewThread();
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-xs font-semibold text-primary flex items-center justify-center gap-2 transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            Nueva Consulta
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 scrollbar-thin">
          {threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/25 text-foreground shadow-sm"
                    : "bg-transparent border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs truncate font-medium">{thread.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteThread(thread.id, e)}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                  title="Borrar consulta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer Operations */}
        <div className="p-3 border-t border-border/40 bg-[#101216] space-y-1.5">
          <button
            type="button"
            onClick={() => {
              navigate("/tarot-ai");
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-secondary/40 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <TarotLogo className="w-4 h-4 text-primary animate-pulse" />
            <span>Analizador de Tarot</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate("/");
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-secondary/40 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            <span>Volver a la Dragopedia</span>
          </button>
        </div>
      </div>
    );
  };

  if (standalone) {
    return (
      <div id="tarot-standalone" className="w-full h-screen bg-[#0B0D11] text-foreground flex overflow-hidden font-sans relative">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,169,110,0.03),transparent_70%)] pointer-events-none" />
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-72 bg-[#101216] border-r border-border/40 flex-col h-full shrink-0 relative z-20">
          {renderStandaloneSidebar()}
        </div>

        {/* Mobile Sidebar (Drawer overlay) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              />
              {/* Sliding Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 bottom-0 left-0 w-72 bg-[#101216] border-r border-border/40 z-50 flex flex-col h-full md:hidden shadow-2xl"
              >
                {renderStandaloneSidebar(true)}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 relative bg-[#0B0D11] z-10">
          {/* Header */}
          <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-[#101216]/50 shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg border border-border/40 hover:bg-[#101216]/80 text-muted-foreground hover:text-foreground md:hidden transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5">
                    <TarotAISeal className="w-6 h-6" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0B0D11]" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-xs text-foreground flex items-center gap-1">
                    Tarot AI
                    <TarotLogo className="w-3 h-3 text-primary animate-pulse" />
                  </h3>
                  <p className="text-[9px] text-muted-foreground font-mono">Bibliotecario de Kaliria</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInlineGraphTarget({ isOpen: true, graphType: "cosmos" })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Ver Grafos Cósmicos y de Magias Primordiales"
              >
                <Orbit className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Ver Grafos</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#101216] border border-border/40 hover:bg-secondary text-foreground transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver a la Dragopedia</span>
              </button>
            </div>
          </div>

          {/* Chat Messages / Workspace */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-0 relative scrollbar-thin">
            {/* If only welcome message, show landing style */}
            {history.length <= 1 ? (
              <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center py-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center text-center space-y-4 px-4"
                >
                  <div className="w-20 h-20 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 shadow-[0_0_30px_rgba(200,169,110,0.15)] animate-pulse-slow">
                    <TarotAISeal className="w-16 h-16" />
                  </div>
                  <div>
                    <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight">Tarot AI</h1>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                      El Gran Bibliotecario de la Dragopedia de Kaliria está a tu disposición para desvelar mitos, organizar conocimientos y registrar códices místicas.
                    </p>
                  </div>

                  {/* Sugerencias Rápidas de Lore y Taxonomía */}
                  <div className="pt-2 flex flex-wrap gap-2 justify-center max-w-xl">
                    {[
                      "¿Quiénes son Caldo de Dragón en Aeros?",
                      "¿A qué categoría y subcategoría pertenece Caldo de Dragón C1?",
                      "¿Quiénes son los héroes de Aeros antes de reencarnar?",
                      "¿Qué subcategorías componen a los Jugadores?"
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        onClick={() => {
                          setMessage(promptText);
                        }}
                        className="text-[11px] px-3 py-1.5 rounded-full bg-card/80 border border-border/70 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm text-left"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {history.map((msg, idx) => {
                  const isModel = msg.role === "model";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isModel ? "items-start" : "items-end"} w-full animate-fadeIn`}
                    >
                      {/* Role label & edit button */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                          {isModel ? "Tarot AI" : "Tú"}
                        </span>
                        {!isModel && editingIdx !== idx && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditingText(msg.text);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded cursor-pointer"
                            title="Editar consulta"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Content Bubble */}
                      {!isModel && editingIdx === idx ? (
                        <div className="w-full bg-[#101216] border border-primary/20 rounded-2xl p-3.5 space-y-2 text-left shadow-lg">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-xs bg-[#0B0D11] border border-border focus:border-primary/40 rounded-xl p-3 outline-none text-foreground resize-none min-h-[80px]"
                            rows={3}
                            disabled={isLoading}
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingIdx(null)}
                              className="px-2.5 py-1.5 rounded-xl border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancelar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSubmit(idx)}
                              disabled={!editingText.trim() || isLoading}
                              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[10px] hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Reenviar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-full rounded-2xl px-5 py-4 text-xs leading-relaxed transition-all shadow-sm ${
                            isModel
                              ? "bg-[#101216]/50 border border-border/30 text-foreground select-text markdown-body"
                              : "bg-primary/10 border border-primary/20 text-foreground select-text text-left ml-auto max-w-[85%]"
                          }`}
                        >
                          {isModel ? (
                            <div 
                              className="space-y-2.5 prose prose-invert prose-xs max-w-none [&>p]:leading-relaxed [&>p]:mb-2 [&_a]:text-primary [&_a]:underline [&_a]:font-medium"
                              dangerouslySetInnerHTML={{ __html: renderTarotContent(msg.text || "") }} 
                            />
                          ) : (
                            <div className="space-y-1.5">
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                              {msg.attachedFileName && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 text-[9.5px] font-mono text-primary border border-primary/20 max-w-full">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{msg.attachedFileName}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Suggestion Card */}
                      {isModel && msg.suggestedAction && (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleActionClick(msg.suggestedAction)}
                          className="mt-2 text-left p-3.5 w-full rounded-2xl bg-[#101216] border border-primary/20 shadow-sm flex items-start gap-3 transition-all cursor-pointer group"
                        >
                          {msg.suggestedAction.type === "view_graph" ? (
                            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 group-hover:bg-cyan-500/30 transition-colors shrink-0">
                              <Orbit className="w-4 h-4 text-cyan-400" />
                            </div>
                          ) : msg.suggestedAction.type === "create_article" ? (
                            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 group-hover:bg-primary/30 transition-colors shrink-0">
                              <FilePlus className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-secondary/50 text-foreground/80 border border-border shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                              {msg.suggestedAction.type === "view_graph" ? "Exploración en el Grafo" : "Acción recomendada"}
                            </p>
                            <h4 className="text-xs font-semibold text-foreground mt-0.5 truncate group-hover:text-primary transition-colors">
                              {msg.suggestedAction.title || "Ver elemento"}
                            </h4>
                            {msg.suggestedAction.payload?.star && (
                              <p className="text-[10px] text-cyan-300 mt-0.5 truncate">
                                Astro estelar: {msg.suggestedAction.payload.star}
                              </p>
                            )}
                            {msg.suggestedAction.payload?.pillar && (
                              <p className="text-[10px] text-purple-300 mt-0.5 truncate">
                                Polo Primordial: {msg.suggestedAction.payload.pillar}
                              </p>
                            )}
                            {msg.suggestedAction.payload?.title && !msg.suggestedAction.payload?.star && !msg.suggestedAction.payload?.pillar && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                Título: {msg.suggestedAction.payload.title} • {msg.suggestedAction.payload.category || "General"}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      )}

                      {/* Execution Result Log Box */}
                      {isModel && msg.executionResult && (
                        <div className="mt-2 text-left p-4 w-full rounded-2xl bg-primary/5 border border-primary/25 shadow-sm space-y-2 transition-all">
                          <div className="flex items-center gap-1.5 text-primary">
                            <TarotLogo className="w-3.5 h-3.5 animate-pulse" />
                            <p className="text-[10px] font-bold uppercase tracking-wider">Modificación de Archivo Completada</p>
                          </div>
                          <div className="text-[11px] text-foreground/90 space-y-1">
                            <div 
                              className="prose prose-invert prose-xs leading-relaxed max-w-none text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary" 
                              dangerouslySetInnerHTML={{ __html: renderTarotContent(msg.executionResult.details || "") }} 
                            />
                          </div>
                          {msg.executionResult.modifiedSlugs && msg.executionResult.modifiedSlugs.length > 0 && (
                            <div className="pt-2 border-t border-primary/15">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">Tomos Modificados:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.executionResult.modifiedSlugs.map((slug) => (
                                  <button
                                    key={slug}
                                    onClick={() => {
                                      navigate(`/articulo/${slug}`);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[10px] bg-[#101216] hover:bg-secondary border border-border hover:border-primary/40 text-primary transition-all cursor-pointer font-medium"
                                  >
                                    {slug}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Typing Loader Indicator */}
            {isLoading && (
              <div className="max-w-3xl mx-auto flex flex-col items-start animate-fadeIn">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 px-1 font-mono">Tarot AI</span>
                <div className="bg-[#101216]/50 border border-primary/10 rounded-2xl px-5 py-4 flex items-center gap-3 text-xs text-muted-foreground w-full">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span>Consultando los viejos pergaminos...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Bottom Form & File Preview Container */}
          <div className="p-4 bg-gradient-to-t from-[#0B0D11] via-[#0B0D11] to-transparent shrink-0">
            <div className="max-w-3xl mx-auto w-full space-y-3">
              {/* Attached File Preview Chip */}
              {attachedFile && (
                <div className="p-2.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between text-[11px] text-muted-foreground animate-fadeIn gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {attachedFile.dataUrl ? (
                      <img 
                        src={attachedFile.dataUrl} 
                        alt="Vista previa" 
                        className="w-9 h-9 rounded-xl object-cover border border-primary/30 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-foreground text-xs">{attachedFile.name}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                    title="Eliminar adjunto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending Edit Action Card */}
              {pendingConfirmation && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/40 shadow-lg flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-primary">
                      <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                      <span>
                        {pendingConfirmation.isBatch
                          ? "Modificación masiva en lote"
                          : pendingConfirmation.isNew
                          ? "Nuevo tomo preparado"
                          : pendingConfirmation.isDelete
                          ? "Confirmar borrado de tomo"
                          : "Modificación lista para el tomo real"}
                      </span>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 max-w-[200px] truncate">
                      {pendingConfirmation.isBatch
                        ? (pendingConfirmation.category ? `Cat: ${pendingConfirmation.category}` : pendingConfirmation.targetSlugs?.length ? `${pendingConfirmation.targetSlugs.length} tomos` : "Múltiples tomos")
                        : (pendingConfirmation.slug || pendingConfirmation.title)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {pendingConfirmation.instructions || pendingConfirmation.changeInstructions || pendingConfirmation.summary || pendingConfirmation.title || "Aplicar cambios directamente sobre los artículos oficiales."}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleConfirmPendingEdit(pendingConfirmation)}
                      className="flex-1 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {pendingConfirmation.isBatch
                          ? "Aplicar edición masiva"
                          : pendingConfirmation.isDelete
                          ? "Confirmar eliminación"
                          : "Aplicar al artículo real"}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleCancelPendingEdit}
                      className="py-2 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Descartar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input Floating Card */}
              <form onSubmit={handleSend} className="bg-[#101216] border border-border/50 focus-within:border-primary/40 rounded-3xl p-2 flex items-center gap-2.5 relative transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.js,.ts,.html,.css,.xml,.yaml,.yml"
                  className="hidden"
                />
                
                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                  title="Adjuntar manuscrito (Imagen, PDF, Word, Texto...)"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text Field */}
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    pendingConfirmation
                      ? "Escribe 'confirmar' (o 'cancelar')..."
                      : "Escribe tu consulta o pide editar un tomo real..."
                  }
                  className="flex-1 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/50 py-2"
                  disabled={isLoading}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!message.trim() && !attachedFile) || isLoading}
                  className="p-3 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                  title="Enviar consulta"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Disclaimer */}
              <p className="text-[10px] text-center text-muted-foreground/60 leading-relaxed max-w-xl mx-auto">
                Tarot AI puede cometer descuidos místicos. Los cambios directos al lore se aplican mediante contraseña de administrador.
              </p>
            </div>
          </div>
        </div>

        {renderInlineGraphModal()}
      </div>
    );
  }

  return (
    <>
      <div id="tarot-chatbot-widget" className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
        
        {/* Drawer Container */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-2xl bg-card border border-primary/20 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col backdrop-blur-lg bg-card/95 transition-all duration-300 ${
                isFullscreen 
                  ? "fixed inset-4 md:inset-10 w-auto h-auto max-w-none max-h-none mb-0 z-[60]" 
                  : "w-96 max-w-[calc(100vw-2.5rem)] h-[550px] max-h-[80vh] mb-4"
              }`}
            >
              {renderInnerContent()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launcher Button */}
        <motion.button
          id="tarot-launcher-button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg cursor-pointer ${
            isOpen
              ? "bg-secondary text-foreground border-border"
              : "bg-primary/15 hover:bg-primary/25 text-primary border-primary/40 hover:border-primary/60 shadow-[0_0_20px_rgba(200,169,110,0.25)]"
          }`}
          title="Consultar al Gran Bibliotecario Tarot"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-muted-foreground" />
          ) : (
            <div className="relative flex items-center justify-center w-11 h-11">
              <TarotAISeal className="w-10 h-10 animate-spin-slow hover:rotate-12 transition-transform duration-500" />
            </div>
          )}
        </motion.button>
      </div>

      {renderInlineGraphModal()}
    </>
  );
}

export function TarotChatbot(props: { standalone?: boolean }) {
  return (
    <ErrorBoundary
      fallbackTitle="El Oráculo Tarot ha sufrido una interrupción"
      onReset={() => {
        try {
          localStorage.removeItem("tarot_chats_history");
          localStorage.removeItem("tarot_active_thread_id");
        } catch (e) {
          console.warn(e);
        }
      }}
    >
      <TarotChatbotInner {...props} />
    </ErrorBoundary>
  );
}