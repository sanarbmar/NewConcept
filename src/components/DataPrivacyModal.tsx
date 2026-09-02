import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';
import { BUSINESS_ADDRESS, BUSINESS_PHONE } from '../lib/bookingLogic';

interface DataPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase">
              Política de Tratamiento de Datos
            </h3>
            <p className="text-xs text-amber-400 font-medium">
              Ley 1581 de 2012 (Colombia)
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed pt-2 border-t border-neutral-800/80">
          <p>
            En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> y sus decretos reglamentarios, <strong>Barbería New Concept 24k</strong>, ubicada en {BUSINESS_ADDRESS}, informa que los datos personales suministrados (nombre y número de celular) serán tratados bajo principios de confidencialidad, seguridad y veracidad.
          </p>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              Finalidades Exclusivas:
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-xs text-neutral-400">
              <li>Coordinar, confirmar y garantizar tu reserva de cita de barbería.</li>
              <li>Generar tu enlace personal único de consulta y cancelación (/mis-citas/{'{token}'}).</li>
              <li>Permitir el contacto directo a través de WhatsApp para notificaciones de servicio.</li>
            </ul>
          </div>

          <p>
            <strong>No compartición con terceros:</strong> New Concept 24k no comercializa, transfiere ni cede tus datos de contacto a empresas de publicidad o bases de datos externas.
          </p>

          <p>
            <strong>Derechos del Titular (Habeas Data):</strong> Como titular de la información tienes derecho a conocer, actualizar, rectificar o solicitar la supresión de tus datos de nuestras bases en cualquier momento comunicándote al WhatsApp <strong>{BUSINESS_PHONE}</strong>.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider"
          >
            Entendido y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};
