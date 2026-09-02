import React from 'react';
import { motion } from 'motion/react';
import { Scissors } from 'lucide-react';

interface LoaderProps {
  onFinish?: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ onFinish }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 px-4 text-center"
      onAnimationComplete={() => {
        // Optional callback
      }}
    >
      {/* Glow ambiental */}
      <div className="absolute h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Ícono animado */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-neutral-900/80 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
      >
        <Scissors className="h-10 w-10 text-amber-400 rotate-[-45deg]" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      </motion.div>

      {/* Wordmark New Concept 24k */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col items-center"
      >
        <h1 className="text-3xl sm:text-4xl font-black tracking-wider uppercase text-white font-['Plus_Jakarta_Sans',sans-serif]">
          New Concept <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">24k</span>
        </h1>
        <p className="mt-2 text-xs tracking-[0.3em] uppercase text-neutral-400 font-semibold">
          Barbería • Belén La Nubia • Medellín
        </p>
      </motion.div>

      {/* Barra de progreso elegante */}
      <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-neutral-900">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="h-full w-1/2 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-xs text-neutral-500 font-medium"
      >
        Cargando sistema de citas en vivo...
      </motion.p>
    </motion.div>
  );
};
