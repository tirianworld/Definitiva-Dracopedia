import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, RotateCcw, X, Check, AlertTriangle, Zap, Volume2, VolumeX } from "lucide-react";

interface BG3DiceModalProps {
  isOpen: boolean;
  sides: number; // 20 for d20, 100 for d100
  initialDC?: number;
  onClose: () => void;
}

// Synthesize authentic Baldur's Gate 3 dice sounds using Web Audio API
class BG3SoundEngine {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Tumbling clack sound as the die bounces
  playTumbleClick() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Pitch variation for natural dice rattle
      const pitch = 220 + Math.random() * 260;
      osc.type = Math.random() > 0.5 ? "triangle" : "square";
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.05);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800 + Math.random() * 600, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio fallback silent
    }
  }

  // Heavy resonant landing thud + celestial gong
  playLandingThud(isCritSuccess: boolean, isCritFail: boolean) {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Low frequency bass thud (felt in the chest)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      subGain.gain.setValueAtTime(0.6, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.4);

      // 2. Metallic stone chime/gong (the signature BG3 ring)
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = "sine";
      const baseRing = isCritSuccess ? 587.33 : isCritFail ? 185.0 : 440; // D5 for crit, F#3 for fail, A4 normal
      ringOsc.frequency.setValueAtTime(baseRing, now);

      ringGain.gain.setValueAtTime(0.3, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + (isCritSuccess ? 1.2 : 0.7));

      ringOsc.connect(ringGain);
      ringGain.connect(this.ctx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + (isCritSuccess ? 1.2 : 0.7));

      // 3. If critical success: radiant harmonic fanfare
      if (isCritSuccess) {
        [880, 1174.66, 1760].forEach((freq, i) => {
          if (!this.ctx) return;
          const harmOsc = this.ctx.createOscillator();
          const harmGain = this.ctx.createGain();
          harmOsc.type = "sine";
          harmOsc.frequency.setValueAtTime(freq, now + 0.08 * i);
          harmGain.gain.setValueAtTime(0.18, now + 0.08 * i);
          harmGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + 0.08 * i);
          harmOsc.connect(harmGain);
          harmGain.connect(this.ctx.destination);
          harmOsc.start(now + 0.08 * i);
          harmOsc.stop(now + 1.3 + 0.08 * i);
        });
      }
    } catch (e) {
      // Audio fallback silent
    }
  }
}

const soundEngine = new BG3SoundEngine();

export function BG3DiceModal({ isOpen, sides = 20, initialDC = 15, onClose }: BG3DiceModalProps) {
  const [dc, setDc] = useState(initialDC);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number>(sides === 20 ? 20 : 100);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0, z: 0 });

  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    soundEngine.soundEnabled = soundOn;
  }, [soundOn]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRolling(false);
      setHasRolled(false);
      setRollResult(null);
      setDisplayNumber(sides === 20 ? 20 : 100);
      setDiceRotation({ x: 0, y: 0, z: 0 });
    }
  }, [isOpen, sides]);

  // Handle rolling action with Baldur's Gate 3 dramatic timing
  const startRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setHasRolled(false);
    setRollResult(null);

    const finalValue = Math.floor(Math.random() * sides) + 1;
    const rollDuration = 2200; // 2.2 seconds of suspense
    const startTime = performance.now();

    let lastClickTime = 0;
    let clickInterval = 60; // speed of tumble clicks

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / rollDuration);

      // Rapidly spin 3D die
      setDiceRotation({
        x: (elapsed * 1.8 * (1 - progress * 0.7)) % 360,
        y: (elapsed * 2.4 * (1 - progress * 0.7)) % 360,
        z: (elapsed * 0.9 * (1 - progress * 0.7)) % 360,
      });

      // Rapidly flicker numbers while tumbling
      if (progress < 0.92) {
        setDisplayNumber(Math.floor(Math.random() * sides) + 1);
      } else {
        setDisplayNumber(finalValue);
      }

      // Play tumble clicks that gradually slow down
      if (now - lastClickTime > clickInterval) {
        soundEngine.playTumbleClick();
        lastClickTime = now;
        clickInterval = 60 + progress * 240; // slows down towards the end
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        // Landing moment!
        setIsRolling(false);
        setHasRolled(true);
        setRollResult(finalValue);
        setDisplayNumber(finalValue);
        setDiceRotation({ x: 0, y: 0, z: 0 });

        const isCritSuccess = sides === 20 && finalValue === 20;
        const isCritFail = sides === 20 && finalValue === 1;
        soundEngine.playLandingThud(isCritSuccess, isCritFail);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const isCritSuccess = sides === 20 && rollResult === 20;
  const isCritFail = sides === 20 && rollResult === 1;
  const isSuccess = hasRolled && rollResult !== null && (isCritSuccess || (!isCritFail && rollResult >= dc));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 select-none">
        {/* Dark ethereal vignette backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#03070b]/85 backdrop-blur-md"
        />

        {/* Outer Aura in primary turquoise glow */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12)_0%,transparent_65%)]" />

        {/* Main BG3 Rolling Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg flex flex-col items-center text-center"
        >
          {/* Top Controls: Sound toggle and Close button */}
          <div className="w-full flex items-center justify-between px-2 mb-4">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-2 rounded-xl bg-primary/10 border border-primary/25 text-primary hover:text-white hover:bg-primary/20 transition-colors"
              title={soundOn ? "Silenciar audio" : "Activar audio"}
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>

            {/* DC Selector Pill */}
            {sides === 20 && (
              <div className="flex items-center gap-2 bg-[#0c161d]/90 px-3.5 py-1.5 rounded-full border border-primary/25 shadow-[0_0_15px_rgba(45,212,191,0.15)] text-xs">
                <span className="text-primary font-serif tracking-widest uppercase text-[10px]">Dificultad (DC):</span>
                <div className="flex items-center gap-1 font-bold text-primary font-mono">
                  <button
                    type="button"
                    onClick={() => setDc(Math.max(5, dc - 1))}
                    disabled={isRolling}
                    className="w-5 h-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs border border-primary/25 disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-1.5 text-sm text-primary">{dc}</span>
                  <button
                    type="button"
                    onClick={() => setDc(Math.min(30, dc + 1))}
                    disabled={isRolling}
                    className="w-5 h-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs border border-primary/25 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-primary/10 border border-primary/25 text-primary hover:text-white hover:bg-primary/20 transition-colors"
              title="Cerrar tirada"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Baldur's Gate 3 Header Plaque in Primary Theme */}
          <div className="relative mb-6">
            <div className="absolute -inset-1 bg-primary/15 blur-md rounded-lg" />
            <div className="relative px-6 py-2 rounded-lg bg-[#0c161d]/90 border border-primary/30 shadow-xl">
              <h3 className="font-serif text-lg tracking-widest text-primary uppercase font-bold flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Tirada de Dado {sides === 20 ? "(d20)" : "(d100)"}</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </h3>
              <p className="text-[11px] text-slate-300 font-sans tracking-wide mt-0.5">
                {sides === 20 
                  ? `Objetivo a superar: ${dc}`
                  : "Presagio de cien facetas"}
              </p>
            </div>
          </div>

          {/* CENTRAL 3D BALDUR'S GATE 3 D20 DIE */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Ambient Radial Energy Ring */}
            <div 
              className={`absolute w-64 h-64 rounded-full transition-all duration-700 pointer-events-none ${
                isCritSuccess
                  ? "bg-amber-400/20 shadow-[0_0_80px_rgba(251,191,36,0.5)]"
                  : isCritFail
                  ? "bg-rose-600/20 shadow-[0_0_80px_rgba(225,29,72,0.5)]"
                  : isRolling
                  ? "bg-primary/25 shadow-[0_0_60px_rgba(45,212,191,0.4)] animate-pulse"
                  : "bg-primary/10 shadow-[0_0_40px_rgba(45,212,191,0.2)]"
              }`} 
            />

            {/* Die interactive button */}
            <button
              type="button"
              onClick={startRoll}
              disabled={isRolling}
              className={`relative group cursor-pointer focus:outline-none transition-transform duration-300 ${
                isRolling ? "scale-105" : "hover:scale-110 active:scale-95"
              }`}
            >
              {/* 3D Transform wrapper for dynamic rotation */}
              <div
                style={{
                  transform: `perspective(600px) rotateX(${diceRotation.x}deg) rotateY(${diceRotation.y}deg) rotateZ(${diceRotation.z}deg)`,
                  transition: isRolling ? "none" : "transform 0.4s ease-out",
                }}
                className="w-52 h-52 flex items-center justify-center relative"
              >
                {/* BG3 Authentic Faceted Icosahedron SVG in Primary Color */}
                <svg
                  viewBox="0 0 200 200"
                  className={`w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] transition-all ${
                    isCritSuccess
                      ? "stroke-amber-300 text-amber-300 fill-[#15130b]"
                      : isCritFail
                      ? "stroke-rose-500 text-rose-500 fill-[#1c0b10]"
                      : isSuccess
                      ? "stroke-primary text-primary fill-[#0b1f24]"
                      : "stroke-primary/80 text-primary fill-[#07171b]"
                  }`}
                >
                  <defs>
                    <radialGradient id="dieGradTeal" cx="50%" cy="45%" r="65%">
                      <stop offset="0%" stopColor="#134e4a" stopOpacity="0.8" />
                      <stop offset="60%" stopColor="#0a2628" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#031012" stopOpacity="1" />
                    </radialGradient>
                    <radialGradient id="goldGrad" cx="50%" cy="45%" r="65%">
                      <stop offset="0%" stopColor="#78350f" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#291404" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#0f0501" stopOpacity="1" />
                    </radialGradient>
                    <radialGradient id="critFailGrad" cx="50%" cy="45%" r="65%">
                      <stop offset="0%" stopColor="#881337" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#3b0714" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#150207" stopOpacity="1" />
                    </radialGradient>
                  </defs>

                  {/* Outer Hexagon Shell */}
                  <polygon
                    points="100,10 178,55 178,145 100,190 22,145 22,55"
                    fill={isCritSuccess ? "url(#goldGrad)" : isCritFail ? "url(#critFailGrad)" : "url(#dieGradTeal)"}
                    strokeWidth="3.5"
                    className="transition-colors duration-500"
                  />

                  {/* Inner Facet Triangle Center (Where number sits) */}
                  <polygon
                    points="100,32 158,135 42,135"
                    fill={isCritSuccess ? "#2d1b03" : isCritFail ? "#28070e" : "#0d3137"}
                    fillOpacity="0.75"
                    strokeWidth="2.5"
                  />

                  {/* Diagonal Facet Edge Connectors */}
                  <line x1="100" y1="10" x2="100" y2="32" strokeWidth="2.5" />
                  <line x1="178" y1="55" x2="100" y2="32" strokeWidth="2" />
                  <line x1="22" y1="55" x2="100" y2="32" strokeWidth="2" />

                  <line x1="178" y1="55" x2="158" y2="135" strokeWidth="2.5" />
                  <line x1="178" y1="145" x2="158" y2="135" strokeWidth="2" />
                  <line x1="100" y1="190" x2="158" y2="135" strokeWidth="2" />

                  <line x1="22" y1="55" x2="42" y2="135" strokeWidth="2.5" />
                  <line x1="22" y1="145" x2="42" y2="135" strokeWidth="2" />
                  <line x1="100" y1="190" x2="42" y2="135" strokeWidth="2" />

                  <line x1="42" y1="135" x2="158" y2="135" strokeWidth="2.5" />
                  <line x1="100" y1="190" x2="100" y2="135" strokeWidth="2" strokeDasharray="3,3" />

                  {/* Decorative Runic Engravings along corner facets */}
                  <circle cx="100" cy="32" r="3" fill="currentColor" />
                  <circle cx="158" cy="135" r="3" fill="currentColor" />
                  <circle cx="42" cy="135" r="3" fill="currentColor" />
                </svg>

                {/* Big Number in the Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
                  <span
                    className={`font-serif font-black tracking-tight select-none transition-all duration-300 ${
                      sides === 100 ? "text-4xl" : "text-5xl"
                    } ${
                      isCritSuccess
                        ? "text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] scale-110"
                        : isCritFail
                        ? "text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]"
                        : isRolling
                        ? "text-primary drop-shadow-[0_0_15px_rgba(45,212,191,0.7)]"
                        : "text-primary drop-shadow-[0_0_12px_rgba(45,212,191,0.5)]"
                    }`}
                  >
                    {displayNumber}
                  </span>
                </div>
              </div>

              {/* Click prompt below die when idle */}
              {!isRolling && !hasRolled && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary bg-[#0c161d]/90 border border-primary/30 px-4 py-1.5 rounded-full shadow-lg animate-pulse">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="font-serif tracking-wider uppercase font-semibold">Haz clic para tirar</span>
                </div>
              )}
            </button>
          </div>

          {/* Baldur's Gate 3 Result Banners in Primary Style */}
          <AnimatePresence>
            {hasRolled && rollResult !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full mt-3 flex flex-col items-center gap-3"
              >
                {/* Result Title Pill */}
                <div
                  className={`px-8 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 ${
                    isCritSuccess
                      ? "bg-amber-950/90 border-amber-400/80 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                      : isCritFail
                      ? "bg-rose-950/90 border-rose-500/80 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                      : isSuccess
                      ? "bg-[#0c161d]/95 border-primary/60 text-primary shadow-[0_0_25px_rgba(45,212,191,0.3)]"
                      : "bg-[#141d24]/90 border-slate-700 text-slate-300"
                  }`}
                >
                  {isCritSuccess ? (
                    <>
                      <Sparkles className="h-5 w-5 text-amber-400 animate-spin" />
                      <span className="font-serif text-base uppercase font-bold tracking-widest text-amber-200">
                        ¡ÉXITO CRÍTICO!
                      </span>
                    </>
                  ) : isCritFail ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-rose-400 animate-bounce" />
                      <span className="font-serif text-base uppercase font-bold tracking-widest text-rose-300">
                        ¡PIFIA CRÍTICA!
                      </span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <Check className="h-5 w-5 text-primary" />
                      <span className="font-serif text-base uppercase font-bold tracking-widest text-primary">
                        ¡ÉXITO! ({rollResult} ≥ {dc})
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-slate-400" />
                      <span className="font-serif text-base uppercase font-bold tracking-widest text-slate-200">
                        FALLO ({rollResult} &lt; {dc})
                      </span>
                    </>
                  )}
                </div>

                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  {isCritSuccess
                    ? "Los astros se alinean con gloria absoluta. Tu tirada supera todo obstáculo."
                    : isCritFail
                    ? "El destino ha dictado un giro catastrófico. Las fuerzas fallan estrepitosamente."
                    : isSuccess
                    ? "Tu voluntad triunfa. Has superado la dificultad requerida en este lance."
                    : "El resultado no alcanza la dificultad exigida. El lance no tiene éxito."}
                </p>

                {/* Bottom Actions */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={startRoll}
                    className="px-5 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-serif font-semibold tracking-wider text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(45,212,191,0.2)] transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-primary" />
                    <span>Tirar de nuevo</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-[#0c161d]/80 hover:bg-[#14232f] border border-primary/25 text-slate-300 hover:text-white font-serif font-semibold tracking-wider text-xs transition-colors cursor-pointer"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
