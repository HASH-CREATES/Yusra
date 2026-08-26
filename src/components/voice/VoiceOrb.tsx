import { motion } from 'framer-motion';
import type { OrbState } from '../../lib/types';

const RING_SECONDS: Record<OrbState, number> = { idle: 8, listening: 4, thinking: 1.2, speaking: 3 };

interface VoiceOrbProps {
  state?: OrbState;
  size?: number;
}

/** Siri-style voice orb — conic ring + morphing moss blob + waveform bars. Pure CSS/SVG. */
export default function VoiceOrb({ state = 'idle', size = 160 }: VoiceOrbProps) {
  const speaking = state === 'speaking';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer halo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            'radial-gradient(circle, rgba(74,93,35,0.35) 0%, rgba(74,93,35,0.08) 55%, transparent 72%)',
          filter: 'blur(14px)',
        }}
        animate={{ opacity: state === 'idle' ? 0.45 : 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Rotating conic ring */}
      <div
        className="absolute orb-ring"
        style={{
          width: size,
          height: size,
          animationDuration: `${RING_SECONDS[state]}s`,
          animationDirection: state === 'thinking' ? 'reverse' : 'normal',
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="orbRingGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5A7028" />
              <stop offset="100%" stopColor="#8993A3" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="url(#orbRingGrad)"
            strokeWidth="2"
            strokeDasharray="200 90"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* Core blob */}
      <motion.div
        className="orb-blob relative"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background:
            'radial-gradient(circle at 35% 30%, rgba(90,112,40,0.95), rgba(74,93,35,0.65) 45%, rgba(28,28,30,0.92) 82%)',
          boxShadow: '0 0 28px rgba(74,93,35,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
        animate={{
          scale:
            state === 'thinking' ? [1, 0.94, 1] : state === 'listening' ? [1, 1.06, 1] : [1, 1.015, 1],
        }}
        transition={{ repeat: Infinity, duration: state === 'thinking' ? 1.1 : 2.6, ease: 'easeInOut' }}
      />

      {/* Waveform bars (speaking only) */}
      {speaking && (
        <div className="absolute flex items-center gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="orb-bar w-1 rounded-full bg-space-50/85"
              style={{ height: size * 0.22, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
