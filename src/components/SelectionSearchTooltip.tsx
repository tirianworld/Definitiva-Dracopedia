import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SelectionPosition {
  x: number;
  y: number;
  selectedText: string;
}

export function SelectionSearchTooltip() {
  const [position, setPosition] = useState<SelectionPosition | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setPosition(null);
        return;
      }

      const text = selection.toString().trim();
      // Only show for meaningful selections between 2 and 60 characters
      if (!text || text.length < 2 || text.length > 60) {
        setPosition(null);
        return;
      }

      // Check if selection is within an input or textarea
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const parentElement = anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : anchorNode.parentElement;

        if (parentElement?.closest("input, textarea, [contenteditable='true']")) {
          setPosition(null);
          return;
        }
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect && (rect.width > 0 || rect.height > 0)) {
        // Calculate safe position above the selection
        const tooltipX = Math.max(12, Math.min(window.innerWidth - 220, rect.left + rect.width / 2 - 100));
        const tooltipY = rect.top - 42 > 10 ? rect.top - 42 : rect.bottom + 10;

        setPosition({
          x: tooltipX,
          y: tooltipY + window.scrollY,
          selectedText: text
        });
      }
    };

    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 20);
    };

    const handleKeyUp = () => {
      setTimeout(handleSelectionChange, 20);
    };

    const handleScroll = () => {
      // Hide on scroll to avoid floating out of position
      setPosition(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!position?.selectedText) return;
    const term = position.selectedText;
    setPosition(null);
    window.getSelection()?.removeAllRanges();
    navigate(`/buscar?q=${encodeURIComponent(term)}`);
  };

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 4 }}
          transition={{ duration: 0.12 }}
          style={{
            position: "absolute",
            top: position.y,
            left: position.x,
            zIndex: 9999
          }}
          className="pointer-events-auto"
        >
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a101d] text-primary border border-primary/50 shadow-xl shadow-black/80 hover:bg-[#101b33] hover:border-primary transition-all text-xs font-semibold cursor-pointer group backdrop-blur-md"
            title={`Buscar "${position.selectedText}" en la Dragopedia`}
          >
            <div className="h-4.5 w-4.5 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 group-hover:scale-110 transition-transform">
              <Search className="h-2.5 w-2.5 text-primary" />
            </div>
            <span className="text-foreground text-[11px] group-hover:text-primary transition-colors flex items-center gap-1">
              Buscar en la Dragopedia
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
