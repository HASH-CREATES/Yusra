import { useState } from 'react';
import { Terminal as TerminalIcon, Code2 } from 'lucide-react';

interface CodePaneProps {
  lastResult?: { stdout: string; stderr: string } | null;
}

export default function CodePane({ lastResult }: CodePaneProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'terminal'>('terminal');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-white/5">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'code'
              ? 'border-moss text-moss'
              : 'border-transparent text-space-100 hover:text-space-50'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Code
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'terminal'
              ? 'border-moss text-moss'
              : 'border-transparent text-space-100 hover:text-space-50'
          }`}
        >
          <TerminalIcon className="w-4 h-4" />
          Terminal
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'terminal' ? (
          <div className="font-mono text-sm space-y-2">
            {lastResult ? (
              <>
                {lastResult.stdout && (
                  <div className="text-moss-light whitespace-pre-wrap">{lastResult.stdout}</div>
                )}
                {lastResult.stderr && (
                  <div className="text-red-400 whitespace-pre-wrap">{lastResult.stderr}</div>
                )}
              </>
            ) : (
              <div className="text-space-200">
                <p className="mb-2">Yusra Terminal v1.0</p>
                <p className="text-space-200/60">Command output will appear here.</p>
                <p className="mt-4 text-space-200/40">{'>'} _</p>
              </div>
            )}
          </div>
        ) : (
          <div className="font-mono text-sm text-space-200">
            <div className="text-space-200/60">
              <p>// Code output from Yusra actions</p>
              <p>// Will display syntax-highlighted code here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
