import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Settings, Terminal, MessageSquare, Send, Mic, Cpu, HardDrive, Brain, Wifi,
  AlertTriangle, X, Loader2, Circle, Command, Sparkles, ChevronRight, Activity, Server, Zap, Layers, Orbit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────
type YusraResponse = { system?: string; thought: string; action: string; context_used?: number };
type ExecResult = { stdout: string; stderr: string; requires_confirmation: boolean };
type Msg = { id: string; text: string; fromUser: boolean };
type TLine = { id: string; text: string; kind: "cmd" | "out" | "err" | "info" };
type Specs = { os?: string; arch?: string; cpu_brand?: string; cpu_cores?: number; cpu_frequency_mhz?: number; total_ram_gb?: number; available_ram_gb?: number } | null;
const uid = () => Math.random().toString(36).slice(2, 9);

// motion variants — shared
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 28 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } },
};

export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "w", text: "Yusra — local-first entity. Ask anything, or hit Ctrl+Space for the omni bar. 100% offline.", fromUser: false },
  ]);
  const [term, setTerm] = useState<TLine[]>([{ id: "t0", text: "▸ agentic terminal — ready · awaiting action", kind: "info" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [omni, setOmni] = useState(false);
  const [omniText, setOmniText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [specs, setSpecs] = useState<Specs>(null);
  const [llmFit, setLlmFit] = useState<"checking" | "ok" | "offline">("checking");
  const [ratio, setRatio] = useState(0.54);
  const [drag, setDrag] = useState(false);
  const [dangerCmd, setDangerCmd] = useState<string | null>(null);

  const chatEnd = useRef<HTMLDivElement>(null);
  const termEnd = useRef<HTMLDivElement>(null);
  const omniRef = useRef<HTMLInputElement>(null);

  const pushMsg = useCallback((text: string, fromUser: boolean) =>
    setMsgs(m => [...m, { id: uid(), text, fromUser }]), []);
  const pushTerm = useCallback((text: string, kind: TLine["kind"] = "out") =>
    setTerm(t => [...t, { id: uid(), text, kind }]), []);

  // agentic loop — ask_yusra -> execute if action
  const ask = async (raw: string) => {
    const prompt = raw.trim(); if (!prompt) return;
    pushMsg(prompt, true); setInput(""); setBusy(true);
    try {
      const json = await invoke<string>("ask_yusra_command", { prompt });
      let p: YusraResponse; try { p = JSON.parse(json); } catch { p = { thought: json, action: "" }; }
      pushMsg(p.thought || "(no thought)", false);
      if (p.action?.trim()) {
        if (dangerCmd === null && ["rm -rf", "mkfs", "dd "].some(k => p.action.toLowerCase().includes(k))) {
          setDangerCmd(p.action); setBusy(false); return;
        }
        pushTerm("$ " + p.action, "cmd");
        const r = await invoke<ExecResult>("execute_command_command", { cmd: p.action });
        if (r.requires_confirmation) {
          pushTerm("✕ blocked — requires confirmation", "err");
          pushMsg("Blocked: " + (r.stderr || "Dangerous command"), false);
        } else {
          if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
          if (r.stderr) pushTerm("· " + r.stderr.trimEnd(), "err");
          pushMsg(r.stdout ? r.stdout.trimEnd() : r.stderr ? r.stderr.trimEnd() : "(no output)", false);
        }
      }
    } catch (e) { const m = e instanceof Error ? e.message : String(e); pushTerm("✕ " + m, "err"); pushMsg("Error: " + m, false); }
    finally { setBusy(false); }
  };

  const confirmDanger = async () => {
    if (!dangerCmd) return; const cmd = dangerCmd; setDangerCmd(null);
    pushTerm("$ " + cmd + "  — confirmed", "cmd");
    try {
      const r = await invoke<ExecResult>("execute_command_command", { cmd });
      if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
      if (r.stderr) pushTerm(r.stderr.trimEnd(), "err");
      pushMsg(r.stdout?.trimEnd() || r.stderr?.trimEnd() || "(no output)", false);
    } catch (e) { pushTerm("✕ " + String(e), "err"); }
  };

  // shortcuts — must be from Yusra folder: npm run tauri dev
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") { e.preventDefault(); setOmni(o => !o); setOmniText(""); }
      else if (e.key === "Escape") { setOmni(false); setSettingsOpen(false); setDangerCmd(null); }
      else if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); if (!settingsOpen) openSettings(); else setSettingsOpen(false); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [settingsOpen]);
  useEffect(() => { if (omni) setTimeout(() => omniRef.current?.focus(), 70); }, [omni]);

  const openSettings = async () => {
    setSettingsOpen(true); setLlmFit("checking");
    try { const j = await invoke<string>("get_device_specs_command"); setSpecs(JSON.parse(j)); } catch { /* */ }
    try { const v = await invoke<string>("get_entity_command", { key: "active_model" }); setLlmFit(v && v !== "null" ? "ok" : "offline"); } catch { setLlmFit("offline"); }
  };

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { termEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [term]);

  useEffect(() => {
    if (!drag) return;
    const mv = (e: MouseEvent) => setRatio(Math.min(0.76, Math.max(0.30, e.clientX / window.innerWidth)));
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [drag]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-deep-carbon text-text-primary relative" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* Aurora mesh — ambient motion */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="aurora"
          animate={{ x: [0, 18, -10, 0], y: [0, -10, 8, 0], scale: [1, 1.04, 0.98, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-28 -right-28 h-[520px] w-[520px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle at center, #7C5CFF 0%, transparent 70%)", filter: "blur(28px)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.07, 0.10, 0.07] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 h-[560px] w-[560px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle at center, #00F0FF 0%, transparent 70%)", filter: "blur(32px)" }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.06, 0.09, 0.06] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* ── Titlebar (Tauri borderless drag region) ──────────────────────── */}
      <div
        data-tauri-drag-region
        className="relative z-20 h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-deep-carbon/85 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <motion.span whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.94 }} className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/20 shadow-sm cursor-pointer" />
            <motion.span whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.94 }} className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/20 shadow-sm cursor-pointer" />
            <motion.span whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.94 }} className="h-3 w-3 rounded-full bg-[#28c840] border border-black/20 shadow-sm cursor-pointer" />
          </div>
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="ml-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-ice-cyan to-yusra-violet grid place-items-center shadow-glow-cyan">
              <Orbit className="h-3 w-3 text-white" />
            </div>
            <span className="text-[11px] tracking-[0.20em] uppercase font-semibold" style={{ fontFamily: "Space Grotesk,sans-serif" }}>YUSRA</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-ice-cyan/15 to-yusra-violet/15 text-ice-cyan border border-ice-cyan/25">
              <span className="h-1.5 w-1.5 rounded-full bg-ice-cyan animate-pulse" /> local · offline
            </span>
          </motion.div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.96 }}
            onClick={openSettings} title="Settings (Ctrl+,)"
            className="h-7 w-7 grid place-items-center rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* ── Workspace ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex overflow-hidden min-h-0 p-2 gap-2">
        {/* LEFT: Reasoning Stream */}
        <motion.div
          style={{ width: `${ratio * 100}%` }}
          layout
          className="flex flex-col min-w-0 rounded-2xl overflow-hidden border border-refractive-edge bg-glass-surface backdrop-blur-[20px] shadow-glass"
        >
          {/* header with subtle gradient */}
          <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-gradient-to-r from-ice-cyan/[0.06] via-transparent to-yusra-violet/[0.06]">
            <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-text-muted">
              <div className="h-6 w-6 rounded-lg bg-ice-cyan/10 border border-ice-cyan/15 grid place-items-center">
                <MessageSquare className="h-3.5 w-3.5 text-ice-cyan" />
              </div>
              Reasoning Stream
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10">
                <Layers className="h-3 w-3 text-text-muted" /> agentic
              </span>
              <AnimatePresence>
                {busy && (
                  <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="h-6 px-2 rounded-full bg-ice-cyan/15 border border-ice-cyan/25 flex items-center gap-1.5 text-[10px] text-ice-cyan">
                    <Loader2 className="h-3 w-3 animate-spin" /> thinking
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-thin">
            <LayoutGroup>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                {msgs.map(m => (
                  <motion.div
                    key={m.id}
                    variants={itemVariants}
                    layout
                    whileHover={{ y: -1 }}
                    className={cn(
                      "relative rounded-2xl border p-3.5 text-[13.5px] leading-relaxed max-w-[92%] overflow-hidden",
                      m.fromUser
                        ? "ml-auto bg-gradient-to-br from-ice-cyan/[0.14] to-yusra-violet/[0.10] border-ice-cyan/20 shadow-glow-cyan"
                        : "bg-white/[0.04] border-white/10 backdrop-blur-md"
                    )}
                  >
                    {!m.fromUser && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-5 w-5 rounded-full bg-gradient-to-br from-ice-cyan to-yusra-violet grid place-items-center shadow-sm">
                          <Sparkles className="h-3 w-3 text-white" />
                        </span>
                        <span className="text-[10px] tracking-[0.16em] uppercase font-semibold text-ice-cyan">Yusra</span>
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                      </div>
                    )}
                    <div className={cn("whitespace-pre-wrap break-words", m.fromUser ? "text-white" : "text-white/90")}>{m.text}</div>
                    {/* subtle inner highlight */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/[0.06]" />
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>

            {/* typing indicator */}
            <AnimatePresence>
              {busy && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="h-7 px-3 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-2">
                    <span className="flex gap-1">
                      <motion.span className="h-1.5 w-1.5 rounded-full bg-ice-cyan" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                      <motion.span className="h-1.5 w-1.5 rounded-full bg-yusra-violet" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.12 }} />
                      <motion.span className="h-1.5 w-1.5 rounded-full bg-yusra-pink" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.24 }} />
                    </span>
                    executing
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEnd} />
          </div>

          {/* input — glass with focus glow */}
          <motion.form
            onSubmit={e => { e.preventDefault(); if (input.trim() && !busy) ask(input); }}
            className="shrink-0 p-2.5 border-t border-refractive-edge bg-deep-carbon/40 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-1.5 focus-within:border-ice-cyan/30 focus-within:shadow-glow-cyan transition-all">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Yusra…  (Ctrl+Space for omni bar)"
                disabled={busy}
                className="flex-1 h-9 bg-transparent border-0 focus-visible:ring-0 text-[13.5px] placeholder:text-text-faint"
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || busy}
                whileHover={{ scale: input.trim() && !busy ? 1.04 : 1 }}
                whileTap={{ scale: 0.96 }}
                className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-ice-cyan to-yusra-violet text-white shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.04, backgroundColor: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.96 }}
                onClick={() => (document.querySelector<HTMLInputElement>('input[placeholder*="Ask Yusra"]')?.focus())}
                className="h-9 w-9 shrink-0 grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-text-muted hover:text-white"
              >
                <Mic className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-faint px-1">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yusra-amber" /> local inference · no cloud</span>
              <span className="hidden sm:inline">↵ send · Ctrl+Space omni</span>
            </div>
          </motion.form>
        </motion.div>

        {/* divider */}
        <motion.div
          onMouseDown={e => { e.preventDefault(); setDrag(true); }}
          whileHover={{ backgroundColor: "rgba(0,240,255,0.18)" }}
          className={cn("w-1.5 shrink-0 rounded-full cursor-col-resize grid place-items-center transition-colors self-center h-[38%] border border-white/5 bg-white/[0.04] backdrop-blur-md", drag && "bg-ice-cyan/30")}
        >
          <motion.div animate={{ x: drag ? [0, 2, 0] : 0 }} transition={{ duration: 0.4, repeat: drag ? Infinity : 0 }}>
            <ChevronRight className="h-3 w-3 text-text-muted" />
          </motion.div>
        </motion.div>

        {/* RIGHT: Live Terminal */}
        <motion.div layout className="flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden border border-refractive-edge bg-[#0B0B0D] shadow-glass">
          <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-white/10 bg-gradient-to-r from-yusra-violet/[0.08] via-transparent to-ice-cyan/[0.06]">
            <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-text-muted">
              <div className="h-6 w-6 rounded-lg bg-yusra-violet/15 border border-yusra-violet/20 grid place-items-center">
                <Terminal className="h-3.5 w-3.5 text-yusra-violet-2" />
              </div>
              Live Terminal
            </div>
            <motion.span
              key={busy ? "run" : "idle"}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={cn("h-6 px-2.5 rounded-full border flex items-center gap-1.5 text-[10px] font-medium", busy ? "bg-amber-500/15 border-amber-500/25 text-amber-300" : "bg-emerald-500/12 border-emerald-500/20 text-emerald-300")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />{busy ? "running" : "idle"}
            </motion.span>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 font-mono text-[12.5px] leading-relaxed scroll-thin" style={{ fontFamily: "JetBrains Mono,monospace" }}>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-1">
              {term.map(l => (
                <motion.div
                  key={l.id}
                  variants={itemVariants}
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 border",
                    l.kind === "cmd" && "bg-ice-cyan/[0.08] border-ice-cyan/15 text-ice-cyan",
                    l.kind === "out" && "bg-emerald-500/[0.06] border-emerald-500/10 text-emerald-200/90",
                    l.kind === "err" && "bg-red-500/[0.08] border-red-500/15 text-red-300/90",
                    l.kind === "info" && "bg-white/[0.03] border-white/5 text-text-muted"
                  )}
                >
                  {l.text}
                </motion.div>
              ))}
            </motion.div>
            <div ref={termEnd} />
          </div>
          {/* terminal footer hint */}
          <div className="h-7 shrink-0 flex items-center px-3 border-t border-white/5 bg-white/[0.02] text-[10px] text-text-faint">
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-emerald-400 text-emerald-400 animate-pulse" /> stdout streams here in real time</span>
          </div>
        </motion.div>
      </div>

      {/* ── Omni-Command Bar (Ctrl+Space) ────────────────────────────── */}
      <AnimatePresence>
        {omni && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-center pt-[16vh] bg-black/50 backdrop-blur-[6px] p-4"
            onClick={() => setOmni(false)}
          >
            <motion.div
              initial={{ y: -22, opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: -18, opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-[640px]"
            >
              <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-glass-strong backdrop-blur-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(0,240,255,0.12)]">
                {/* top shimmer */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ice-cyan/40 to-transparent" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ background: "radial-gradient(600px 200px at 50% 0%, #7C5CFF, transparent)" }} />
                <div className="relative flex items-center gap-3 px-4 py-3">
                  <motion.div animate={{ rotate: omniText ? 12 : 0 }} className="h-9 w-9 rounded-xl bg-gradient-to-br from-ice-cyan to-yusra-violet grid place-items-center shadow-glow-cyan shrink-0">
                    <Command className="h-5 w-5 text-white" />
                  </motion.div>
                  <input
                    ref={omniRef}
                    value={omniText}
                    onChange={e => setOmniText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && omniText.trim()) { const t = omniText; setOmni(false); setOmniText(""); ask(t); } }}
                    placeholder="Tell Yusra what to build or run…"
                    className="flex-1 h-11 bg-transparent outline-none text-[15px] placeholder:text-text-faint"
                  />
                  <AnimatePresence>
                    {omniText.trim() && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                        <Button size="sm" onClick={() => { const t = omniText; setOmni(false); setOmniText(""); ask(t); }} className="rounded-xl bg-gradient-to-r from-ice-cyan to-yusra-violet text-white shadow-glow-cyan hover:opacity-90">
                          Run <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* suggestions */}
                <div className="px-2 pb-2">
                  <div className="rounded-xl bg-black/20 border border-white/5 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      ["List files", "ls the current directory"],
                      ["System info", "show device specs"],
                      ["Network", "ipconfig /all"],
                      ["Where am I", "current working directory"],
                    ].map(([label, prompt]) => (
                      <motion.button
                        key={label}
                        whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.06)" }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setOmni(false); setOmniText(""); ask(prompt); }}
                        className="text-left px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-ice-cyan/20 transition-colors"
                      >
                        <div className="text-xs font-medium text-white">{label}</div>
                        <div className="text-[11px] text-text-muted truncate">{prompt}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-black/10 text-[10px] text-text-faint">
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-yusra-violet-2" /> natural language → agentic execution</span>
                  <span>↵ run · Esc close</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[8px] p-4" onClick={() => setSettingsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.96, y: 16, filter: "blur(8px)" }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[86vh] flex flex-col rounded-[20px] border border-white/10 bg-glass-strong backdrop-blur-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="relative h-20 shrink-0 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-ice-cyan/15 via-yusra-violet/10 to-yusra-pink/10" />
                <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(500px 160px at 30% 0%, rgba(0,240,255,0.15), transparent)" }} />
                <div className="relative h-full flex items-center justify-between px-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 grid place-items-center backdrop-blur-md">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Device & LLM Fit</h2>
                      <p className="text-xs text-text-muted">Local-first · no cloud</p>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => setSettingsOpen(false)} className="h-8 w-8 grid place-items-center rounded-xl bg-white/10 border border-white/10 text-white/70 hover:text-white">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-thin">
                {/* LLM Fit gauge */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
                  <div className="absolute inset-0 opacity-30" style={{ background: llmFit === "ok" ? "radial-gradient(400px 160px at 80% 0%, rgba(0,229,160,0.12), transparent)" : llmFit === "offline" ? "radial-gradient(400px 160px at 80% 0%, rgba(255,184,0,0.12), transparent)" : "radial-gradient(400px 160px at 80% 0%, rgba(0,240,255,0.10), transparent)" }} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl grid place-items-center border", llmFit === "ok" ? "bg-emerald-500/15 border-emerald-500/25" : llmFit === "offline" ? "bg-amber-500/15 border-amber-500/25" : "bg-ice-cyan/10 border-ice-cyan/20")}>
                        <Activity className={cn("h-5 w-5", llmFit === "ok" ? "text-emerald-300" : llmFit === "offline" ? "text-amber-300" : "text-ice-cyan")} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">LLM Fit</div>
                        <div className="text-xs text-text-muted">Model that fits this device</div>
                      </div>
                    </div>
                    {llmFit === "checking" && <span className="h-6 px-2.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> checking</span>}
                    {llmFit === "ok" && <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="h-6 px-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ready</motion.span>}
                    {llmFit === "offline" && <span className="h-6 px-2.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> offline</span>}
                  </div>
                  <p className="relative mt-3 text-xs leading-relaxed text-text-muted">
                    {llmFit === "checking" && "Profiling CPU, RAM and storage…"}
                    {llmFit === "ok" && "Local GGUF is loaded. Yusra reasons and executes entirely offline."}
                    {llmFit === "offline" && "No local GGUF found. Use the Fit checker to find the best model for this device, then download to enable inference."}
                  </p>
                  {/* mini meter */}
                  <div className="relative mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", llmFit === "ok" ? "bg-gradient-to-r from-emerald-400 to-ice-cyan" : llmFit === "offline" ? "bg-gradient-to-r from-amber-400 to-yusra-pink" : "bg-gradient-to-r from-ice-cyan to-yusra-violet")}
                      initial={{ width: "18%" }} animate={{ width: llmFit === "checking" ? "42%" : llmFit === "ok" ? "88%" : "36%" }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    />
                  </div>
                </motion.div>

                {specs ? (
                  <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
                    <div className="text-[11px] tracking-widest uppercase text-text-muted flex items-center gap-2"><Server className="h-3.5 w-3.5 text-yusra-violet-2" /> Device Specs</div>
                    <div className="grid gap-2">
                      {[
                        [Cpu, "CPU", `${specs.cpu_brand || "—"} · ${specs.cpu_cores ?? 0} cores · ${specs.cpu_frequency_mhz ?? 0} MHz`],
                        [Brain, "Memory", `${specs.total_ram_gb ?? "—"} GB total · ${specs.available_ram_gb ?? "—"} GB available`],
                        [HardDrive, "Store", "SQLite · episodic + entity_state"],
                        [Wifi, "Network", "Offline-only · no cloud"],
                        [Server, "Platform", `${specs.os || "—"} / ${specs.arch || "—"}`],
                      ].map(([Icon, label, value], i) => (
                        <motion.div key={String(label)} variants={itemVariants} custom={i} whileHover={{ y: -1, borderColor: "rgba(255,255,255,0.14)" }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-3 transition-colors">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 grid place-items-center shrink-0">
                            {(Icon as React.ComponentType<{ className?: string }>) && <span className="text-ice-cyan"><Icon className="h-4 w-4" /></span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] tracking-widest uppercase text-text-muted">{String(label)}</div>
                            <div className="text-xs text-white/90 truncate">{String(value)}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> loading specs…</div>
                )}
              </div>

              <div className="p-3 border-t border-white/10 bg-black/10 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-text-muted flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />100% local. No data leaves this machine.</span>
                <Button size="sm" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-gradient-to-r from-ice-cyan to-yusra-violet text-white shadow-glow-cyan">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Danger Loop ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {dangerCmd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-[8px] p-4">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="w-full max-w-md overflow-hidden rounded-[20px] border border-amber-500/30 bg-[rgba(28,18,6,0.96)] backdrop-blur-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-yusra-pink to-amber-500" />
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/25 grid place-items-center">
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-100">High-risk command</h3>
                    <p className="text-xs text-amber-200/70">Requires explicit confirmation</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-amber-200/80">Yusra wants to run a command that could be destructive. Confirm explicitly to execute.</p>
                <pre className="mt-3 p-3 rounded-xl bg-black/50 border border-amber-500/20 text-xs text-amber-100 whitespace-pre-wrap break-words font-mono">{dangerCmd}</pre>
                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setDangerCmd(null)} className="rounded-xl text-white/70 hover:text-white">Cancel</Button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmDanger} className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yusra-pink text-white text-sm font-medium shadow-lg">Confirm & Run</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
