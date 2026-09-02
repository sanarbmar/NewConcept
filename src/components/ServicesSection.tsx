import React from 'react';
import { Scissors, Clock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { SERVICIOS_BASE } from '../lib/firebase';
import { formatCOP } from '../lib/bookingLogic';

interface ServicesSectionProps {
  onSelectService: (servicioId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  return (
    <section id="servicios" className="py-24 bg-neutral-900/40 border-t border-neutral-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header de sección */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="h-3 w-3" />
            <span>Carta de Servicios & Precios</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Cortes Limpios. <span className="text-amber-400">Sin Sorpresas.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Cada servicio se realiza con el tiempo y detalle necesario. Reserva tu servicio individual y paga directamente al terminar en el local.
          </p>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICIOS_BASE.map((servicio) => {
            const isFeatured = servicio.id === 'srv_corte_barba';

            return (
              <div
                key={servicio.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-300 ${
                  isFeatured
                    ? 'bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] transform hover:-translate-y-1'
                    : 'bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:-translate-y-1'
                }`}
              >
                {/* Badge de recomendado para corte con barba */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                    Especialidad de la casa
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                      <Scissors className="h-6 w-6 rotate-[-45deg]" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>{servicio.duracion_label}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white uppercase tracking-wide">
                    {servicio.nombre}
                  </h3>
                  
                  <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed min-h-[48px]">
                    {servicio.descripcion}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-800/80">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Tarifa
                    </span>
                    <span className="text-2xl font-black text-white">
                      {formatCOP(servicio.precio)}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectService(servicio.id)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                      isFeatured
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'bg-neutral-900 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <span>Agendar {servicio.nombre}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota aclaratoria sobre combos y pago */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 text-neutral-400 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
            <p>
              <strong className="text-white">Reserva sin anticipo:</strong> Tu cupo queda asegurado de inmediato sin costo. El pago se realiza al finalizar el servicio directamente en el local.
            </p>
          </div>
          <span className="shrink-0 text-amber-400/90 font-semibold">
            1 servicio por cita
          </span>
        </div>
      </div>
    </section>
  );
};
