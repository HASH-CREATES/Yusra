import { motion } from 'framer-motion';
import { MessageSquare, Code2, Brain, FolderOpen, Settings, Minus, Square, X, Sparkles } from 'lucide-react';

interface TitleBarProps {
  onCommandBarToggle: () => void;
}

export default function TitleBar({ onCommandBarToggle }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="h-12 flex items-center justify-between px-4 border-b border-white/5 select-none"
    >
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div className="w-6 h-6 rounded-md bg-moss/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-moss" />
        </div>
        <span className="font-display font-semibold text-sm" data-tauri-drag-region>Yusra</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onCommandBarToggle}
          className="h-7 px-2 rounded-md text-space-200 hover:text-space-50 hover:bg-white/5 transition-all text-xs font-mono"
        >
          Ctrl+Space
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-space-200 hover:text-space-50 hover:bg-white/5 rounded-md transition-all">
          <Settings className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-space-200 hover:text-space-50 hover:bg-white/5 rounded-md transition-all">
          <Minus className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-space-200 hover:text-space-50 hover:bg-white/5 rounded-md transition-all">
          <Square className="w-3.5 h-3.5" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-space-200 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'code', icon: Code2, label: 'Code' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'files', icon: FolderOpen, label: 'Files' },
];

export function Sidebar({ activeView, onViewChange, collapsed }: SidebarProps) {
  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full border-r border-white/5 flex flex-col py-3 overflow-hidden"
    >
      <div className="flex-1 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeView === item.id
                ? 'bg-moss/10 text-moss border-l-2 border-moss'
                : 'text-space-100 hover:text-space-50 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium truncate">{item.label}</span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
