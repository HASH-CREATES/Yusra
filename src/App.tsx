import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Terminal, MessageSquare, Send, Mic, Cpu, HardDrive, Brain, Wifi,
  AlertTriangle, X, Loader2, Circle, Command, Sparkles, ChevronRight, Activity, Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────
type YusraResponse = { system?: string; thought: string; action: string; context_used?: number };
type ExecResult = { stdout: string; stderr: string; requires_confirmation: boolean };
type Msg = { id: string; text: string; fromUser: boolean; thought?: string };
type TLine = { id: string; text: string; kind: "cmd" | "out" | "err" | "info" };
type Specs = { os?: string; arch?: string; cpu_brand?: string; cpu_cores?: number; cpu_frequency_mhz?: number; total_ram_gb?: number; available_ram_gb?: number } | null;
const uid = () => Math.random().toString(36).slice(2, 9);

// ── App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "w", text: "Yusra is online. Ask anything or press Ctrl+Space for the command bar.", fromUser: false }]);
  const [term, setTerm] = useState<TLine[]>([{ id: "t0", text: "// agentic terminal — ready", kind: "info" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [omni, setOmni] = useState(false);
  const [omniText, setOmniText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [specs, setSpecs] = useState<Specs>(null);
  const [llmFit, setLlmFit] = useState<"checking" | "ok" | "offline">("checking");
  const [ratio, setRatio] = useState(0.52);
  const [drag, setDrag] = useState(false);
  const [dangerCmd, setDangerCmd] = useState<string | null>(null);

  const chatEnd = useRef<HTMLDivElement>(null);
  const termEnd = useRef<HTMLDivElement>(null);
  const omniRef = useRef<HTMLInputElement>(null);

  // helpers
  const pushMsg = useCallback((text: string, fromUser: boolean, thought?: string) =>
    setMsgs(m => [...m, { id: uid(), text, fromUser, thought }]), []);
  const pushTerm = useCallback((text: string, kind: TLine["kind"] = "out") =>
    setTerm(t => [...t, { id: uid(), text, kind }]), []);

  // ask_yusra IPC — agentic loop: ask -> execute if action
  const ask = async (raw: string) => {
    const prompt = raw.trim(); if (!prompt) return;
    pushMsg(prompt, true); setInput(""); setBusy(true);
    try {
      const json = await invoke<string>("ask_yusra_command", { prompt });
      let p: YusraResponse; try { p = JSON.parse(json); } catch { p = { thought: json, action: "" }; }
      pushMsg(p.thought || "(no thought)", false, p.thought);
      if (p.action?.trim()) {
        // danger loop — intercept before execution
        if (dangerCmd === null && ["rm -rf", "mkfs", "dd "].some(k => p.action.toLowerCase().includes(k))) {
          setDangerCmd(p.action); setBusy(false); return;
        }
        pushTerm("$ " + p.action, "cmd");
        const r = await invoke<ExecResult>("execute_command_command", { cmd: p.action });
        if (r.requires_confirmation) {
          pushTerm("[blocked] " + (r.stderr || "requires confirmation"), "err");
          pushMsg("Blocked: " + (r.stderr || "Dangerous command"), false);
        } else {
          if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
          if (r.stderr) pushTerm("[stderr] " + r.stderr.trimEnd(), "err");
          pushMsg(r.stdout ? r.stdout.trimEnd() : r.stderr ? r.stderr.trimEnd() : "(no output)", false);
        }
      }
    } catch (e) { const m = e instanceof Error ? e.message : String(e); pushTerm("[error] " + m, "err"); pushMsg("Error: " + m, false); }
    finally { setBusy(false); }
  };

  const confirmDanger = async () => {
    if (!dangerCmd) return; const cmd = dangerCmd; setDangerCmd(null);
    pushTerm("$ " + cmd + "  (confirmed)", "cmd");
    try {
      const r = await invoke<ExecResult>("execute_command_command", { cmd });
      if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
      if (r.stderr) pushTerm(r.stderr.trimEnd(), "err");
      pushMsg(r.stdout?.trimEnd() || r.stderr?.trimEnd() || "(no output)", false);
    } catch (e) { pushTerm("[error] " + String(e), "err"); }
  };

  // global shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") { e.preventDefault(); setOmni(o => !o); setOmniText(""); }
      else if (e.key === "Escape") { setOmni(false); setSettingsOpen(false); setDangerCmd(null); }
      else if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); setSettingsOpen(o => !o); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { if (omni) setTimeout(() => omniRef.current?.focus(), 60); }, [omni]);

  // settings load
  const openSettings = async () => {
    setSettingsOpen(true); setLlmFit("checking");
    try { const j = await invoke<string>("get_device_specs_command"); setSpecs(JSON.parse(j)); } catch { /* */ }
    // offline check — if no model entity, show offline
    try {
      const v = await invoke<string>("get_entity_command", { key: "active_model" });
      setLlmFit(v && v !== "null" ? "ok" : "offline");
    } catch { setLlmFit("offline"); }
  };

  // auto-scroll
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { termEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [term]);

  // divider drag
  useEffect(() => {
    if (!drag) return;
    const mv = (e: MouseEvent) => setRatio(Math.min(0.78, Math.max(0.28, e.clientX / window.innerWidth)));
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [drag]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-deep-carbon text-text-primary" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* ── Custom titlebar (borderless) ─────────────────────────────── */}
      <div data-tauri-drag-region className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-deep-carbon/90 backdrop-blur-xl select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/20" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/20" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] border border-black/20" />
          </div>
          <span className="ml-2 text-[11px] tracking-[0.18em] uppercase text-text-muted" style={{ fontFamily: "Space Grotesk,sans-serif" }}>YUSRA</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ice-cyan/10 text-ice-cyan border border-ice-cyan/30">local</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={openSettings} title="Settings (Ctrl+,)" className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-text-muted hover:text-white transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Workspace split pane ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: Reasoning Stream */}
        <div style={{ width: `${ratio * 100}%` }} className="flex flex-col min-w-0 border-r border-refractive-edge bg-deep-carbon/40">
          <div className="h-8 shrink-0 flex items-center px-3 border-b border-refractive-edge text-[10px] tracking-widest uppercase text-text-muted">
            <MessageSquare className="h-3.5 w-3.5 mr-2 text-ice-cyan" /> Reasoning Stream
            {busy && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-ice-cyan" />}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scroll-thin">
            {msgs.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={cn("rounded-xl border p-3 text-[13px] leading-relaxed max-w-[92%]", m.fromUser ? "ml-auto bg-ice-cyan/10 border-ice-cyan/30" : "bg-glass-surface border-refractive-edge")}>
                {!m.fromUser && <div className="flex items-center gap-1.5 mb-1 text-[10px] tracking-wider uppercase text-ice-cyan"><Circle className="h-2 w-2 fill-ice-cyan" /> Yusra</div>}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </motion.div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-3 w-3 animate-spin text-ice-cyan" /> thinking… executing…</div>}
            <div ref={chatEnd} />
          </div>
          {/* chat input */}
          <form onSubmit={e => { e.preventDefault(); if (input.trim() && !busy) ask(input); }}
            className="shrink-0 p-2.5 border-t border-refractive-edge bg-deep-carbon/60 flex items-center gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Yusra… (Ctrl+Space for command bar)" disabled={busy} className="flex-1 h-9 text-[13px]" />
            <Button type="submit" size="icon" disabled={!input.trim() || busy} className="h-9 w-9 bg-ice-cyan text-deep-carbon hover:bg-ice-cyan/90 shrink-0"><Send className="h-4 w-4" /></Button>
            <button type="button" onClick={() => (document.querySelector<HTMLInputElement>('input[placeholder*="Ask Yusra"]')?.focus())} className="h-9 w-9 grid place-items-center rounded-lg border border-refractive-edge bg-glass-surface text-text-muted hover:text-white shrink-0"><Mic className="h-4 w-4" /></button>
          </form>
        </div>

        {/* draggable divider */}
        <div onMouseDown={e => { e.preventDefault(); setDrag(true); }}
          className={cn("w-1.5 shrink-0 cursor-col-resize hover:bg-ice-cyan/40 grid place-items-center transition-colors", drag && "bg-ice-cyan/60")}>
          <ChevronRight className="h-3 w-3 text-text-muted" />
        </div>

        {/* RIGHT: Live Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0c]">
          <div className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge text-[10px] tracking-widest uppercase text-text-muted">
            <span className="flex items-center gap-2"><Terminal className="h-3.5 w-3.5 text-ice-cyan" /> Live Terminal</span>
            <span className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-amber-400" : "bg-emerald-500")} />{busy ? "running" : "idle"}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed scroll-thin" style={{ fontFamily: "JetBrains Mono,monospace" }}>
            {term.map(l => (
              <div key={l.id} className={cn("whitespace-pre-wrap break-words py-0.5",
                l.kind === "cmd" && "text-ice-cyan", l.kind === "out" && "text-emerald-200/90", l.kind === "err" && "text-red-300/90", l.kind === "info" && "text-text-muted")}>{l.text}</div>
            ))}
            <div ref={termEnd} />
          </div>
        </div>
      </div>

      {/* ── Omni-Command Bar (Ctrl+Space) ───────────────────────────── */}
      <AnimatePresence>
        {omni && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-center pt-[18vh] bg-black/40 backdrop-blur-sm" onClick={() => setOmni(false)}>
            <motion.div initial={{ y: -24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -24, opacity: 0, scale: 0.98 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full max-w-[640px] mx-4">
              <div className="rounded-2xl border border-refractive-edge bg-[rgba(24,24,28,0.92)] backdrop-blur-[40px] shadow-[0_0_40px_rgba(0,240,255,0.15)] p-2">
                <div className="flex items-center gap-3 px-3">
                  <Command className="h-5 w-5 text-ice-cyan shrink-0" />
                  <input ref={omniRef} value={omniText} onChange={e => setOmniText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && omniText.trim()) { const t = omniText; setOmni(false); setOmniText(""); ask(t); } }}
                    placeholder="Tell Yusra what to build or run…" className="flex-1 h-11 bg-transparent outline-none text-[15px] placeholder:text-text-muted" />
                  {omniText.trim() && <Button size="sm" onClick={() => { const t = omniText; setOmni(false); setOmniText(""); ask(t); }} className="bg-ice-cyan text-deep-carbon hover:bg-ice-cyan/90">Run <ChevronRight className="h-3.5 w-3.5" /></Button>}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-refractive-edge px-2 text-[10px] text-text-muted">
                  <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> natural language → agentic execution</span>
                  <span>↵ run · Esc close</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: "spring", stiffness: 360, damping: 28 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full max-w-lg max-h-[86vh] flex flex-col rounded-2xl border border-refractive-edge bg-[rgba(24,24,28,0.96)] backdrop-blur-[40px] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-refractive-edge shrink-0">
                <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-ice-cyan" /><h2 className="text-[15px] font-semibold" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Device & LLM Fit</h2></div>
                <button onClick={() => setSettingsOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/10 text-text-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-thin">
                {/* LLM Fit */}
                <div className="rounded-xl border border-refractive-edge bg-deep-carbon/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-ice-cyan" /> LLM Fit</span>
                    {llmFit === "checking" && <Loader2 className="h-4 w-4 animate-spin text-text-muted" />}
                    {llmFit === "ok" && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">ready</span>}
                    {llmFit === "offline" && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">offline</span>}
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted leading-relaxed">
                    {llmFit === "checking" && "Profiling device…"}
                    {llmFit === "ok" && "Local GGUF model is loaded. Yusra can reason and execute entirely offline."}
                    {llmFit === "offline" && "No local GGUF model found. Use llmfit to find the best model for this device, then download it to enable inference."}
                  </p>
                </div>
                {/* Specs */}
                {specs ? (
                  <div className="space-y-2">
                    <div className="text-[11px] tracking-widest uppercase text-text-muted flex items-center gap-2"><Server className="h-3.5 w-3.5 text-ice-cyan" /> Device Specs</div>
                    <SpecRow icon={Cpu} label="CPU" value={`${specs.cpu_brand || "—"} · ${specs.cpu_cores ?? 0} cores · ${specs.cpu_frequency_mhz ?? 0} MHz`} />
                    <SpecRow icon={Brain} label="RAM" value={`${specs.total_ram_gb ?? "—"} GB total · ${specs.available_ram_gb ?? "—"} GB available`} />
                    <SpecRow icon={HardDrive} label="Memory Store" value="SQLite · episodic + entity_state" />
                    <SpecRow icon={Wifi} label="Network" value="Offline-only · no cloud" />
                    <SpecRow label="OS" value={`${specs.os || "—"} / ${specs.arch || "—"}`} icon={Server} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> loading specs…</div>
                )}
              </div>
              <div className="p-3 border-t border-refractive-edge flex items-center justify-between shrink-0">
                <span className="text-[11px] text-text-muted">100% local. No data leaves this machine.</span>
                <Button size="sm" onClick={() => setSettingsOpen(false)} className="bg-ice-cyan text-deep-carbon hover:bg-ice-cyan/90">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Danger Loop Confirmation ────────────────────────────────── */}
      <AnimatePresence>
        {dangerCmd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[rgba(28,20,8,0.96)] backdrop-blur-[40px] p-5 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-5 w-5" /><h3 className="text-sm font-semibold">High-risk command</h3></div>
              <p className="mt-2 text-xs text-amber-200/80">Yusra wants to run a command that could be destructive. Confirm explicitly to execute.</p>
              <pre className="mt-3 p-3 rounded-lg bg-black/50 border border-amber-500/20 text-xs text-amber-100 whitespace-pre-wrap break-words">{dangerCmd}</pre>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDangerCmd(null)} className="text-text-muted">Cancel</Button>
                <Button size="sm" onClick={confirmDanger} className="bg-amber-500 text-black hover:bg-amber-400">Confirm & Run</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpecRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-refractive-edge bg-deep-carbon/50 p-2.5">
      <Icon className="h-4 w-4 text-ice-cyan shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] tracking-wider uppercase text-text-muted">{label}</div>
        <div className="text-xs text-text-primary truncate">{value}</div>
      </div>
    </div>
  );
}
