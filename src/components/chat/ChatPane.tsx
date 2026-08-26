import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { Message, LlmResponse, CommandResult } from '../../lib/types';

interface ChatPaneProps {
  onDangerRequest: (cmd: string, risk: string) => void;
  onCommandResult?: (result: { stdout: string; stderr: string }) => void;
  onThinkingChange?: (thinking: boolean) => void;
}

export default function ChatPane({ onDangerRequest, onCommandResult, onThinkingChange }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    onThinkingChange?.(true);

    try {
      const raw = await invoke<string>('ask_yusra_command', { prompt: text });
      let parsed: LlmResponse;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { thought: null, speak: raw, action: null };
      }

      onThinkingChange?.(false);

      const yusraMsg: Message = {
        id: crypto.randomUUID(),
        role: 'yusra',
        content: parsed.speak,
        thought: parsed.thought ?? undefined,
        timestamp: Date.now(),
        action: parsed.action ?? undefined,
      };
      setMessages(prev => [...prev, yusraMsg]);

      if (parsed.action?.command) {
        const result = await invoke<CommandResult>('execute_command_command', { cmd: parsed.action.command });

        if (result.requires_confirmation) {
          onDangerRequest(parsed.action.command, result.risk_level);
        } else {
          setMessages(prev => prev.map(m =>
            m.id === yusraMsg.id ? { ...m, result } : m
          ));
          onCommandResult?.({ stdout: result.stdout, stderr: result.stderr });
        }
      }
    } catch (err) {
      onThinkingChange?.(false);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'yusra',
        content: `Error: ${err}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="font-display text-xl font-semibold mb-1">Yusra</h3>
            <p className="text-space-100 text-sm">Ask me anything. I run entirely on your device.</p>
          </div>
        )}

        {messages.map(msg => (
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
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-space-400 rounded-tr-sm'
                  : 'glass-light rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.result && (
                <div className="mt-2 glass-panel rounded-xl p-3 font-mono text-xs">
                  {msg.result.stdout && <p className="text-moss">{msg.result.stdout}</p>}
                  {msg.result.stderr && <p className="text-red-400">{msg.result.stderr}</p>}
                </div>
              )}
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask Yusra anything..."
            className="flex-1 bg-transparent text-space-50 placeholder-space-200 outline-none font-body text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg bg-moss flex items-center justify-center disabled:opacity-40 transition-all hover:bg-moss-light shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
