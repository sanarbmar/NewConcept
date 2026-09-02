import React from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';

interface Testimonial {
  id: number;
  nombre: string;
  tiempoCliente: string;
  comentario: string;
  servicio: string;
  calificacion: number;
}

const TESTIMONIOS_BASE: Testimonial[] = [
  {
    id: 1,
    nombre: 'Mateo Restrepo',
    tiempoCliente: 'Cliente habitual',
    comentario: 'Sebas es un maestro con la barba. Llevo más de 2 años cortándome aquí en Belén La Nubia y la atención es impecable. El sistema de citas hace que uno llegue y se siente sin perder tiempo.',
    servicio: 'Corte con barba',
    calificacion: 5,
  },
  {
    id: 2,
    nombre: 'David Londoño',
    tiempoCliente: 'Cliente frecuente',
    comentario: 'Ciro le mete una precisión brutal al degradado. El ambiente de la barbería es tranquilo, con buena música y cero improvisación. 100% recomendado.',
    servicio: 'Corte',
    calificacion: 5,
  },
  {
    id: 3,
    nombre: 'Juan Camilo Pérez',
    tiempoCliente: 'Cliente nuevo',
    comentario: 'La marcada y las cejas quedaron perfectas. Me gusta que no hay que esperar, reservas tu hora exacta y la cumplen al pie de la letra.',
    servicio: 'Marcada',
    calificacion: 5,
  },
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-24 bg-neutral-900/30 border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <MessageSquareQuote className="h-3 w-3" />
            <span>Opiniones Reales</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            La Experiencia <span className="text-amber-400">en Primera Persona</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Nuestros clientes avalan la disciplina, la puntualidad y el nivel de acabado que entregamos en cada sesión.
          </p>
        </div>

        {/* Grid de testimonios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIOS_BASE.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between p-6 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all duration-300"
            >
              <div>
                {/* Estrellas */}
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(item.calificacion)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm text-neutral-300 italic leading-relaxed">
                  "{item.comentario}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">{item.nombre}</h4>
                  <span className="text-[11px] text-neutral-500">{item.tiempoCliente}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-amber-400 text-[10px] font-semibold">
                  {item.servicio}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
