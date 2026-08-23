import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, SlidersHorizontal, ShieldCheck, Zap, CheckCircle2, ChevronRight, ChevronLeft, Orbit, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "01_welcome",
    title: "Meet Yusra",
    desc: "Your local-first desktop entity. She reasons, writes code, executes it, and learns — 100% offline. No cloud, ever.",
    icon: Sparkles,
    cta: "Get Started",
  },
  {
    id: "02_personalize",
    title: "Tailor Your Workspace",
    desc: "Choose how you work: developer, researcher, or creator. Yusra adapts her harness to your flow.",
    icon: SlidersHorizontal,
    cta: "Continue",
  },
  {
    id: "03_consent",
    title: "You Stay in Control",
    desc: "Yusra runs locally. She asks before risky commands and stores memory only on this device. Your data never leaves.",
    icon: ShieldCheck,
    cta: "I Understand",
  },
  {
    id: "04_aha",
    title: "Your First Task",
    desc: "Try it: Yusra will list files, check disk, or show where you are — harness executes and streams results live.",
    icon: Zap,
    cta: "Try It",
  },
  {
    id: "05_done",
    title: "Ready",
    desc: "Yusra is everywhere on this device — Ctrl+Space from any pane. Tasks are re-runnable, harness learns every run.",
    icon: CheckCircle2,
    cta: "Open Yusra",
  },
];

export function Onboarding({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  const ActiveIcon = steps[step].icon;
  const isLast = step === steps.length - 1;

  const next = () => (isLast ? onComplete() : setStep(s => s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-deep-carbon p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="yusra-grid" />
        <div className="yusra-aurora" />
      </div>

      <div className="relative w-full max-w-[560px]">
        {/* progress */}
        <div className="mb-6 flex items-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className={cn("h-full", i <= step ? "bg-ice-cyan" : "bg-transparent")}
                initial={{ width: 0 }}
                animate={{ width: i < step ? "100%" : i === step ? "60%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
          <button onClick={onSkip} className="ml-3 flex items-center gap-1 text-xs text-text-muted hover:text-white">
            <SkipForward className="h-3 w-3" /> Skip
          </button>
        </div>

        {/* card with 3D perspective */}
        <div className="perspective-[1200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ rotateY: 18, opacity: 0, scale: 0.97 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: -18, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="rounded-[20px] border border-white/10 bg-glass-strong backdrop-blur-[20px] shadow-glass overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="h-1 w-full bg-ice-cyan" />
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-ice-cyan grid place-items-center shadow-glow-cyan">
                    <ActiveIcon className="h-6 w-6 text-deep-carbon" />
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center">
                    <Orbit className="h-5 w-5 text-ice-cyan" />
                  </div>
                  <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-text-faint">Step {step + 1} of {steps.length}</span>
                </div>

                <h2 className="text-[22px] font-bold tracking-tight" style={{ fontFamily: "Space Grotesk,sans-serif" }}>
                  {steps[step].title}
                </h2>
                <p className="mt-3 text-[13.5px] leading-relaxed text-text-muted">
                  {steps[step].desc}
                </p>

                {/* step-specific visuals */}
                {step === 1 && (
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {["Developer", "Researcher", "Creator"].map(label => (
                      <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                        <div className="text-xs font-medium">{label}</div>
                        <div className="text-[11px] text-text-faint mt-1">Tailored hints</div>
                      </div>
                    ))}
                  </div>
                )}
                {step === 3 && (
                  <div className="mt-6 rounded-xl border border-ice-cyan/20 bg-ice-subtle p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-ice-cyan/15 grid place-items-center"><Zap className="h-4 w-4 text-ice-cyan" /></div>
                    <div className="text-xs"><div className="font-medium">Try “list files”</div><div className="text-text-muted">Harness will run dir and stream output</div></div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={back} disabled={step === 0} className="rounded-xl">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button size="sm" onClick={next} className="rounded-xl bg-ice-cyan text-deep-carbon hover:bg-ice-cyan/90 shadow-glow-cyan">
                    {steps[step].cta} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-[11px] text-text-faint">Yusra runs 100% locally · No data leaves this device</p>
      </div>
    </div>
  );
}

export function Splash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-deep-carbon"
      onAnimationComplete={() => setTimeout(onDone, 1100)}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="yusra-grid" />
        <motion.div className="yusra-aurora" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
        <div className="yusra-scanline" style={{ animation: "scan 2.4s linear infinite" }} />
      </div>

      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative flex flex-col items-center"
      >
        <motion.div
          className="h-[64px] w-[64px] rounded-[18px] bg-ice-cyan grid place-items-center shadow-glow-cyan"
          animate={{ boxShadow: ["0 0 24px rgba(0,240,255,0.25)", "0 0 40px rgba(0,240,255,0.45)", "0 0 24px rgba(0,240,255,0.25)"] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Orbit className="h-8 w-8 text-deep-carbon" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-5 text-center"
        >
          <div className="text-[18px] tracking-[0.28em] font-bold" style={{ fontFamily: "Space Grotesk,sans-serif" }}>YUSRA</div>
          <div className="mt-1 text-xs tracking-widest uppercase text-text-muted">Local entity · starting</div>
        </motion.div>
        <motion.div initial={{ width: 0 }} animate={{ width: 120 }} transition={{ duration: 1.1, ease: "easeInOut" }} className="mt-6 h-1 rounded-full bg-ice-cyan" />
      </motion.div>
    </motion.div>
  );
}
