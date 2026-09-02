import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  KeyRound,
  Phone,
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isValidColombianPhone, cleanPhone, formatCOP } from '../lib/bookingLogic';
import { Cita, EstadoCita } from '../types';

interface SearchAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchToken: (token: string) => void;
  onOpenBooking?: () => void;
  initialPhone?: string;
}

export const SearchAppointmentModal: React.FC<SearchAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSearchToken,
  onOpenBooking,
  initialPhone = '',
}) => {
  const [activeTab, setActiveTab] = useState<'celular' | 'token'>('celular');
  
  // Estado para búsqueda por Celular
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [phoneResults, setPhoneResults] = useState<Cita[] | null>(null);
  const [searchedPhoneNum, setSearchedPhoneNum] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Estado para búsqueda por Token
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Sincronizar initialPhone si cambia
  useEffect(() => {
    if (initialPhone) {
      setPhoneInput(initialPhone);
    }
  }, [initialPhone]);

  // Limpiar estado al cerrar o cambiar modal
  useEffect(() => {
    if (!isOpen) {
      setPhoneResults(null);
      setPhoneError('');
      setTokenError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatear visualmente el celular como 3XX XXX XXXX mientras el cliente escribe
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneInput(raw);
    if (phoneError) setPhoneError('');
  };

  const formatDisplayPhone = (raw: string) => {
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 10)}`;
  };

  // Ejecutar búsqueda por número de celular en Firestore
  const handleSearchByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanPhone(phoneInput);

    if (!clean) {
      setPhoneError('Por favor escribe tu número de celular.');
      return;
    }

    if (!isValidColombianPhone(clean)) {
      setPhoneError('El celular debe tener exactamente 10 dígitos e iniciar en 3 (ej. 311 235 2517).');
      return;
    }

    setSearchingPhone(true);
    setPhoneError('');

    try {
      // 1. Obtener el índice de teléfonos por get puntual (seguro, sin 'list' en Firestore)
      const indiceRef = doc(db, 'indice_telefonos', clean);
      const indiceSnap = await getDoc(indiceRef);

      if (!indiceSnap.exists()) {
        setPhoneResults([]);
        setSearchedPhoneNum(clean);
        return;
      }

      const rawTokens = (indiceSnap.data().tokens as string[]) || [];
      if (rawTokens.length === 0) {
        setPhoneResults([]);
        setSearchedPhoneNum(clean);
        return;
      }

      // Tomar hasta las 20 citas más recientes (los últimos tokens agregados)
      const tokensToFetch = rawTokens.slice(-20);

      // 2. Traer cada cita mediante getDoc puntual (aprovechando la regla segura de get por token)
      const citasPromises = tokensToFetch.map(async (tk) => {
        try {
          const citaDoc = await getDoc(doc(db, 'citas', tk));
          if (citaDoc.exists()) {
            return {
              id: citaDoc.id,
              ...(citaDoc.data() as Cita),
            };
          }
          return null;
        } catch (err) {
          console.warn(`No se pudo cargar la cita ${tk}:`, err);
          return null;
        }
      });

      const results = await Promise.all(citasPromises);
      const validCitas: Cita[] = results.filter((c): c is Cita => c !== null);

      // Ordenar todas las citas de más reciente a más antigua
      validCitas.sort((a, b) => {
        const dateA = `${a.fecha}T${a.hora_inicio}`;
        const dateB = `${b.fecha}T${b.hora_inicio}`;
        return dateB.localeCompare(dateA);
      });

      setPhoneResults(validCitas);
      setSearchedPhoneNum(clean);
    } catch (err: any) {
      console.error('Error al consultar citas por celular:', err);
      setPhoneError('Ocurrió un error al consultar tus citas en la base de datos. Por favor verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setSearchingPhone(false);
    }
  };

  // Ejecutar búsqueda por Token
  const handleSearchByToken = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken || cleanToken.length < 8) {
      setTokenError('Por favor ingresa un código de cita válido (ej. nc24k_...).');
      return;
    }
    setTokenError('');
    onClose();
    onSearchToken(cleanToken);
  };

  const handleSelectCita = (token: string) => {
    onClose();
    onSearchToken(token);
  };

  const handleResetPhoneSearch = () => {
    setPhoneResults(null);
    setPhoneError('');
  };

  // Helper para badge de estado
  const renderEstadoBadge = (estado: EstadoCita) => {
    switch (estado) {
      case 'confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" /> Confirmada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
            <XCircle className="h-3 w-3" /> Cancelada
          </span>
        );
      case 'completada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" /> Completada
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" /> No-Show
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden">
        
        {/* Header del Modal */}
        <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Mis Citas
              </h3>
              <p className="text-xs text-neutral-400">
                Consulta y gestiona tus reservas en New Concept 24k
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs de Selección: Por Celular vs Por Token */}
        <div className="px-6 pt-4 border-b border-neutral-800/60 bg-neutral-900/40">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('celular');
                setPhoneError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 pb-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'celular'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Phone className="h-4 w-4" />
              <span>Por Celular (Recomendado)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('token');
                setTokenError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 pb-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'token'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Por Código / Token</span>
            </button>
          </div>
        </div>

        {/* Contenido según pestaña activa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* ===================== TAB 1: BÚSQUEDA POR CELULAR ===================== */}
          {activeTab === 'celular' && (
            <div>
              {/* Si todavía no se ha buscado o si el usuario quiere buscar de nuevo */}
              {phoneResults === null ? (
                <form onSubmit={handleSearchByPhone} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Número de Celular (Colombia)
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1.5 text-xs font-bold text-neutral-400 pointer-events-none">
                        <span>🇨🇴 +57</span>
                        <span className="text-neutral-600">|</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="311 235 2517"
                        value={formatDisplayPhone(phoneInput)}
                        onChange={handlePhoneChange}
                        autoFocus
                        className="w-full pl-24 pr-4 py-3.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-white font-mono text-sm outline-none placeholder:text-neutral-600 transition-colors"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      Escribe los 10 dígitos del número telefónico con el que agendaste tu cita. Te mostraremos todas tus citas pasadas y futuras.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={searchingPhone}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-60"
                  >
                    {searchingPhone ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Consultando Agenda...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Consultar Mis Citas</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* RESULTADOS DE LA BÚSQUEDA POR CELULAR */
                <div className="space-y-4">
                  {/* Barra de cabecera con el celular buscado */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-neutral-300">
                        Citas para: <strong className="text-white font-mono">+57 {formatDisplayPhone(searchedPhoneNum)}</strong>
                      </span>
                    </div>
                    <button
                      onClick={handleResetPhoneSearch}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                      title="Cambiar número de celular"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  {/* Lista de Citas */}
                  {phoneResults.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                        <span>{phoneResults.length} {phoneResults.length === 1 ? 'cita encontrada' : 'citas encontradas'}</span>
                        <span className="text-[11px] text-neutral-500">Ordenadas de más reciente a más antigua</span>
                      </div>

                      <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                        {phoneResults.map((c) => (
                          <div
                            key={c.id}
                            className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800/90 hover:border-neutral-700 transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black text-white uppercase">
                                  {c.servicio_nombre}
                                </h4>
                                <span className="text-xs text-amber-400 font-bold">
                                  {formatCOP(c.precio)}
                                </span>
                              </div>
                              <div>{renderEstadoBadge(c.estado)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300 pt-1 border-t border-neutral-800/60">
                              <div className="flex items-center gap-1.5 text-neutral-300">
                                <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                <span className="font-semibold">{c.fecha}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-amber-400">
                                <Clock className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                <span>{c.hora_inicio} – {c.hora_fin}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-neutral-400 col-span-2">
                                <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                <span>Barbero: <strong className="text-neutral-200">{c.barbero_nombre}</strong></span>
                              </div>
                            </div>

                            {/* Botón para ver detalle completo de la cita individual */}
                            <button
                              onClick={() => handleSelectCita(c.token_gestion)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                              <span>Ver Detalle y Gestionar</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/60 text-[11px] text-neutral-400 leading-relaxed">
                        💡 Para cancelar o verificar si tu cita está dentro de las 3 horas de anticipación requeridas, presiona en <strong>Ver Detalle y Gestionar</strong>.
                      </div>
                    </div>
                  ) : (
                    /* CERO RESULTADOS */
                    <div className="p-6 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                      <div className="h-12 w-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase">
                        No hay citas registradas
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                        No encontramos ninguna cita asociada al celular <strong>+57 {formatDisplayPhone(searchedPhoneNum)}</strong>. Revisa que coincida exactamente con el que usaste al agendar.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                        <button
                          onClick={handleResetPhoneSearch}
                          className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Buscar otro celular
                        </button>
                        {onOpenBooking && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenBooking();
                            }}
                            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider transition-colors"
                          >
                            Agendar Nueva Cita
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: BÚSQUEDA POR TOKEN ===================== */}
          {activeTab === 'token' && (
            <form onSubmit={handleSearchByToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Código de Reserva / Token de Gestión
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="nc24k_..."
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (tokenError) setTokenError('');
                    }}
                    autoFocus
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs outline-none placeholder:text-neutral-600 transition-colors"
                  />
                </div>
                {tokenError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{tokenError}</span>
                  </p>
                )}
                <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                  Este código único de mínimo 16 caracteres te fue entregado al momento de confirmar tu cita y también se envió a tu WhatsApp.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
              >
                <KeyRound className="h-4 w-4" />
                <span>Acceder a Mi Cita</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer Informativo de Seguridad */}
        <div className="p-3.5 border-t border-neutral-800/80 bg-neutral-900/70 text-center">
          <p className="text-[11px] text-neutral-400">
            🔒 Barbería New Concept 24k • Belén La Nubia, Medellín
          </p>
        </div>

      </div>
    </div>
  );
};
