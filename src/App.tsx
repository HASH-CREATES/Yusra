import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Unplug } from 'lucide-react';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import TitleBar, { Sidebar } from './components/layout/TitleBar';
import CommandBar from './components/layout/CommandBar';
import ChatPane from './components/chat/ChatPane';
import CodePane from './components/chat/CodePane';
import VoiceOrb from './components/voice/VoiceOrb';
import { api } from './lib/api';
import type { OrbState } from './lib/types';

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('yusra_onboarding_complete') === 'true';
  });
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{ stdout: string; stderr: string } | null>(null);
  const [orbState, setOrbState] = useState<OrbState>('idle');

  const checkHealth = useCallback(() => {
    setBackendUp(null);
    api
      .health()
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('yusra_onboarding_complete', 'true');
    setOnboardingComplete(true);
  }, []);

  const handleCommandResult = useCallback((result: { stdout: string; stderr: string }) => {
    setLastResult(result);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (backendUp === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-space-500">
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="glass-heavy max-w-md mx-4 p-8 rounded-2xl text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Unplug className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Brain Offline</h1>
          <p className="text-space-100 text-sm mb-6">
            The Body can't reach The Brain on <span className="font-mono text-moss-light">127.0.0.1:8000</span>.
            Start the FastAPI backend and retry.
          </p>
          <div className="bg-space-400 rounded-xl p-4 mb-6 font-mono text-xs text-left overflow-x-auto">
            <code className="text-moss-light">
              cd backend
              <br />
              .\.venv\Scripts\activate
              <br />
              uvicorn backend.main:app --reload --port 8000
            </code>
          </div>
          <button
            onClick={checkHealth}
            className="btn-primary w-full h-12 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-space-500 text-space-50">
      <TitleBar onCommandBarToggle={() => setCommandBarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 flex overflow-hidden">
          {/* Split pane: Chat | Code/Terminal */}
          <div className="flex-1 border-r border-white/5 flex flex-col">
            {/* Voice Orb focal point */}
            <div className="flex items-center justify-center py-4 border-b border-white/5">
              <VoiceOrb state={backendUp === null ? 'thinking' : orbState} size={140} />
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatPane onOrbStateChange={setOrbState} onCommandResult={handleCommandResult} />
            </div>
          </div>
          <div className="flex-1">
            <CodePane lastResult={lastResult} />
          </div>
        </main>
      </div>

      <CommandBar isOpen={commandBarOpen} onClose={() => setCommandBarOpen(false)} />
    </div>
  );
}

export default App;
