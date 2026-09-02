import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Award, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { BUSINESS_ADDRESS } from '../lib/bookingLogic';

interface HeroProps {
  onOpenBooking: () => void;
  onExploreServices: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onExploreServices }) => {
  return (
    <section id="inicio" className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden bg-neutral-950">
      {/* Background Video / Image overlay */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1920&q=80"
          className="h-full w-full object-cover opacity-25 filter grayscale contrast-125"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-barber-cutting-hair-with-scissors-and-comb-41712-large.mp4"
            type="video/mp4"
          />
        </video>
        {/* Dark subtle gradient vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Badges superiores */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-neutral-900/90 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Barbería Urbana & Ejecutiva • Belén La Nubia</span>
        </motion.div>

        {/* Título principal impactante */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]"
        >
          Precisión Urbana.{' '}
          <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
            Acabado 24K.
          </span>
        </motion.h1>

        {/* Subtítulo / Propuesta de valor */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-base sm:text-lg text-neutral-300 font-normal leading-relaxed"
        >
          Más de 10 años elevando el corte de cabello a otro nivel. La energía underground de Medellín combinada con la técnica milimétrica y atención corporativa que te mereces.
        </motion.p>

        {/* Botones de acción principales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={onOpenBooking}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Calendar className="h-5 w-5" />
            <span>Agendar Cita en Vivo</span>
          </button>

          <button
            onClick={onExploreServices}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 font-bold text-sm uppercase tracking-wider transition-all"
          >
            <span>Ver Tarifas & Barberos</span>
          </button>
        </motion.div>

        {/* Garantías y diferenciadores clave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 pt-8 border-t border-neutral-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-4xl text-left"
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800/50">
            <Award className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">+10 Años</p>
              <p className="text-[11px] text-neutral-400">Trayectoria de barberos</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800/50">
            <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Cero Esperas</p>
              <p className="text-[11px] text-neutral-400">Turno en vivo garantizado</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800/50">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Lun - Sáb</p>
              <p className="text-[11px] text-neutral-400">8:00 a.m. a 9:00 p.m.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800/50">
            <MapPin className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Belén La Nubia</p>
              <p className="text-[11px] text-neutral-400">Cra. 82 # 18AA-4</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Flecha sutil hacia abajo */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-neutral-600 hover:text-amber-400 transition-colors cursor-pointer hidden md:block" onClick={onExploreServices}>
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </div>
    </section>
  );
};
