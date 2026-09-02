import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  ArrowLeft,
  Loader2,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  checkCancellationEligibility,
  cancelBooking,
  formatCOP,
  getWhatsAppCancellationNoticeLink,
  BUSINESS_PHONE
} from '../lib/bookingLogic';
import { Cita } from '../types';

interface ClientAppointmentViewProps {
  token: string;
  onBackToHome: () => void;
  onOpenNewBooking: () => void;
  onOpenSearchAppointment?: (phone?: string) => void;
}

export const ClientAppointmentView: React.FC<ClientAppointmentViewProps> = ({
  token,
  onBackToHome,
  onOpenNewBooking,
  onOpenSearchAppointment,
}) => {
  const [cita, setCita] = useState<Cita | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    async function loadCita() {
      setLoading(true);
      setError('');
      try {
        const citaRef = doc(db, 'citas', token);
        const snap = await getDoc(citaRef);
        if (!snap.exists()) {
          setError('No encontramos ninguna cita asociada a este enlace o código de reserva.');
        } else {
          setCita(snap.data() as Cita);
        }
      } catch (err: any) {
        console.error('Error al cargar cita:', err);
        setError('Ocurrió un problema al consultar tu cita. Por favor verifica el enlace.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadCita();
    }
  }, [token]);

  const handleExecuteCancel = async () => {
    if (!cita) return;
    setCancelling(true);
    try {
      await cancelBooking(cita.token_gestion);
      setCita({
        ...cita,
        estado: 'cancelada',
        cancelado_en: new Date().toISOString(),
      });
      setConfirmCancelModal(false);
      setCancelSuccess(true);
    } catch (err: any) {
      alert(err.message || 'No fue posible cancelar la cita.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-3" />
        <h3 className="text-base font-bold text-white uppercase">Cargando tu cita...</h3>
        <p className="text-xs text-neutral-400">Verificando en New Concept 24k</p>
      </div>
    );
  }

  if (error || !cita) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Cita No Encontrada</h3>
          <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
            {error || 'El código ingresado no existe o no tiene citas activas.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onBackToHome}
              className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase"
            >
              Volver al Inicio
            </button>
            <button
              onClick={onOpenNewBooking}
              className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs uppercase"
            >
              Agendar Nueva Cita
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar la elegibilidad de cancelación con la regla de 3 horas
  const eligibility = checkCancellationEligibility(cita.fecha, cita.hora_inicio);
  const isCancelled = cita.estado === 'cancelada';
  const isCompleted = cita.estado === 'completada';
  const isNoShow = cita.estado === 'no_show';
  const isConfirmed = cita.estado === 'confirmada';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Barra superior de navegación */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a New Concept 24k</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            {onOpenSearchAppointment && (
              <button
                onClick={() => onOpenSearchAppointment(cita.cliente_telefono)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-400 text-xs font-bold transition-colors"
                title="Ver todas las citas agendadas con este número celular"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Mis Otras Citas</span>
              </button>
            )}
            <span className="hidden sm:inline text-[11px] font-mono text-neutral-500">
              Ref: {cita.token_gestion}
            </span>
          </div>
        </div>

        {/* Tarjeta de la Cita */}
        <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header con Estado */}
          <div className="flex items-start justify-between border-b border-neutral-800 pb-6">
            <div>
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest block">
                Gestión de Cita Personal
              </span>
              <h2 className="text-2xl font-black text-white uppercase mt-1">
                {cita.servicio_nombre}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Cliente: <strong className="text-white">{cita.cliente_nombre}</strong>
              </p>
            </div>

            {/* Badge de Estado */}
            <div>
              {isConfirmed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmada
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider">
                  <XCircle className="h-3.5 w-3.5" /> Cancelada
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completada
                </span>
              )}
              {isNoShow && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5" /> No-Show
                </span>
              )}
            </div>
          </div>

          {/* Detalles estructurados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <User className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Barbero Asignado</span>
                <span className="text-sm font-bold text-white">{cita.barbero_nombre}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <Calendar className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Fecha Programada</span>
                <span className="text-sm font-bold text-white">{cita.fecha}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <Clock className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Horario de Atención</span>
                <span className="text-sm font-bold text-amber-400">{cita.hora_inicio} – {cita.hora_fin}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <CreditCard className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase block">Total a Pagar (Local)</span>
                <span className="text-sm font-black text-white">{formatCOP(cita.precio)}</span>
              </div>
            </div>
          </div>

          {/* Mensaje Informativo o de Cancelación */}
          {isConfirmed && (
            <div className="pt-2">
              {eligibility.puedeCancelar ? (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-neutral-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Estás a tiempo para cancelar o reprogramar libremente tu cita (más de 3 horas de anticipación).
                    </span>
                  </div>

                  <button
                    onClick={() => setConfirmCancelModal(true)}
                    className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 border border-neutral-700 text-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancelar mi Cita
                  </button>
                </div>
              ) : (
                /* Menos de 3 horas: Bloqueo de cancelación automática con redirección a WhatsApp */
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-300">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Faltan menos de 3 horas para tu cita. Por respeto al tiempo de nuestros barberos, la cancelación ya no se realiza desde la web. Por favor comunícate de inmediato por WhatsApp.
                    </p>
                  </div>

                  <a
                    href={getWhatsAppCancellationNoticeLink(cita)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Contactar por WhatsApp ({BUSINESS_PHONE})</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {isCancelled && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-center space-y-2">
              <p className="text-xs text-rose-300">
                Esta cita fue cancelada. El cupo ha sido liberado en la agenda del barbero.
              </p>
              <button
                onClick={onOpenNewBooking}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase"
              >
                Agendar otra cita
              </button>
            </div>
          )}

          {cancelSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs text-center">
              Tu cita ha sido cancelada correctamente. ¡Esperamos verte pronto en New Concept 24k!
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Cancelación */}
      {confirmCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-neutral-950 border border-neutral-800 p-6 space-y-4">
            <h4 className="text-lg font-black text-white uppercase">¿Confirmar Cancelación?</h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              ¿Estás seguro de que deseas cancelar tu cita para <strong>{cita.servicio_nombre}</strong> con <strong>{cita.barbero_nombre}</strong> el <strong>{cita.fecha} a las {cita.hora_inicio}</strong>? El espacio quedará disponible para otro cliente.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase"
              >
                No, mantener cita
              </button>
              <button
                onClick={handleExecuteCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Sí, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
