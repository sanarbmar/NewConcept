import React from 'react';
import { MapPin, Phone, Instagram, Clock, Navigation, Calendar } from 'lucide-react';
import { BUSINESS_ADDRESS, BUSINESS_PHONE, BUSINESS_PHONE_INTL, BUSINESS_INSTAGRAM } from '../lib/bookingLogic';

interface LocationSectionProps {
  onOpenBooking: () => void;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ onOpenBooking }) => {
  return (
    <section id="ubicacion" className="py-24 bg-neutral-900/40 border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <MapPin className="h-3 w-3" />
            <span>Punto de Encuentro</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Ubicación & <span className="text-amber-400">Contacto</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Estamos ubicados en el corazón de Belén La Nubia. Fácil acceso, parqueo cercano y un punto de referencia clave en la comuna 16 de Medellín.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Tarjeta de Información y Contacto */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest">
                  Barbería New Concept 24k
                </span>
                <h3 className="text-2xl font-black text-white uppercase mt-1">
                  Belén La Nubia
                </h3>
              </div>

              {/* Dirección */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <MapPin className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dirección</h4>
                  <p className="text-sm text-neutral-300 mt-0.5">{BUSINESS_ADDRESS}</p>
                  <p className="text-xs text-neutral-500 mt-1">Medellín, Antioquia, Colombia</p>
                </div>
              </div>

              {/* Horarios */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="w-full">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Horario de Atención</h4>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-300">
                      <span>Lunes a Sábado:</span>
                      <span className="font-semibold text-amber-400">8:00 a.m. – 9:00 p.m.</span>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>Domingos:</span>
                      <span className="font-medium text-rose-400/80">Cerrado</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canales Digitales */}
              <div className="space-y-2.5">
                <a
                  href={`https://wa.me/${BUSINESS_PHONE_INTL}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Directo</span>
                  </div>
                  <span className="text-xs font-semibold">{BUSINESS_PHONE}</span>
                </a>

                <a
                  href={`https://instagram.com/${BUSINESS_INSTAGRAM.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-pink-950/20 hover:bg-pink-950/40 border border-pink-800/30 text-pink-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Instagram className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Instagram</span>
                  </div>
                  <span className="text-xs font-semibold">{BUSINESS_INSTAGRAM}</span>
                </a>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-800">
              <button
                onClick={onOpenBooking}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
              >
                <Calendar className="h-4 w-4" />
                <span>Agendar mi cita ahora</span>
              </button>
            </div>
          </div>

          {/* Mapa Embebido de Google Maps en Belén La Nubia */}
          <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 relative min-h-[380px] shadow-lg">
            <iframe
              title="Ubicación Barbería New Concept 24k"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.331206013627!2d-75.60251782414169!3d6.219984993768074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4429df34ab9b51%3A0xb3a8bb6d1b7d56e8!2sCra.%2082%20%2318aa-4%2C%20Bel%C3%A9n%2C%20Medell%C3%ADn%2C%20Antioquia!5e0!3m2!1ses-419!2sco!4v1709400000000!5m2!1ses-419!2sco"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '400px', filter: 'invert(90%) hue-rotate(180deg)' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
            
            {/* Overlay informativo sobre el mapa */}
            <div className="absolute top-4 left-4 bg-neutral-950/90 backdrop-blur-sm border border-neutral-800 p-3 rounded-xl shadow-lg max-w-xs pointer-events-none">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase">Cra. 82 # 18AA-4</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Belén La Nubia, Medellín</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
