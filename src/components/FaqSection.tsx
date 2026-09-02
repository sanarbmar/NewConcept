import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Clock, CalendarCheck, AlertCircle, CreditCard, Scissors } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: '¿Cuál es el horario de atención de la barbería?',
    answer: 'Atendemos de lunes a sábado desde las 8:00 a.m. hasta las 9:00 p.m. de forma continua. Los domingos permanecemos cerrados.',
    icon: <Clock className="h-4 w-4 text-amber-400" />,
  },
  {
    question: '¿Con cuánta anticipación puedo reservar mi cita?',
    answer: 'Puedes agendar para el mismo día con un mínimo de 2 horas de anticipación, o programar tu turno hasta con 6 días hacia adelante. El sistema calcula en vivo los huecos libres para evitar cualquier cruce.',
    icon: <CalendarCheck className="h-4 w-4 text-amber-400" />,
  },
  {
    question: '¿Qué pasa si necesito cancelar o reprogramar mi cita?',
    answer: 'Puedes cancelar tu cita libremente hasta 3 horas antes de la hora acordada mediante tu enlace personal de gestión (/mis-citas/{token}). Si faltan menos de 3 horas para la cita, el enlace se bloquea y debes comunicarte directamente por WhatsApp al 311 235 2517 para coordinar con nosotros.',
    icon: <AlertCircle className="h-4 w-4 text-amber-400" />,
  },
  {
    question: '¿Debo pagar algún anticipo para asegurar mi cupo?',
    answer: 'No. La reserva es completamente gratuita y queda confirmada al instante. El pago total del servicio se realiza en el local al finalizar tu corte.',
    icon: <CreditCard className="h-4 w-4 text-amber-400" />,
  },
  {
    question: '¿Puedo elegir el barbero que me atenderá?',
    answer: 'Sí, absolutamente. En New Concept 24k el cliente siempre elige de manera específica si desea su corte con Sebastián Correa o con Jhon Ciro. Nunca asignamos turnos al azar.',
    icon: <Scissors className="h-4 w-4 text-amber-400" />,
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-neutral-950 border-t border-neutral-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <HelpCircle className="h-3 w-3" />
            <span>Respuestas Rápidas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Preguntas <span className="text-amber-400">Frecuentes</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Todo lo que necesitas saber antes de sentarte en la silla de New Concept 24k.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                      {faq.icon}
                    </div>
                    <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-neutral-800/60 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
