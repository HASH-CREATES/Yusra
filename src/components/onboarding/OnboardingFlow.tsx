import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Terminal, HardDrive, FolderOpen, Sparkles } from 'lucide-react';

const STEPS = ['welcome', 'personality', 'permissions', 'activation', 'complete'] as const;
type Step = typeof STEPS[number];

const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 };

const personalities = [
  { id: 'yusra', name: 'Yusra', tagline: 'The original. Calm, precise, and endlessly capable.', accent: 'bg-moss' },
  { id: 'singularity', name: 'Singularity', tagline: 'Yusra with your traits. She learns who you are.', accent: 'bg-tea' },
  { id: 'custom', name: 'Custom', tagline: 'Build from scratch. Define every behavior.', accent: 'bg-space-200' },
];

const permissions = [
  { id: 'files', icon: FolderOpen, title: 'File Access', desc: 'Read and write files you explicitly approve. She never touches anything without asking.' },
  { id: 'shell', icon: Terminal, title: 'Terminal Access', desc: 'Run commands you request. Risky operations always require your confirmation.' },
  { id: 'models', icon: HardDrive, title: 'Model Storage', desc: 'Download and store AI models on your device. Sizes range from 1GB to 8GB.' },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [enabledPermissions, setEnabledPermissions] = useState<Record<string, boolean>>({});
  const [direction, setDirection] = useState(1);

  const currentIdx = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    setDirection(1);
    const next = STEPS[currentIdx + 1];
    if (next === 'complete') {
      setTimeout(onComplete, 600);
    }
    if (next) setStep(next);
  }, [currentIdx, onComplete]);

  const goBack = useCallback(() => {
    setDirection(-1);
    const prev = STEPS[currentIdx - 1];
    if (prev) setStep(prev);
  }, [currentIdx]);

  const togglePermission = (id: string) => {
    setEnabledPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const variants = {
    enter: (d: number) => ({ rotateY: d > 0 ? 15 : -15, opacity: 0, scale: 0.95 }),
    center: { rotateY: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ rotateY: d > 0 ? -15 : 15, opacity: 0, scale: 0.95 }),
  };

  return (
    <div className="fixed inset-0 bg-space-500 flex items-center justify-center overflow-hidden" style={{ perspective: '1200px' }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={spring}
          className="w-full max-w-2xl mx-4"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {step === 'welcome' && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                transition={{ ...spring, delay: 0.1 }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-moss/30 to-moss-dark/30 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-moss" />
                  </div>
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-5xl font-bold mb-4 tracking-tight"
              >
                Your Personal AI Entity
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-space-100 text-lg mb-12"
              >
                100% offline. Private. Powerful.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <button onClick={goNext} className="btn-primary w-full h-12 text-lg font-display font-semibold">
                  Get Started
                </button>
                <button onClick={onComplete} className="text-space-200 text-sm hover:text-space-100 transition-colors">
                  I've done this before
                </button>
              </motion.div>
            </div>
          )}

          {step === 'personality' && (
            <div>
              <h2 className="font-display text-3xl font-semibold text-center mb-2">Choose Your Yusra</h2>
              <p className="text-space-100 text-center mb-8">Select a personality that matches your style</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {personalities.map((p, i) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, rotateY: 15 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ ...spring, delay: i * 0.1 }}
                    onClick={() => setSelectedPersonality(p.id)}
                    className={`glass-panel p-6 text-left transition-all ${
                      selectedPersonality === p.id
                        ? 'ring-2 ring-moss shadow-accent-glow'
                        : 'hover:scale-[1.02]'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${p.accent} mb-3 flex items-center justify-center`}>
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-1">{p.name}</h3>
                    <p className="text-space-100 text-sm">{p.tagline}</p>
                    {selectedPersonality === p.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-6 h-6 bg-moss rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="btn-ghost flex-1 h-12">Back</button>
                <button onClick={goNext} disabled={!selectedPersonality} className="btn-primary flex-1 h-12 disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'permissions' && (
            <div>
              <h2 className="font-display text-3xl font-semibold text-center mb-2">What Yusra Needs</h2>
              <p className="text-space-100 text-center mb-2">Yusra runs entirely on your device. These permissions keep her local.</p>
              <div className="space-y-3 mb-8 mt-6">
                {permissions.map((perm, i) => (
                  <motion.div
                    key={perm.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-4 flex items-center gap-4"
                  >
                    <perm.icon className="w-6 h-6 text-moss shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{perm.title}</h3>
                      <p className="text-space-100 text-sm">{perm.desc}</p>
                    </div>
                    <button
                      onClick={() => togglePermission(perm.id)}
                      className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                        enabledPermissions[perm.id] ? 'bg-moss' : 'bg-space-300'
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow"
                        animate={{ left: enabledPermissions[perm.id] ? '22px' : '2px' }}
                        transition={spring}
                      />
                    </button>
                  </motion.div>
                ))}
              </div>
              <button onClick={goNext} className="btn-primary w-full h-12">Continue</button>
            </div>
          )}

          {step === 'activation' && (
            <div>
              <h2 className="font-display text-3xl font-semibold text-center mb-6">Let's try something</h2>
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 glass-panel p-4">
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-full bg-moss/20 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-moss" />
                      </div>
                      <div className="glass-light rounded-xl rounded-tl-sm p-3 max-w-[80%]">
                        <p className="text-sm">Hi! I'm Yusra. Ask me to create a file called 'hello.txt'.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start justify-end">
                      <div className="bg-space-400 rounded-xl rounded-tr-sm p-3 max-w-[80%]">
                        <p className="text-sm">Create a file called hello.txt with Hello, World!</p>
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 }}
                      className="flex gap-3 items-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-moss/20 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-moss" />
                      </div>
                      <div className="glass-light rounded-xl rounded-tl-sm p-3 max-w-[80%]">
                        <p className="text-sm">Done. The file is on your Desktop. You're ready.</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
                <div className="col-span-2 glass-panel p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-moss" />
                    <span className="text-xs text-space-100 font-mono">Terminal</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="font-mono text-xs space-y-1 text-space-100"
                  >
                    <p><span className="text-moss">$</span> echo "Hello, World!" &gt; hello.txt</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2 }}
                    >
                      <span className="text-moss">✓</span> Created hello.txt
                    </motion.p>
                  </motion.div>
                </div>
              </div>
              <button onClick={goNext} className="btn-primary w-full h-12 mt-6">Continue</button>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={spring}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-moss/20 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-moss" />
              </motion.div>
              <h2 className="font-display text-3xl font-semibold mb-2">You're All Set</h2>
              <p className="text-space-100 mb-8">Yusra is ready. Enter your workspace.</p>
              <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
                {['Personality selected', 'Permissions configured', 'First task completed'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-moss flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-space-100">{item}</span>
                  </motion.div>
                ))}
              </div>
              <button onClick={onComplete} className="btn-primary w-full h-12 text-lg font-display font-semibold">
                Enter Yusra
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Step indicators */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {STEPS.slice(1, -1).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                STEPS.indexOf(step) > i + 1 ? 'bg-moss w-6' : STEPS.indexOf(step) === i + 1 ? 'bg-moss' : 'bg-space-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
