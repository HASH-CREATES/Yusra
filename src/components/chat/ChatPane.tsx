import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Terminal } from 'lucide-react';
import { api } from '../../lib/api';
import type { AgentStep, AgentTurn, Message, OrbState } from '../../lib/types';
import DangerModal from '../danger/DangerModal';

interface ChatPaneProps {
  onOrbStateChange?: (state: OrbState) => void;
  onCommandResult?: (result: { stdout: string; stderr: string }) => void;
}

interface Pending {
  id: string;
  command: string;
  risk: string;
}

function StepBlocks({ steps }: { steps?: AgentStep[] }) {
  if (!steps?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {steps.map((s, i) =>
        s.action && s.action.type !== 'done' ? (
          <div key={i} className="glass-panel rounded-xl p-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-space-200 mb-1">
              <Terminal className="w-3 h-3" />
              <span className="uppercase tracking-wide">{s.action.type}</span>
            </div>
            <code className="text-moss-light whitespace-pre-wrap break-all">{s.action.code}</code>
            {s.observation && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                {s.observation.stdout && (
                  <p className="text-space-100 whitespace-pre-wrap max-h-40 overflow-y-auto">{s.observation.stdout}</p>
                )}
                {s.observation.stderr && (
                  <p className="text-red-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{s.observation.stderr}</p>
                )}
                <p className="text-space-200">
                  exit {s.observation.exit_code} · {s.observation.duration_ms}ms
                </p>
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function ChatPane({ onOrbStateChange, onCommandResult }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [resolving, setResolving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleTurn = (turn: AgentTurn) => {
    const withObs = turn.steps?.filter((s) => s.observation) ?? [];
    const lastObs = withObs[withObs.length - 1]?.observation;
    if (lastObs) onCommandResult?.({ stdout: lastObs.stdout, stderr: lastObs.stderr });

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'yusra',
        content: turn.final_speak || '(no response)',
        timestamp: Date.now(),
        steps: turn.steps,
      },
    ]);

    if (turn.status === 'pending_confirmation' && turn.confirmation_id && turn.command) {
      setPending({ id: turn.confirmation_id, command: turn.command, risk: turn.risk_level ?? 'medium' });
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || pending) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
    ]);
    setInput('');
    setLoading(true);
    onOrbStateChange?.('thinking');

    try {
      handleTurn(await api.chat(text, sessionId.current));
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'yusra', content: `Brain error: ${err}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
      onOrbStateChange?.('idle');
    }
  };

  const resolveDanger = async (approved: boolean) => {
    if (!pending || resolving) return;
    setResolving(true);
    onOrbStateChange?.('thinking');
    try {
      const turn = await api.confirm(pending.id, approved);
      setPending(null);
      handleTurn(turn);
    } catch (err) {
      setPending(null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'yusra', content: `Brain error: ${err}`, timestamp: Date.now() },
      ]);
    } finally {
      setResolving(false);
      onOrbStateChange?.('idle');
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="font-display text-xl font-semibold mb-1">Yusra</h3>
            <p className="text-space-100 text-sm">Ask me anything. I run entirely on your device.</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'yusra' && (
              <div className="w-8 h-8 rounded-full bg-moss/20 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-moss" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              {msg.thought && (
                <div className="text-xs text-space-200 mb-1 font-mono italic">Thinking: {msg.thought}</div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user' ? 'bg-space-400 rounded-tr-sm' : 'glass-light rounded-tl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'yusra' && <StepBlocks steps={msg.steps} />}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-moss/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-moss" />
            </div>
            <div className="glass-light rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-moss rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-moss rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-moss rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="glass-panel flex items-center gap-3 px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={pending ? 'Awaiting your decision on the pending command...' : 'Ask Yusra anything...'}
            className="flex-1 bg-transparent text-space-50 placeholder-space-200 outline-none font-body text-sm"
            disabled={loading || !!pending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || !!pending}
            className="w-9 h-9 rounded-lg bg-moss flex items-center justify-center disabled:opacity-40 transition-all hover:bg-moss-light shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {pending && (
        <DangerModal
          command={pending.command}
          riskLevel={pending.risk}
          busy={resolving}
          onApprove={() => resolveDanger(true)}
          onDeny={() => resolveDanger(false)}
        />
      )}
    </div>
  );
}
