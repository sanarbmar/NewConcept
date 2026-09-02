import React from 'react';
import { User, Award, Calendar, Check, Flame } from 'lucide-react';
import { BARBEROS_BASE } from '../lib/firebase';

interface BarbersSectionProps {
  onSelectBarber: (barberoId: string) => void;
}

export const BarbersSection: React.FC<BarbersSectionProps> = ({ onSelectBarber }) => {
  return (
    <section id="barberos" className="py-24 bg-neutral-950 relative border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Award className="h-3 w-3" />
            <span>Maestros de la Navaja</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Nuestros <span className="text-amber-400">Barberos</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Más de una década de experiencia en cada tijeretazo. Ambos barberos dominan todos los servicios con maestría absoluta y una fortaleza legendaria en <strong className="text-white">corte con barba</strong>.
          </p>
        </div>

        {/* Tarjetas de los dos barberos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {BARBEROS_BASE.map((barbero) => {
            return (
              <div
                key={barbero.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/60 p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] hover:-translate-y-1"
              >
                <div>
                  {/* Silueta / Ícono genérico estilizado con acentos en oro 24k (sin fotos de banco de imágenes) */}
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:scale-105 transition-transform">
                      {/* Silueta artística vectorial limpia */}
                      <User className="h-10 w-10 text-amber-400/90" />
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-[10px] font-black">
                        24k
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-wide">
                          {barbero.nombre}
                        </h3>
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-neutral-800 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                        {barbero.rol}
                      </span>
                    </div>
                  </div>

                  {/* Descripción & Competencias */}
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Experto en la totalidad de nuestra carta de servicios. Ya sea un cambio de look radical, una marcada fina o un perfilado milimétrico, la ejecución es impecable.
                  </p>

                  {/* Destacado compartido: Corte con barba */}
                  <div className="mt-5 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center gap-3">
                    <Flame className="h-5 w-5 text-amber-400 shrink-0" />
                    <p className="text-xs text-neutral-300 font-medium">
                      <strong className="text-amber-400 font-bold">Fortaleza principal:</strong> Especialista de alto nivel en corte integral y esculpido de barba.
                    </p>
                  </div>

                  {/* Check list */}
                  <ul className="mt-5 space-y-2 text-xs text-neutral-400">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Más de 10 años de experiencia comprobada</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Atención individual sin cruce de turnos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Asesoría de estilo personalizada según fisonomía</span>
                    </li>
                  </ul>
                </div>

                {/* Botón de selección directa */}
                <div className="mt-8 pt-6 border-t border-neutral-800/80">
                  <button
                    onClick={() => onSelectBarber(barbero.id)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Reservar con {barbero.nombre.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota sobre la selección obligatoria */}
        <div className="mt-12 text-center text-xs text-neutral-500 max-w-md mx-auto">
          En New Concept 24k respetamos tu preferencia: siempre agendamos con el barbero específico que tú elijas.
        </div>
      </div>
    </section>
  );
};
