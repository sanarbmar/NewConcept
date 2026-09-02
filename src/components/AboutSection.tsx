import React from 'react';
import { History, Target, Sparkles, MapPin } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="nosotros" className="py-24 bg-neutral-950 border-t border-neutral-800/80 relative overflow-hidden">
      {/* Luz dorada ambiental de fondo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Columna de Texto e Historia */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6">
              <History className="h-3 w-3" />
              <span>Nuestra Historia & Esencia</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight leading-tight">
              De la Cultura de Calle al <span className="text-amber-400">Estándar 24k</span>
            </h2>

            <div className="mt-6 space-y-4 text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
              <p>
                <strong>Barbería New Concept 24k</strong> nació en las esquinas vibrantes de <strong>Belén La Nubia</strong>, Medellín. Lo que comenzó hace más de 10 años con un par de máquinas y una pasión implacable por el arte urbano del barbero, se consolidó en un concepto único: fusionar la autenticidad callejera con la disciplina y pulcritud corporativa.
              </p>
              <p>
                Encabezada por <strong>Sebastián Correa</strong> y respaldada por la precisión de <strong>Jhon Ciro</strong>, nuestra casa no improvisa. Creemos que un corte no es un trámite de 15 minutos al azar; es tu tarjeta de presentación, tu confianza y tu sello personal.
              </p>
              <p className="text-neutral-400 text-sm">
                En nuestro sillón encuentras música urbana selecta, ambiente sobrio y la certeza de que saldrás con la línea exactamente donde debe estar. Sin rodeos, con calidad certificada 24k.
              </p>
            </div>

            {/* Bloques de valor */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <Target className="h-5 w-5 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white uppercase">Cero Improvisación</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Tiempo dedicado exclusivo a cada cita, sin sobrecupos ni esperas innecesarias.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <Sparkles className="h-5 w-5 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white uppercase">Ambiente Exclusivo</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Espacio urbano impecable, higiene rigurosa y herramientas profesionales esterilizadas.
                </p>
              </div>
            </div>
          </div>

          {/* Columna Visual / Tarjeta de Identidad */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-neutral-900 p-8 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
              <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
                <div>
                  <span className="text-xs font-mono text-amber-400 font-bold uppercase">Manifiesto 24k</span>
                  <h3 className="text-xl font-black text-white uppercase mt-1">New Concept</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-xs">
                  24k
                </div>
              </div>

              <div className="py-6 space-y-4">
                <blockquote className="text-base text-neutral-200 italic font-medium">
                  "No vendemos simplemente cortes de cabello; construimos la imagen de los que van al frente."
                </blockquote>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  — Sebastián Correa, Fundador
                </p>
              </div>

              <div className="pt-6 border-t border-neutral-800 flex items-center gap-3 text-xs text-neutral-400">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Cra. 82 # 18AA-4, Belén La Nubia • Medellín, Colombia</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
