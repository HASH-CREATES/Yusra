import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideMicrophone } from 'lucide-react';

// Mock API service
const mockApi = {
  async executeCommand(command: string): Promise<string> {
    // Simulate command execution with random delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `Command executed: ${command}`;
  }
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ text: string; fromUser: boolean }>>([
    { text: "Welcome to Yusra!", fromUser: false },
  ]);
  
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { text: userMessage, fromUser: true }]);
    setInput('');
    setIsExecuting(true);
    
    try {
      const response = await mockApi.executeCommand(userMessage);
      setMessages(prev => [...prev, { text: response, fromUser: false }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Error: " + error.message, fromUser: false }]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      handleSubmit(e as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Command Bar - Glassmorphic search bar */}
      <div className="fixed top-0 w-full bg-deep-carbon border-refractive-edge p-3 shadow-lg z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-white text-lg font-medium">Yusra</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search commands..."
              className="flex-1 pl-10 pr-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ice-cyan"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e as React.FormEvent)}
            />
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white"
              onClick={() => {
                const input = document.querySelector('.fixed.top-0 input') as HTMLInputElement | null;
                input?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-interactive-glow"
            >
              <LucideMicrophone className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout - Split Pane */}
      <div className="flex flex-col min-h-screen">
        {/* Chat Panel (Left) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`transition-all duration-300 ${
                msg.fromUser 
                  ? 'bg-deep-carbon border-refractive-edge text-text-primary rounded-lg p-3 animate-fadeUp' 
                  : 'bg-glass-surface border-refractive-edge text-text-primary rounded-lg p-3 animate-slideUp'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-xl">{msg.text}</p>
                </div>
                {msg.fromUser && (
                  <div className="text-xs text-interactive-glow">
                    {new Date().toLocaleTimeString()}
                  </div>
              </div>
            </div>
          ))}
        </div>

        {/* Code/Terminal Panel (Right) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-deep-carbon border-refractive-edge">
          <div className="min-h-20 bg-deep-carbon p-4 rounded-lg">
            <div className="text-sm text-gray-400 bg-deep-carbon p-2 rounded">
              // Terminal output will appear here
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop - Hidden on desktop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 opacity-0 pointer-events-none transition-opacity duration-300" 
           id="modal-backdrop">
        <div className="absolute inset-0 flex items-center justify-center z-50" 
             onClick={() => setMessages([])} 
             className="bg-white/5 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-deep-carbon mb-4">Onboarding Complete</h2>
          <p className="text-gray-600 mb-6">
            The application is now ready. Press Ctrl+Space to open the command bar.
          </p>
          <button 
            onClick={() => setMessages([])} 
            className="bg-interactive-glow hover:bg-interactive-glow text-white rounded-lg p-2 transition-all duration-200"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;