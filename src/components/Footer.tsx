import React from 'react';
import { Scissors, Phone, Instagram, MapPin, Clock, Lock, ShieldCheck } from 'lucide-react';
import {
  BUSINESS_ADDRESS,
  BUSINESS_PHONE,
  BUSINESS_PHONE_INTL,
  BUSINESS_INSTAGRAM
} from '../lib/bookingLogic';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenAdmin: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBooking,
  onOpenAdmin,
  onOpenPrivacy,
}) => {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-850 text-neutral-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-850">
          {/* Columna Marca */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Scissors className="h-5 w-5 rotate-[-45deg]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider text-lg text-white uppercase leading-none">
                  New Concept <span className="text-amber-400">24k</span>
                </span>
                <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">
                  Belén La Nubia
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Más de 10 años de trayectoria fusionando la estética underground de Medellín con la máxima precisión y servicio corporativo.
            </p>
          </div>

          {/* Columna Enlaces */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
              Navegación Rápida
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#inicio" className="hover:text-amber-400 transition-colors">Inicio</a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-amber-400 transition-colors">Servicios & Tarifas</a>
              </li>
              <li>
                <a href="#barberos" className="hover:text-amber-400 transition-colors">Nuestros Barberos</a>
              </li>
              <li>
                <a href="#galeria" className="hover:text-amber-400 transition-colors">Galería de Cortes</a>
              </li>
              <li>
                <a href="#nosotros" className="hover:text-amber-400 transition-colors">Sobre Nosotros</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-400 transition-colors">Preguntas Frecuentes</a>
              </li>
            </ul>
          </div>

          {/* Columna Contacto & Horarios */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
              Horario & Ubicación
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Lun - Sáb: 8:00 a.m. a 9:00 p.m. (Dom cerrado)</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{BUSINESS_ADDRESS}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${BUSINESS_PHONE_INTL}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp: {BUSINESS_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-400 shrink-0" />
                <a
                  href="https://instagram.com/sebas_thebarber24k"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  {BUSINESS_INSTAGRAM}
                </a>
              </li>
            </ul>
          </div>

          {/* Columna Agendar & Legal */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
              Tu Turno en Vivo
            </h4>
            <button
              onClick={onOpenBooking}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
            >
              Agendar Cita
            </button>
            <button
              onClick={onOpenPrivacy}
              className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white text-left"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Política de Tratamiento de Datos (Ley 1581)</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Barbería New Concept 24k. Todos los derechos reservados. Medellín, Colombia.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 text-neutral-500 hover:text-amber-400 transition-colors"
            >
              <Lock className="h-3 w-3" />
              <span>Portal Dueño</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
