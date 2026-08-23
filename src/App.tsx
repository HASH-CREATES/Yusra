import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Settings, Terminal, MessageSquare, Send, Mic, Cpu, HardDrive, Brain, Wifi,
  AlertTriangle, X, Loader2, Circle, Command, Sparkles, ChevronRight, Activity, Server, Zap, Layers, Orbit,
  ListTodo, Play, Star, Trash2, RotateCcw, Plus, Bookmark, History, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Onboarding, Splash } from "@/components/Onboarding";

// ── Types ────────────────────────────────────────────────────────────────
type YusraResponse = { system?: string; thought: string; action: string; context_used?: number; harness_runs?: number };
type ExecResult = { stdout: string; stderr: string; requires_confirmation: boolean };
type Msg = { id: string; text: string; fromUser: boolean };
type TLine = { id: string; text: string; kind: "cmd" | "out" | "err" | "info" };
type Specs = { os?: string; arch?: string; cpu_brand?: string; cpu_cores?: number; cpu_frequency_mhz?: number; total_ram_gb?: number; available_ram_gb?: number } | null;
type Task = { id: number; title: string; prompt: string; status: string; result: string; run_count: number; is_favorite: boolean; created_at: number; last_run: number | null };

const uid = () => Math.random().toString(36).slice(2, 9);

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 28 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16 } },
};

export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "w", text: "YUSRA — YUSRA mode online. Local entity, everywhere on this device. Ctrl+Space to summon. Tasks are re-runnable · Harness learns every run.", fromUser: false },
  ]);
  const [term, setTerm] = useState<TLine[]>([{ id: "t0", text: "▸ harness idle — awaiting command", kind: "info" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [omni, setOmni] = useState(false);
  const [omniText, setOmniText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [specs, setSpecs] = useState<Specs>(null);
  const [llmFit, setLlmFit] = useState<"checking" | "ok" | "offline">("checking");
  const [ratio, setRatio] = useState(0.52);
  const [drag, setDrag] = useState(false);
  const [dangerCmd, setDangerCmd] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [harnessRuns, setHarnessRuns] = useState<number>(0);
  const [lastContext, setLastContext] = useState<number>(0);
  const [learningPulse, setLearningPulse] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPrompt, setNewTaskPrompt] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const chatEnd = useRef<HTMLDivElement>(null);
  const termEnd = useRef<HTMLDivElement>(null);
  const omniRef = useRef<HTMLInputElement>(null);

  const pushMsg = useCallback((text: string, fromUser: boolean) => setMsgs(m => [...m, { id: uid(), text, fromUser }]), []);
  const pushTerm = useCallback((text: string, kind: TLine["kind"] = "out") => setTerm(t => [...t, { id: uid(), text, kind }]), []);

  const refreshTasks = useCallback(async () => {
    try { const j = await invoke<string>("list_tasks_command"); setTasks(JSON.parse(j)); } catch { /* */ }
  }, []);
  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  const refreshHarness = useCallback(async () => {
    try {
      const v = await invoke<string>("get_entity_command", { key: "harness:runs" });
      const n = parseInt(v.replace(/"/g, ""), 10); if (!Number.isNaN(n)) setHarnessRuns(n);
    } catch { /* */ }
  }, []);
  useEffect(() => { refreshHarness(); }, [refreshHarness]);

  // startup: splash 1.1s then check onboarding_done
  useEffect(() => {
    const t = setTimeout(async () => {
      setShowSplash(false);
      try {
        const v = await invoke<string>("get_entity_command", { key: "onboarding_done" });
        const done = v.includes("true");
        setShowOnboarding(!done);
      } catch { setShowOnboarding(true); }
    }, 1100);
    return () => clearTimeout(t);
  }, []);
  const completeOnboarding = useCallback(async () => {
    try { await invoke<string>("set_entity_command", { key: "onboarding_done", value_json: "true" }); } catch { /* */ }
    setShowOnboarding(false);
  }, []);

  const ask = async (raw: string) => {
    const prompt = raw.trim(); if (!prompt) return;
    pushMsg(prompt, true); setInput(""); setBusy(true); setLearningPulse(false);
    try {
      const json = await invoke<string>("ask_yusra_command", { prompt });
      let p: YusraResponse; try { p = JSON.parse(json); } catch { p = { thought: json, action: "" }; }
      if (p.harness_runs) setHarnessRuns(p.harness_runs);
      if (typeof p.context_used === "number") setLastContext(p.context_used);
      if (p.context_used && p.context_used > 0) { setLearningPulse(true); setTimeout(() => setLearningPulse(false), 1400); }
      pushMsg(p.thought || "(no thought)", false);
      if (p.action?.trim()) {
        if (dangerCmd === null && ["rm -rf", "mkfs", "dd "].some(k => p.action.toLowerCase().includes(k))) {
          setDangerCmd(p.action); setBusy(false); return;
        }
        pushTerm("$ " + p.action, "cmd");
        const r = await invoke<ExecResult>("execute_command_command", { cmd: p.action });
        if (r.requires_confirmation) {
          pushTerm("✕ blocked — needs confirm", "err");
          pushMsg("Blocked: " + (r.stderr || "Dangerous command"), false);
        } else {
          if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
          if (r.stderr) pushTerm("· " + r.stderr.trimEnd(), "err");
          pushMsg(r.stdout ? r.stdout.trimEnd() : r.stderr ? r.stderr.trimEnd() : "(no output)", false);
        }
      }
      refreshHarness();
    } catch (e) { const m = e instanceof Error ? e.message : String(e); pushTerm("✕ " + m, "err"); pushMsg("Error: " + m, false); }
    finally { setBusy(false); }
  };

  const confirmDanger = async () => {
    if (!dangerCmd) return; const cmd = dangerCmd; setDangerCmd(null);
    pushTerm("$ " + cmd + " — confirmed", "cmd");
    try {
      const r = await invoke<ExecResult>("execute_command_command", { cmd });
      if (r.stdout) pushTerm(r.stdout.trimEnd(), "out");
      if (r.stderr) pushTerm(r.stderr.trimEnd(), "err");
      pushMsg(r.stdout?.trimEnd() || r.stderr?.trimEnd() || "(no output)", false);
    } catch (e) { pushTerm("✕ " + String(e), "err"); }
  };

  // tasks actions — re-runnable harness
  const createTask = async () => {
    const title = newTaskTitle.trim() || newTaskPrompt.trim().slice(0, 40) || "Untitled task";
    const prompt = newTaskPrompt.trim() || newTaskTitle.trim();
    if (!prompt) return;
    try { const j = await invoke<string>("create_task_command", { title, prompt }); setTasks(JSON.parse(j)); setNewTaskTitle(""); setNewTaskPrompt(""); } catch { /* */ }
  };
  const runTask = async (id: number) => {
    setBusy(true);
    try { const j = await invoke<string>("run_task_command", { id }); setTasks(JSON.parse(j)); const t = JSON.parse(j).find((x: Task) => x.id === id); if (t) { pushMsg(`↻ re-ran: ${t.title}`, false); pushTerm(`› task #${id}: ${t.result.slice(0, 400)}`, t.status === "failed" ? "err" : "out"); } refreshHarness(); } catch { } finally { setBusy(false); }
  };
  const deleteTask = async (id: number) => { try { const j = await invoke<string>("delete_task_command", { id }); setTasks(JSON.parse(j)); } catch { } };
  const toggleFav = async (id: number) => { try { const j = await invoke<string>("toggle_favorite_task_command", { id }); setTasks(JSON.parse(j)); } catch { } };

  // shortcuts — YUSRA everywhere
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") { e.preventDefault(); setOmni(o => !o); setOmniText(""); }
      else if (e.key === "Escape") { setOmni(false); setSettingsOpen(false); setDangerCmd(null); }
      else if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); if (!settingsOpen) openSettings(); else setSettingsOpen(false); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && e.shiftKey) { e.preventDefault(); setTasksOpen(o => !o); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [settingsOpen]);
  useEffect(() => { if (omni) setTimeout(() => omniRef.current?.focus(), 70); }, [omni]);

  const openSettings = async () => {
    setSettingsOpen(true); setLlmFit("checking");
    try { const j = await invoke<string>("get_device_specs_command"); setSpecs(JSON.parse(j)); } catch { }
    try { const v = await invoke<string>("get_entity_command", { key: "active_model" }); setLlmFit(v && v !== "null" ? "ok" : "offline"); } catch { setLlmFit("offline"); }
  };

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { termEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [term]);

  useEffect(() => {
    if (!drag) return;
    const mv = (e: MouseEvent) => setRatio(Math.min(0.72, Math.max(0.34, e.clientX / window.innerWidth)));
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [drag]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-deep-carbon text-text-primary relative" style={{ fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* Startup + Onboarding */}
      <AnimatePresence>
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showOnboarding && !showSplash && <Onboarding onComplete={completeOnboarding} onSkip={completeOnboarding} />}
      </AnimatePresence>

      {/* YUSRA grid + aurora — cyan/amber/emerald only, no violet */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="yusra-grid" />
        <motion.div className="yusra-aurora" animate={{ x: [0, 14, -8, 0], y: [0, -8, 6, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <div className="yusra-scanline" style={{ animation: "scan 3.2s linear infinite" }} />
      </div>

      {/* Titlebar — YUSRA HUD */}
      <div data-tauri-drag-region className="relative z-20 h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-deep-carbon/85 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <motion.span whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }} className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/20 cursor-pointer" />
            <motion.span whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }} className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/20 cursor-pointer" />
            <motion.span whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }} className="h-3 w-3 rounded-full bg-[#28c840] border border-black/20 cursor-pointer" />
          </div>
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }} className="ml-2 flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-ice-cyan grid place-items-center shadow-glow-cyan">
              <Orbit className="h-3.5 w-3.5 text-deep-carbon" />
            </div>
            <span className="text-[11px] tracking-[0.22em] uppercase font-bold" style={{ fontFamily: "Space Grotesk,sans-serif" }}>YUSRA</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-ice-subtle text-ice-cyan border border-ice-cyan/20">
              <span className="h-1.5 w-1.5 rounded-full bg-ice-cyan animate-pulse" /> YUSRA · everywhere
            </span>
          </motion.div>
          <div className="hidden lg:flex items-center gap-1.5 ml-3">
            <span className="h-5 px-2 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-1.5 text-[10px]">
              <Activity className="h-3 w-3 text-ice-cyan" /> harness {harnessRuns}
            </span>
            <motion.span animate={learningPulse ? { scale: [1, 1.06, 1], borderColor: ["rgba(0,240,255,0.18)", "rgba(0,240,255,0.45)", "rgba(0,240,255,0.18)"] } : {}} className="h-5 px-2 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-1.5 text-[10px]">
              <Brain className="h-3 w-3 text-yusra-emerald" /> ctx {lastContext}
              {learningPulse && <span className="h-1.5 w-1.5 rounded-full bg-yusra-emerald animate-pulse" />}
            </motion.span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setTasksOpen(o => !o)} title="Tasks (Ctrl+Shift+K)" className={cn("h-7 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs", tasksOpen ? "bg-ice-cyan text-deep-carbon border-ice-cyan" : "bg-white/[0.06] border-white/10 text-text-muted hover:text-white")}>
            <ListTodo className="h-3.5 w-3.5" /> Tasks
          </motion.button>
          <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }} onClick={openSettings} title="Settings (Ctrl+,)" className="h-7 w-7 grid place-items-center rounded-lg bg-white/[0.06] border border-white/10 text-text-muted hover:text-white">
            <Settings className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Harness strip — YUSRA status */}
      <div className="relative z-10 h-7 shrink-0 flex items-center gap-2 px-3 border-b border-refractive-edge bg-white/[0.03] backdrop-blur-md text-[10px]">
        <span className="flex items-center gap-1.5 text-text-muted"><Layers className="h-3 w-3 text-ice-cyan" /> HARNESS</span>
        <span className="h-3 w-px bg-white/10" />
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yusra-amber" /> {harnessRuns} runs</span>
        <span className="flex items-center gap-1"><History className="h-3 w-3 text-text-muted" /> {tasks.length} tasks</span>
        <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-yusra-emerald" /> self-learning {lastContext > 0 ? "active" : "warmup"}</span>
        <span className="ml-auto hidden sm:flex items-center gap-1.5 text-text-faint">Ctrl+Space omni · Ctrl+Shift+K tasks · Ctrl+, settings</span>
      </div>

      {/* Workspace */}
      <div className="relative z-10 flex-1 flex overflow-hidden min-h-0 p-2 gap-2">
        {/* Tasks — re-runnable, harness-driven */}
        <AnimatePresence initial={false}>
          {tasksOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="shrink-0 flex flex-col overflow-hidden rounded-2xl border border-refractive-edge bg-glass-surface backdrop-blur-[20px] shadow-glass"
            >
              <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-ice-subtle">
                <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase font-semibold">
                  <div className="h-6 w-6 rounded-lg bg-ice-cyan/15 border border-ice-cyan/20 grid place-items-center"><ListTodo className="h-3.5 w-3.5 text-ice-cyan" /></div>
                  Tasks
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10">{tasks.length}</span>
              </div>

              {/* create */}
              <div className="p-2.5 border-b border-refractive-edge space-y-2 bg-white/[0.02]">
                <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title (e.g. List workspace)" className="h-8 text-xs bg-white/[0.04] border-white/10" />
                <Input value={newTaskPrompt} onChange={e => setNewTaskPrompt(e.target.value)} placeholder="Prompt to re-run (natural language)" className="h-8 text-xs bg-white/[0.04] border-white/10" onKeyDown={e => { if (e.key === "Enter") createTask(); }} />
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={createTask} className="w-full h-8 rounded-xl bg-ice-cyan text-deep-carbon text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-cyan">
                  <Plus className="h-3.5 w-3.5" /> Create re-runnable task
                </motion.button>
                <div className="flex gap-1.5">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setNewTaskTitle("List files"); setNewTaskPrompt("list files"); }} className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/10 text-[11px]">List</motion.button>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setNewTaskTitle("Disk usage"); setNewTaskPrompt("disk space"); }} className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/10 text-[11px]">Disk</motion.button>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setNewTaskTitle("Where am I"); setNewTaskPrompt("where am i"); }} className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/10 text-[11px]">PWD</motion.button>
                </div>
              </div>

              {/* list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scroll-thin">
                {tasks.length === 0 && <div className="text-xs text-text-faint text-center py-8">No tasks yet — create one above. Every task is harness-driven and re-runnable forever.</div>}
                {tasks.map(t => (
                  <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate flex items-center gap-1.5">
                          {t.is_favorite && <Star className="h-3 w-3 text-yusra-amber fill-yusra-amber shrink-0" />}
                          {t.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate">{t.prompt}</div>
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border shrink-0", t.status === "done" ? "bg-yusra-emerald/15 text-yusra-emerald border-yusra-emerald/20" : t.status === "failed" ? "bg-red-500/15 text-red-300 border-red-500/20" : t.status === "running" ? "bg-yusra-amber/15 text-yusra-amber border-yusra-amber/20" : "bg-white/5 text-text-muted border-white/10")}>{t.status} · {t.run_count}×</span>
                    </div>
                    {t.result && <div className="text-[11px] font-mono bg-black/30 border border-white/5 rounded-lg p-2 max-h-20 overflow-y-auto whitespace-pre-wrap break-words">{t.result.slice(0, 300)}</div>}
                    <div className="flex items-center gap-1.5">
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => runTask(t.id)} disabled={busy} className="flex-1 h-7 rounded-lg bg-ice-cyan text-deep-carbon text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                        <Play className="h-3 w-3" /> Re-run
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => toggleFav(t.id)} className={cn("h-7 w-7 grid place-items-center rounded-lg border", t.is_favorite ? "bg-yusra-amber text-deep-carbon border-yusra-amber" : "bg-white/[0.06] border-white/10")}>
                        <Bookmark className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => deleteTask(t.id)} className="h-7 w-7 grid place-items-center rounded-lg bg-white/[0.06] border border-white/10 hover:bg-red-500/15">
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center — Reasoning Stream */}
        <motion.div style={{ width: tasksOpen ? `${ratio * 100}%` : "52%" }} layout className="flex flex-col min-w-0 rounded-2xl overflow-hidden border border-refractive-edge bg-glass-surface backdrop-blur-[20px] shadow-glass">
          <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-refractive-edge bg-ice-subtle">
            <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase font-semibold">
              <div className="h-6 w-6 rounded-lg bg-ice-cyan/15 border border-ice-cyan/20 grid place-items-center"><MessageSquare className="h-3.5 w-3.5 text-ice-cyan" /></div>
              Reasoning Stream
              {learningPulse && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-yusra-emerald animate-pulse" />}
            </div>
            <div className="flex items-center gap-1.5">
              <AnimatePresence>{busy && <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="h-6 px-2 rounded-full bg-ice-cyan/15 border border-ice-cyan/20 flex items-center gap-1.5 text-[10px] text-ice-cyan"><Loader2 className="h-3 w-3 animate-spin" /> harness</motion.span>}</AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-thin">
            <LayoutGroup>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                {msgs.map(m => (
                  <motion.div key={m.id} variants={itemVariants} layout whileHover={{ y: -1 }} className={cn("relative rounded-2xl border p-3.5 text-[13.5px] leading-relaxed max-w-[92%] overflow-hidden", m.fromUser ? "ml-auto bg-ice-cyan/[0.10] border-ice-cyan/20 shadow-glow-cyan" : "bg-white/[0.04] border-white/10")}>
                    {!m.fromUser && <div className="flex items-center gap-2 mb-1.5"><span className="h-5 w-5 rounded-full bg-ice-cyan grid place-items-center"><Sparkles className="h-3 w-3 text-deep-carbon" /></span><span className="text-[10px] tracking-[0.14em] uppercase font-bold text-ice-cyan">YUSRA</span><span className="ml-auto h-1.5 w-1.5 rounded-full bg-yusra-emerald animate-pulse" /></div>}
                    <div className={cn("whitespace-pre-wrap break-words", m.fromUser ? "text-white" : "text-white/90")}>{m.text}</div>
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/[0.05]" />
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
            <AnimatePresence>
              {busy && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2 text-xs text-text-muted"><span className="h-7 px-3 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-2"><span className="flex gap-1"><motion.span className="h-1.5 w-1.5 rounded-full bg-ice-cyan" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity }} /><motion.span className="h-1.5 w-1.5 rounded-full bg-white" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} /><motion.span className="h-1.5 w-1.5 rounded-full bg-yusra-emerald" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} /></span> harness executing</span></motion.div>}
            </AnimatePresence>
            <div ref={chatEnd} />
          </div>

          <motion.form onSubmit={e => { e.preventDefault(); if (input.trim() && !busy) ask(input); }} className="shrink-0 p-2.5 border-t border-refractive-edge bg-deep-carbon/40 backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-ice-cyan/30 focus-within:shadow-glow-cyan transition-all">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask YUSRA…  Ctrl+Space everywhere" disabled={busy} className="flex-1 h-9 bg-transparent border-0 focus-visible:ring-0 text-[13.5px] placeholder:text-text-faint" />
              <motion.button type="submit" disabled={!input.trim() || busy} whileHover={{ scale: input.trim() && !busy ? 1.04 : 1 }} whileTap={{ scale: 0.96 }} className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-ice-cyan text-deep-carbon shadow-glow-cyan disabled:opacity-40">
                <Send className="h-4 w-4" />
              </motion.button>
              <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { const v = input.trim(); if (v) { const title = v.slice(0, 32); invoke<string>("create_task_command", { title, prompt: v }).then(j => setTasks(JSON.parse(j))); } }} title="Save as re-runnable task" className="h-9 w-9 shrink-0 grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-text-muted hover:text-white">
                <Plus className="h-4 w-4" />
              </motion.button>
              <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="h-9 w-9 shrink-0 grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-text-muted hover:text-white">
                <Mic className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-faint px-1">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yusra-amber" /> YUSRA everywhere · local only</span>
              <span className="hidden sm:inline flex items-center gap-1"><RotateCcw className="h-3 w-3" /> + to save task · tasks re-run forever</span>
            </div>
          </motion.form>
        </motion.div>

        {/* divider */}
        <motion.div onMouseDown={e => { e.preventDefault(); setDrag(true); }} whileHover={{ backgroundColor: "rgba(0,240,255,0.14)" }} className={cn("w-1.5 shrink-0 rounded-full cursor-col-resize grid place-items-center self-center h-[36%] border border-white/5 bg-white/[0.04]", drag && "bg-ice-cyan/25")}>
          <ChevronRight className="h-3 w-3 text-text-muted" />
        </motion.div>

        {/* Right — Live Terminal / Harness */}
        <motion.div layout className="flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden border border-refractive-edge bg-[#0B0B0E] shadow-glass">
          <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-white/10 bg-white/[0.04]">
            <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase font-semibold">
              <div className="h-6 w-6 rounded-lg bg-yusra-emerald/15 border border-yusra-emerald/20 grid place-items-center"><Terminal className="h-3.5 w-3.5 text-yusra-emerald" /></div>
              Harness · Live
            </div>
            <motion.span key={busy ? "run" : "idle"} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("h-6 px-2.5 rounded-full border flex items-center gap-1.5 text-[10px] font-medium", busy ? "bg-yusra-amber/15 border-yusra-amber/20 text-yusra-amber" : "bg-yusra-emerald/12 border-yusra-emerald/20 text-yusra-emerald")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-yusra-amber animate-pulse" : "bg-yusra-emerald")} />{busy ? "running" : "idle"}
            </motion.span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[12.5px] leading-relaxed scroll-thin" style={{ fontFamily: "JetBrains Mono,monospace" }}>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-1">
              {term.map(l => (
                <motion.div key={l.id} variants={itemVariants} className={cn("whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 border", l.kind === "cmd" && "bg-ice-cyan/[0.08] border-ice-cyan/15 text-ice-cyan", l.kind === "out" && "bg-yusra-emerald/[0.06] border-yusra-emerald/10 text-emerald-200/90", l.kind === "err" && "bg-red-500/[0.08] border-red-500/15 text-red-300/90", l.kind === "info" && "bg-white/[0.03] border-white/5 text-text-muted")}>
                  {l.text}
                </motion.div>
              ))}
            </motion.div>
            <div ref={termEnd} />
          </div>
          <div className="h-7 shrink-0 flex items-center px-3 border-t border-white/5 bg-white/[0.02] text-[10px] text-text-faint">
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-yusra-emerald text-yusra-emerald animate-pulse" /> harness streams — self-learning from every run</span>
          </div>
        </motion.div>
      </div>

      {/* Omni — YUSRA everywhere (Ctrl+Space from any pane) */}
      <AnimatePresence>
        {omni && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-center pt-[14vh] bg-black/55 backdrop-blur-[6px] p-4" onClick={() => setOmni(false)}>
            <motion.div initial={{ y: -20, opacity: 0, scale: 0.98, filter: "blur(8px)" }} animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ y: -18, opacity: 0, scale: 0.98, filter: "blur(8px)" }} transition={{ type: "spring", stiffness: 420, damping: 30 }} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full max-w-[640px]">
              <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-glass-strong backdrop-blur-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_36px_rgba(0,240,255,0.12)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ice-cyan/35 to-transparent" />
                <div className="relative flex items-center gap-3 px-4 py-3">
                  <motion.div animate={{ rotate: omniText ? 10 : 0 }} className="h-9 w-9 rounded-xl bg-ice-cyan grid place-items-center shadow-glow-cyan shrink-0">
                    <Command className="h-5 w-5 text-deep-carbon" />
                  </motion.div>
                  <input ref={omniRef} value={omniText} onChange={e => setOmniText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && omniText.trim()) { const t = omniText; setOmni(false); setOmniText(""); ask(t); } }} placeholder="YUSRA — tell me what to do, anywhere…" className="flex-1 h-11 bg-transparent outline-none text-[15px] placeholder:text-text-faint" />
                  <AnimatePresence>
                    {omniText.trim() && <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}><Button size="sm" onClick={() => { const t = omniText; setOmni(false); setOmniText(""); ask(t); }} className="rounded-xl bg-ice-cyan text-deep-carbon shadow-glow-cyan">Run <ChevronRight className="h-3.5 w-3.5" /></Button></motion.div>}
                  </AnimatePresence>
                </div>
                <div className="px-2 pb-2">
                  <div className="rounded-xl bg-black/25 border border-white/5 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      ["List files", "list files"],
                      ["Disk usage", "disk space"],
                      ["Where am I", "where am i"],
                      ["System time", "date and time"],
                    ].map(([label, prompt]) => (
                      <motion.button key={label} whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.06)" }} whileTap={{ scale: 0.99 }} onClick={() => { setOmni(false); setOmniText(""); ask(prompt); }} className="text-left px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-ice-cyan/20">
                        <div className="text-xs font-medium text-white">{label}</div>
                        <div className="text-[11px] text-text-muted truncate">{prompt}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-black/10 text-[10px] text-text-faint">
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-ice-cyan" /> YUSRA — natural language → harness execution</span>
                  <span>↵ run · Esc close</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[8px] p-4" onClick={() => setSettingsOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.96, y: 16, filter: "blur(8px)" }} transition={{ type: "spring", stiffness: 360, damping: 28 }} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full max-w-lg max-h-[86vh] flex flex-col rounded-[20px] border border-white/10 bg-glass-strong backdrop-blur-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="relative h-20 shrink-0 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-ice-cyan/12 via-white/[0.02] to-yusra-amber/06" />
                <div className="relative h-full flex items-center justify-between px-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 grid place-items-center backdrop-blur-md"><Settings className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Device & Harness</h2>
                      <p className="text-xs text-text-muted">YUSRA local · no cloud</p>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => setSettingsOpen(false)} className="h-8 w-8 grid place-items-center rounded-xl bg-white/10 border border-white/10 text-white/70 hover:text-white"><X className="h-4 w-4" /></motion.button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-thin">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl grid place-items-center border", llmFit === "ok" ? "bg-yusra-emerald/15 border-yusra-emerald/20" : llmFit === "offline" ? "bg-yusra-amber/15 border-yusra-amber/20" : "bg-ice-cyan/10 border-ice-cyan/20")}>
                        <Activity className={cn("h-5 w-5", llmFit === "ok" ? "text-yusra-emerald" : llmFit === "offline" ? "text-yusra-amber" : "text-ice-cyan")} />
                      </div>
                      <div><div className="text-sm font-semibold">Harness Learning</div><div className="text-xs text-text-muted">{harnessRuns} runs · {lastContext} context hits</div></div>
                    </div>
                    {llmFit === "checking" && <span className="h-6 px-2.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> checking</span>}
                    {llmFit === "ok" && <span className="h-6 px-2.5 rounded-full bg-yusra-emerald/15 border border-yusra-emerald/20 text-yusra-emerald text-xs flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yusra-emerald animate-pulse" /> ready</span>}
                    {llmFit === "offline" && <span className="h-6 px-2.5 rounded-full bg-yusra-amber/15 border border-yusra-amber/20 text-yusra-amber text-xs">offline</span>}
                  </div>
                  <p className="relative mt-3 text-xs leading-relaxed text-text-muted">
                    {llmFit === "checking" && "Profiling device…"}
                    {llmFit === "ok" && "Harness learns from every run. Episodic memory recalls prior successes to improve the next action."}
                    {llmFit === "offline" && "No local model — harness still learns from command patterns. Add a GGUF to unlock full inference."}
                  </p>
                  <div className="relative mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", llmFit === "ok" ? "bg-ice-cyan" : llmFit === "offline" ? "bg-yusra-amber" : "bg-white/40")} initial={{ width: "22%" }} animate={{ width: llmFit === "checking" ? "42%" : llmFit === "ok" ? "86%" : "38%" }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
                  </div>
                </motion.div>
                {specs ? (
                  <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
                    <div className="text-[11px] tracking-widest uppercase text-text-muted flex items-center gap-2"><Server className="h-3.5 w-3.5 text-ice-cyan" /> Device</div>
                    <div className="grid gap-2">
                      {[
                        [Cpu, "CPU", `${specs.cpu_brand || "—"} · ${specs.cpu_cores ?? 0} cores · ${specs.cpu_frequency_mhz ?? 0} MHz`],
                        [Brain, "Memory", `${specs.total_ram_gb ?? "—"} GB total · ${specs.available_ram_gb ?? "—"} GB free`],
                        [HardDrive, "Store", "SQLite · episodic + tasks + entity_state"],
                        [Wifi, "Network", "Offline-only · no cloud"],
                        [Server, "Platform", `${specs.os || "—"} / ${specs.arch || "—"}`],
                      ].map(([Icon, label, value]) => (
                        <motion.div key={String(label)} variants={itemVariants} whileHover={{ y: -1 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <div className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center shrink-0"><span className="text-ice-cyan"><Icon className="h-4 w-4" /></span></div>
                          <div className="min-w-0 flex-1"><div className="text-[10px] tracking-widest uppercase text-text-muted">{String(label)}</div><div className="text-xs text-white/90 truncate">{String(value)}</div></div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…</div>}
              </div>
              <div className="p-3 border-t border-white/10 bg-black/10 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-text-muted">100% local · YUSRA on this device</span>
                <Button size="sm" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-ice-cyan text-deep-carbon shadow-glow-cyan">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Danger */}
      <AnimatePresence>
        {dangerCmd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-[8px] p-4">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="w-full max-w-md overflow-hidden rounded-[20px] border border-yusra-amber/30 bg-[rgba(26,18,6,0.96)] backdrop-blur-[32px]">
              <div className="h-1 w-full bg-yusra-amber" />
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-yusra-amber/15 border border-yusra-amber/25 grid place-items-center"><AlertTriangle className="h-5 w-5 text-yusra-amber" /></div>
                  <div><h3 className="text-sm font-semibold text-amber-100">High-risk command</h3><p className="text-xs text-amber-200/70">Needs explicit confirm</p></div>
                </div>
                <pre className="mt-3 p-3 rounded-xl bg-black/50 border border-yusra-amber/20 text-xs text-amber-100 whitespace-pre-wrap break-words font-mono">{dangerCmd}</pre>
                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setDangerCmd(null)} className="rounded-xl">Cancel</Button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmDanger} className="h-9 px-4 rounded-xl bg-yusra-amber text-deep-carbon text-sm font-medium">Confirm & Run</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
