import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

type YusraResponse = {
  system?: string;
  thought: string;
  action: string;
  context_used?: number;
};

type ExecResult = {
  stdout: string;
  stderr: string;
  requires_confirmation: boolean;
};

type Msg = { text: string; fromUser: boolean };

const App: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { text: 'Welcome to Yusra!', fromUser: false },
  ]);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '// Terminal output will appear here',
  ]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const send = async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    setMessages(prev => [...prev, { text: prompt, fromUser: true }]);
    setInput('');
    setIsExecuting(true);

    try {
      const json = await invoke<string>('ask_yusra_command', { prompt });
      let parsed: YusraResponse;
      try {
        parsed = JSON.parse(json) as YusraResponse;
      } catch {
        parsed = { thought: json, action: '' };
      }

      setMessages(prev => [
        ...prev,
        { text: '[thought] ' + parsed.thought, fromUser: false },
      ]);

      if (parsed.action && parsed.action.trim().length > 0) {
        setTerminalLines(prev => [...prev, '$ ' + parsed.action]);
        const result = await invoke<ExecResult>('execute_command_command', {
          cmd: parsed.action,
        });

        if (result.requires_confirmation) {
          setMessages(prev => [
            ...prev,
            { text: '[blocked] ' + result.stderr, fromUser: false },
          ]);
          setTerminalLines(prev => [
            ...prev,
            '! ' + (result.stderr || 'requires confirmation'),
          ]);
        } else {
          if (result.stdout) {
            setTerminalLines(prev => [...prev, result.stdout.trimEnd()]);
          }
          if (result.stderr) {
            setTerminalLines(prev => [
              ...prev,
              '[stderr] ' + result.stderr.trimEnd(),
            ]);
          }
          setMessages(prev => [
            ...prev,
            {
              text: result.stdout
                ? '[stdout]\n' + result.stdout.trimEnd()
                : result.stderr
                ? '[stderr]\n' + result.stderr.trimEnd()
                : '(no output)',
              fromUser: false,
            },
          ]);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { text: 'Error: ' + msg, fromUser: false }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send(input);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      await send(input);
    }
  };

  const handleMicClick = () => {
    const el = document.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (el) el.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const renderMessage = (msg: Msg, index: number) => {
    const containerClass = msg.fromUser
      ? 'bg-deep-carbon border-refractive-edge text-text-primary rounded-lg p-3'
      : 'bg-glass-surface border-refractive-edge text-text-primary rounded-lg p-3';
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={containerClass}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 whitespace-pre-wrap font-sans text-xl">{msg.text}</div>
          {msg.fromUser ? (
            <span className="text-xs text-interactive-glow shrink-0">
              {new Date().toLocaleTimeString()}
           </span>
          ) : null}
       </div>
     </motion.div>
    );
  };

  const renderTerminalLine = (line: string, i: number) => (
    <div key={i} className="text-gray-300 whitespace-pre-wrap">
      {line}
   </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="fixed top-0 w-full bg-deep-carbon border-refractive-edge p-3 shadow-lg z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-white text-lg font-medium">Yusra</span>
          <div className="relative flex-1 ml-4">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Yusra or search commands..."
              disabled={isExecuting}
              className="w-full pl-4 pr-10 py-2 rounded-full bg-glass-surface border-refractive-edge text-text-primary focus:outline-none focus:ring-2 focus:ring-ice-cyan"
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-interactive-glow"
              onClick={handleMicClick}
            >
              <Mic className="h-5 w-5" />
           </button>
         </div>
       </div>
     </div>

      <div className="flex flex-col md:flex-row min-h-screen pt-20">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(renderMessage)}
       </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-deep-carbon border-refractive-edge font-mono text-sm">
          {terminalLines.map(renderTerminalLine)}
       </div>
     </div>
   </div>
  );
};

export default App;
