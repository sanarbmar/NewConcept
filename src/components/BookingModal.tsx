import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Phone,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, BARBEROS_BASE, SERVICIOS_BASE } from '../lib/firebase';
import {
  getAvailableDates,
  calculateAvailableSlots,
  createBookingTransaction,
  isValidColombianPhone,
  cleanPhone,
  formatCOP,
  getWhatsAppBookingLink,
  AvailableDate,
  OcupacionSlot
} from '../lib/bookingLogic';
import { Barbero, Servicio, Cita } from '../types';
import { DataPrivacyModal } from './DataPrivacyModal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarberoId?: string;
  initialServicioId?: string;
  onNavigateToClientView: (token: string) => void;
}

type BookingStep = 'barbero' | 'servicio' | 'fecha_hora' | 'datos' | 'confirmacion';

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialBarberoId,
  initialServicioId,
  onNavigateToClientView,
}) => {
  const [step, setStep] = useState<BookingStep>('barbero');
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  // Client info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [consentData, setConsentData] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // States
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedCita, setConfirmedCita] = useState<Cita | null>(null);
  
  // Privacy policy modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize dates
  useEffect(() => {
    if (isOpen) {
      const dates = getAvailableDates();
      setAvailableDates(dates);
      if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0].dateIso);
      }

      // Pre-selection from buttons
      if (initialBarberoId) {
        const b = BARBEROS_BASE.find((item) => item.id === initialBarberoId);
        if (b) setSelectedBarbero(b);
      }
      if (initialServicioId) {
        const s = SERVICIOS_BASE.find((item) => item.id === initialServicioId);
        if (s) setSelectedServicio(s);
      }

      // Step logic based on pre-selection
      if (initialBarberoId && initialServicioId) {
        setStep('fecha_hora');
      } else if (initialBarberoId) {
        setStep('servicio');
      } else if (initialServicioId) {
        setStep('barbero');
      } else {
        setStep('barbero');
      }
    }
  }, [isOpen, initialBarberoId, initialServicioId]);

  // Fetch available slots when barbero, servicio or date changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedBarbero || !selectedServicio || !selectedDate) {
        return;
      }

      setLoadingSlots(true);
      setBookingError('');
      setSelectedSlot('');

      try {
        // 1. Obtener ocupaciones de agenda_dia
        const agendaRef = doc(db, 'agenda_dia', `${selectedBarbero.id}_${selectedDate}`);
        const agendaSnap = await getDoc(agendaRef);
        const ocupacionesAgenda: OcupacionSlot[] = agendaSnap.exists()
          ? (agendaSnap.data().ocupaciones as OcupacionSlot[]) || []
          : [];

        // 2. Obtener bloqueos manuales activos para este barbero y fecha
        const bloqueosRef = collection(db, 'bloqueos');
        const qBloqueos = query(
          bloqueosRef,
          where('barbero_id', '==', selectedBarbero.id),
          where('fecha', '==', selectedDate)
        );
        const bloqueosSnap = await getDocs(qBloqueos);
        const ocupacionesBloqueos: OcupacionSlot[] = bloqueosSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            inicio: data.hora_inicio,
            fin: data.hora_fin,
            tipo: 'bloqueo',
          };
        });

        // Combinar ocupaciones
        const todasOcupaciones = [...ocupacionesAgenda, ...ocupacionesBloqueos];

        // 3. Calcular en vivo los slots disponibles
        const slots = calculateAvailableSlots(
          selectedDate,
          selectedServicio.duracion_minutos,
          todasOcupaciones
        );
        setAvailableSlots(slots);
      } catch (err: any) {
        console.error('Error calculando disponibilidad:', err);
        setBookingError('No se pudo calcular la disponibilidad. Inténtalo de nuevo.');
      } finally {
        setLoadingSlots(false);
      }
    }

    if (step === 'fecha_hora') {
      fetchSlots();
    }
  }, [selectedBarbero, selectedServicio, selectedDate, step]);

  if (!isOpen) return null;

  const handleBarberoSelect = (barbero: Barbero) => {
    setSelectedBarbero(barbero);
    if (!selectedServicio) {
      setStep('servicio');
    } else {
      setStep('fecha_hora');
    }
  };

  const handleServicioSelect = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setStep('fecha_hora');
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep('datos');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setClientPhone(val);
    if (val && !isValidColombianPhone(val)) {
      setPhoneError('Ingresa un número colombiano válido de 10 dígitos (ej. 311 235 2517)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    if (!clientName.trim() || clientName.trim().length < 2) {
      setBookingError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!isValidColombianPhone(clientPhone)) {
      setPhoneError('Ingresa un celular colombiano válido de 10 dígitos iniciando en 3.');
      return;
    }

    if (!consentData) {
      setBookingError('Debes autorizar el tratamiento de datos personales para continuar.');
      return;
    }

    if (!selectedBarbero || !selectedServicio || !selectedDate || !selectedSlot) {
      setBookingError('Faltan datos de la reserva.');
      return;
    }

    setSubmitting(true);

    try {
      // Transacción atómica de Firestore con verificación de colisiones en tiempo real
      const result = await createBookingTransaction({
        cliente_nombre: clientName,
        cliente_telefono: clientPhone,
        barbero_id: selectedBarbero.id,
        barbero_nombre: selectedBarbero.nombre,
        servicio_id: selectedServicio.id,
        servicio_nombre: selectedServicio.nombre,
        precio: selectedServicio.precio,
        duracion_minutos: selectedServicio.duracion_minutos,
        fecha: selectedDate,
        hora_inicio: selectedSlot,
        consentimiento_datos: consentData,
      });

      setConfirmedCita(result.cita);
      setStep('confirmacion');
    } catch (err: any) {
      console.error('Error al confirmar reserva:', err);
      setBookingError(err.message || 'Ocurrió un error al agendar la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/#mis-citas/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="h-4 w-4 rotate-[-45deg]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase">
                Agendar Cita en Vivo
              </h3>
              <p className="text-[11px] text-amber-400/90 font-medium">
                New Concept 24k • Belén La Nubia
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Pasos (Breadcrumb) */}
        {step !== 'confirmacion' && (
          <div className="grid grid-cols-4 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-center">
            <div
              className={`py-2.5 px-1 ${
                step === 'barbero'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500'
                  : selectedBarbero
                  ? 'text-neutral-300'
                  : 'text-neutral-600'
              }`}
            >
              1. Barbero
            </div>
            <div
              className={`py-2.5 px-1 ${
                step === 'servicio'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500'
                  : selectedServicio
                  ? 'text-neutral-300'
                  : 'text-neutral-600'
              }`}
            >
              2. Servicio
            </div>
            <div
              className={`py-2.5 px-1 ${
                step === 'fecha_hora'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500'
                  : selectedSlot
                  ? 'text-neutral-300'
                  : 'text-neutral-600'
              }`}
            >
              3. Horario
            </div>
            <div
              className={`py-2.5 px-1 ${
                step === 'datos'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500'
                  : 'text-neutral-600'
              }`}
            >
              4. Confirmar
            </div>
          </div>
        )}

        {/* Contenido Dinámico con Scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* PASO 1: BARBERO */}
          {step === 'barbero' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-black text-white uppercase">
                  Elige tu Barbero
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  La atención es siempre con el barbero específico que tú selecciones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {BARBEROS_BASE.map((barbero) => {
                  const isSelected = selectedBarbero?.id === barbero.id;
                  return (
                    <div
                      key={barbero.id}
                      onClick={() => handleBarberoSelect(barbero)}
                      className={`group p-5 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-neutral-900 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {/* Silueta vectorial estilizada */}
                        <div className="h-14 w-14 rounded-xl bg-neutral-950 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <User className="h-7 w-7" />
                        </div>
                        <div>
                          <h5 className="text-base font-black text-white uppercase">
                            {barbero.nombre}
                          </h5>
                          <span className="text-[11px] text-amber-400 font-semibold uppercase">
                            {barbero.rol}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {barbero.especialidad}
                      </p>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400 font-medium">
                          Fortaleza: Corte con barba
                        </span>
                        <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                          Elegir →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2: SERVICIO */}
          {step === 'servicio' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-white uppercase">
                    Elige el Servicio
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Barbero seleccionado: <strong className="text-amber-400">{selectedBarbero?.nombre}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setStep('barbero')}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Cambiar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {SERVICIOS_BASE.map((servicio) => {
                  const isSelected = selectedServicio?.id === servicio.id;
                  return (
                    <div
                      key={servicio.id}
                      onClick={() => handleServicioSelect(servicio)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-neutral-900 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-black text-white uppercase">
                            {servicio.nombre}
                          </h5>
                          <span className="text-xs font-bold text-amber-400">
                            {formatCOP(servicio.precio)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                          {servicio.descripcion}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>{servicio.duracion_label}</span>
                        </span>
                        <span className="text-amber-400 font-bold">Seleccionar →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: FECHA & HORA */}
          {step === 'fecha_hora' && (
            <div className="space-y-6">
              {/* Resumen de selección previa */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Barbero:</span>
                  <span className="font-bold text-white">{selectedBarbero?.nombre}</span>
                  <button
                    onClick={() => setStep('barbero')}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    (Cambiar)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Servicio:</span>
                  <span className="font-bold text-white">
                    {selectedServicio?.nombre} ({formatCOP(selectedServicio?.precio || 0)})
                  </span>
                  <button
                    onClick={() => setStep('servicio')}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    (Cambiar)
                  </button>
                </div>
              </div>

              {/* Selector de Fecha */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                  Selecciona la Fecha (Hasta 6 días adelante)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availableDates.map((date) => {
                    const isSelected = selectedDate === date.dateIso;
                    return (
                      <button
                        key={date.dateIso}
                        type="button"
                        onClick={() => setSelectedDate(date.dateIso)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'border-neutral-800 bg-neutral-900/70 text-neutral-400 hover:border-neutral-700 hover:text-white'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-wider">
                          {date.isToday ? 'Hoy' : date.dayName.slice(0, 3)}
                        </span>
                        <span className="block text-lg font-black text-white my-0.5">
                          {date.dayNumber}
                        </span>
                        <span className="block text-[10px] text-neutral-500">
                          {date.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Horarios Disponibles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Horas Disponibles (8:00 a.m. – 9:00 p.m.)
                  </label>
                  <span className="text-[11px] text-neutral-500">
                    Mínimo 2h de anticipación
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-6 w-6 text-amber-400 animate-spin mb-2" />
                    <span className="text-xs text-neutral-400">Verificando agenda en vivo...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 text-center">
                    <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <h5 className="text-sm font-bold text-white uppercase">
                      No hay turnos disponibles para esta fecha
                    </h5>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      Los horarios de este día ya están reservados o bloqueados para {selectedBarbero?.nombre}. Por favor selecciona otro día.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`py-2.5 px-2 rounded-lg border text-xs font-bold tracking-wide transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-neutral-950 shadow-md'
                              : 'border-neutral-800 bg-neutral-900 hover:border-amber-500/50 text-neutral-200 hover:text-white'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 4: DATOS DEL CLIENTE Y VALIDACIÓN LEY 1581 */}
          {step === 'datos' && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div>
                  <h4 className="text-base font-black text-white uppercase">
                    Tus Datos de Contacto
                  </h4>
                  <p className="text-xs text-neutral-400">
                    No necesitas contraseña. Se generará un enlace personal para ti.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('fecha_hora')}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </button>
              </div>

              {/* Resumen de cita seleccionada */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Barbero</span>
                  <span className="font-bold text-white">{selectedBarbero?.nombre}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Servicio</span>
                  <span className="font-bold text-white">{selectedServicio?.nombre}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Fecha & Hora</span>
                  <span className="font-bold text-amber-400">
                    {selectedDate} a las {selectedSlot}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tarifa (en el local)</span>
                  <span className="font-bold text-white">
                    {formatCOP(selectedServicio?.precio || 0)}
                  </span>
                </div>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Restrepo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white text-sm outline-none placeholder:text-neutral-600"
                />
              </div>

              {/* Celular colombiano */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Número de Celular (Colombia) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                    +57
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="311 235 2517"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl bg-neutral-900 border text-white text-sm outline-none placeholder:text-neutral-600 ${
                      phoneError
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-neutral-800 focus:border-amber-500'
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs text-rose-400">{phoneError}</p>
                )}
              </div>

              {/* Casilla de Tratamiento de Datos Personales (Ley 1581 de 2012) */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <input
                    type="checkbox"
                    required
                    checked={consentData}
                    onChange={(e) => setConsentData(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-400"
                  />
                  <div className="text-xs text-neutral-300 leading-relaxed">
                    Autorizo a Barbería New Concept 24k el tratamiento de mis datos personales para coordinar y gestionar mi cita, de acuerdo con la{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className="text-amber-400 font-bold underline hover:text-amber-300 inline"
                    >
                      Ley 1581 de 2012 de Colombia
                    </button>
                    .
                  </div>
                </label>
              </div>

              {bookingError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando y Confirmando Cita...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirmar Reserva Inmediata</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* PASO 5: CONFIRMACIÓN Y ENLACE PERSONAL */}
          {step === 'confirmacion' && confirmedCita && (
            <div className="space-y-6 text-center py-2">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Cita Confirmada al Instante
                </span>
                <h4 className="text-2xl font-black text-white uppercase">
                  ¡Listo, {confirmedCita.cliente_nombre}!
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Tu turno está asegurado en la agenda de New Concept 24k sin cruces de horarios.
                </p>
              </div>

              {/* Resumen de cita */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Barbero:</span>
                  <span className="font-bold text-white">{confirmedCita.barbero_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Servicio:</span>
                  <span className="font-bold text-white">{confirmedCita.servicio_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fecha & Hora:</span>
                  <span className="font-bold text-amber-400">
                    {confirmedCita.fecha} ({confirmedCita.hora_inicio} – {confirmedCita.hora_fin})
                  </span>
                </div>
                <div className="flex justify-between border-t border-neutral-800 pt-2">
                  <span className="text-neutral-400">Total a pagar en el local:</span>
                  <span className="font-black text-white text-sm">
                    {formatCOP(confirmedCita.precio)}
                  </span>
                </div>
              </div>

              {/* Token y Enlace Personal de Gestión */}
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-amber-500/30 text-left max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Enlace Personal de Gestión
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Token: {confirmedCita.token_gestion}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Guarda este enlace para consultar tu cita o cancelarla libremente hasta 3 horas antes:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/#mis-citas/${confirmedCita.token_gestion}`}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 outline-none"
                  />
                  <button
                    onClick={() => handleCopyLink(confirmedCita.token_gestion)}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Botones de acción final */}
              <div className="space-y-3 max-w-md mx-auto pt-2">
                {/* Botón WhatsApp */}
                <a
                  href={getWhatsAppBookingLink(confirmedCita)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>Confirmar por WhatsApp</span>
                </a>

                {/* Abrir vista de gestión */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToClientView(confirmedCita.token_gestion);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-bold text-xs uppercase"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                  <span>Abrir mi pantalla de cita</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Ley 1581 */}
      <DataPrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};
