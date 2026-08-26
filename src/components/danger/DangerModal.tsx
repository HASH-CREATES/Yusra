import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface DangerModalProps {
  command: string;
  riskLevel: string;
  onApprove: () => void;
  onDeny: () => void;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export default function DangerModal({ command, riskLevel, onApprove, onDeny }: DangerModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(28, 28, 30, 0.85)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={spring}
          className="glass-heavy w-full max-w-lg mx-4 p-8 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">Command Requires Approval</h2>
                <p className="text-space-100 text-sm">Risk Level: {riskLevel}</p>
              </div>
            </div>
            <button onClick={onDeny} className="text-space-200 hover:text-space-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-space-100 text-sm mb-4">
            This command may modify or delete data. Review it carefully before approving.
          </p>

          <div className="bg-space-400 rounded-xl p-4 mb-6 font-mono text-sm overflow-x-auto">
            <code className="text-moss-light">{command}</code>
          </div>

          <div className="flex gap-3">
            <button onClick={onDeny} className="btn-ghost flex-1 h-12">
              Deny
            </button>
            <button onClick={onApprove} className="btn-primary flex-1 h-12 bg-red-500 hover:bg-red-600">
              Approve
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
