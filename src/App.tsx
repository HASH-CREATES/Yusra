import { useState, useCallback, useEffect } from 'react';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import TitleBar, { Sidebar } from './components/layout/TitleBar';
import CommandBar from './components/layout/CommandBar';
import ChatPane from './components/chat/ChatPane';
import CodePane from './components/chat/CodePane';
import DangerModal from './components/danger/DangerModal';
import EntityOrb from './components/EntityOrb';

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('yusra_onboarding_complete') === 'true';
  });
  const [activeView, setActiveView] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [dangerModal, setDangerModal] = useState<{ command: string; risk: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ stdout: string; stderr: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('yusra_onboarding_complete', 'true');
    setOnboardingComplete(true);
  }, []);

  const handleDangerRequest = useCallback((cmd: string, risk: string) => {
    setDangerModal({ command: cmd, risk });
  }, []);

  const handleDangerApprove = useCallback(() => {
    setDangerModal(null);
  }, []);

  const handleDangerDeny = useCallback(() => {
    setDangerModal(null);
  }, []);

  const handleCommandResult = useCallback((result: { stdout: string; stderr: string }) => {
    setLastResult(result);
  }, []);

  const handleThinkingChange = useCallback((thinking: boolean) => {
    setIsThinking(thinking);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setCommandBarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#121212] text-space-50">
      <TitleBar onCommandBarToggle={() => setCommandBarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />

        <main className="flex-1 flex overflow-hidden">
          {/* Split pane: Chat | Code/Terminal */}
          <div className="flex-1 border-r border-white/5 flex flex-col">
            {/* Entity Orb focal point */}
            <div className="flex items-center justify-center py-4 border-b border-white/5">
              <EntityOrb isThinking={isThinking} size={160} />
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatPane
                onDangerRequest={handleDangerRequest}
                onCommandResult={handleCommandResult}
                onThinkingChange={handleThinkingChange}
              />
            </div>
          </div>
          <div className="flex-1">
            <CodePane lastResult={lastResult} />
          </div>
        </main>
      </div>

      <CommandBar isOpen={commandBarOpen} onClose={() => setCommandBarOpen(false)} />

      {dangerModal && (
        <DangerModal
          command={dangerModal.command}
          riskLevel={dangerModal.risk}
          onApprove={handleDangerApprove}
          onDeny={handleDangerDeny}
        />
      )}
    </div>
  );
}

export default App;
