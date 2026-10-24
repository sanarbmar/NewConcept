import React, { useState, useEffect } from 'react';
import {
  Lock,
  Calendar,
  Clock,
  User,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  Plus,
  Trash2,
  Phone,
  BarChart3,
  Search,
  ArrowLeft,
  Loader2,
  CalendarDays,
  Scissors,
  ShieldCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { auth, db, BARBEROS_BASE, SERVICIOS_BASE } from '../lib/firebase';
import { checkAdminAuthorization } from '../lib/adminAuth';
import {
  getBogotaNow,
  formatDateIso,
  formatCOP,
  cleanPhone,
  BUSINESS_PHONE_INTL,
  OPENING_MINUTES,
  CLOSING_MINUTES,
  timeToMinutes,
  minutesToTime,
  createManualBookingTransaction,
  OcupacionSlot
} from '../lib/bookingLogic';
import { Cita, Bloqueo, EstadoCita } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

// Duraciones rápidas para citas manuales (el barbero también puede escribir cualquier valor en minutos)
const DURACIONES_RAPIDAS = [15, 20, 30, 45, 60, 90];

// "14:30" -> "2:30 p. m." (más fácil de leer para el barbero y los clientes)
const aHora12 = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [adminNombre, setAdminNombre] = useState<string>('');
  const [authChecking, setAuthChecking] = useState(true);

  // Estado Login Google
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Pestañas del Panel
  const [activeTab, setActiveTab] = useState<'agenda' | 'bloqueos' | 'reportes'>('agenda');

  // Datos
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filtros de Agenda
  const [filtroBarbero, setFiltroBarbero] = useState<string>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('hoy'); // 'hoy' | 'semana' | 'todas' | 'custom'
  const [fechaEspecifica, setFechaEspecifica] = useState<string>(formatDateIso(getBogotaNow()));
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  // Formulario de Bloqueo
  const [nuevoBloqueoBarbero, setNuevoBloqueoBarbero] = useState('barbero_ciro');
  const [nuevoBloqueoFecha, setNuevoBloqueoFecha] = useState(formatDateIso(getBogotaNow()));
  const [nuevoBloqueoInicio, setNuevoBloqueoInicio] = useState('10:00');
  const [nuevoBloqueoFin, setNuevoBloqueoFin] = useState('12:00');
  const [nuevoBloqueoMotivo, setNuevoBloqueoMotivo] = useState('Ciro entra tarde');
  const [creandoBloqueo, setCreandoBloqueo] = useState(false);
  const [liberandoBloqueoId, setLiberandoBloqueoId] = useState<string | null>(null);
  const [bloqueoFeedback, setBloqueoFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Cita manual: el barbero agenda clientes que no reservaron por la página
  const [manualAbierto, setManualAbierto] = useState(false);
  const [manualBarbero, setManualBarbero] = useState('barbero_sebas');
  const [manualFecha, setManualFecha] = useState(formatDateIso(getBogotaNow()));
  const [manualHora, setManualHora] = useState('10:00');
  const [manualDuracion, setManualDuracion] = useState('30'); // texto, para poder escribir libremente
  const [manualServicioId, setManualServicioId] = useState('srv_corte');
  const [manualServicioOtro, setManualServicioOtro] = useState('');
  const [manualPrecio, setManualPrecio] = useState('25000');
  const [manualNombre, setManualNombre] = useState('');
  const [manualTelefono, setManualTelefono] = useState('');
  const [manualNotas, setManualNotas] = useState('');
  const [manualYaAtendida, setManualYaAtendida] = useState(false);
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [manualError, setManualError] = useState('');
  const [ocupacionesDia, setOcupacionesDia] = useState<OcupacionSlot[]>([]);
  const [cargandoOcupaciones, setCargandoOcupaciones] = useState(false);
  const [agendaFeedback, setAgendaFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Escuchar estado de autenticación y verificar en Firestore si existe en la colección 'admins' con activo == true
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setAuthChecking(true);
        const { authorized, nombre } = await checkAdminAuthorization(currentUser.email);
        if (authorized) {
          setUser(currentUser);
          setAdminNombre(nombre || '');
          setLoginError('');
        } else {
          // Si el usuario no está en la colección admins con activo == true, revocar sesión inmediatamente
          await signOut(auth);
          setUser(null);
          setAdminNombre('');
          setLoginError(
            `Acceso denegado: La cuenta (${currentUser.email || 'desconocida'}) no tiene autorización de administrador. Solo correos registrados con activo: true en la colección "admins" de Firebase tienen acceso.`
          );
        }
      } else {
        setUser(null);
        setAdminNombre('');
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Cargar citas y bloqueos cuando esté autenticado y autorizado
  const fetchAdminData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      // 1. Cargar todas las citas
      const citasRef = collection(db, 'citas');
      const qCitas = query(citasRef, orderBy('fecha', 'desc'));
      const snapCitas = await getDocs(qCitas);
      const listCitas = snapCitas.docs.map((d) => d.data() as Cita);
      setCitas(listCitas);

      // 2. Cargar bloqueos
      const bloqueosRef = collection(db, 'bloqueos');
      const snapBloqueos = await getDocs(bloqueosRef);
      const listBloqueos = snapBloqueos.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Bloqueo[];
      setBloqueos(listBloqueos);
    } catch (err: any) {
      console.error('Error cargando datos de admin:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  // Cita manual: mostrar qué está ocupado ese día para ese barbero (citas y bloqueos)
  useEffect(() => {
    if (!manualAbierto || !user || !manualFecha) return;
    let cancelado = false;
    setCargandoOcupaciones(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'agenda_dia', `${manualBarbero}_${manualFecha}`));
        if (cancelado) return;
        const ocs = snap.exists() ? ((snap.data().ocupaciones as OcupacionSlot[]) || []) : [];
        setOcupacionesDia([...ocs].sort((a, b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio)));
      } catch (err) {
        console.warn('No se pudo leer la agenda del día:', err);
        if (!cancelado) setOcupacionesDia([]);
      } finally {
        if (!cancelado) setCargandoOcupaciones(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [manualAbierto, manualBarbero, manualFecha, user]);

  // Cita manual: cerrar con la tecla Esc
  useEffect(() => {
    if (!manualAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardandoManual) setManualAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manualAbierto, guardandoManual]);

  // Iniciar sesión con Google
  const handleGoogleLogin = async () => {
    setLoginError('');
    setLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const signedUser = result.user;

      // Consulta en Firestore si existe admins/{email} y activo es true
      const { authorized, nombre } = await checkAdminAuthorization(signedUser.email);

      if (!authorized) {
        await signOut(auth);
        setUser(null);
        setAdminNombre('');
        setLoginError(
          `Acceso denegado: El correo "${signedUser.email || 'desconocido'}" no pertenece a la colección de administradores activos de New Concept 24k.`
        );
        return;
      }

      setUser(signedUser);
      setAdminNombre(nombre || '');
    } catch (err: any) {
      console.error('Error login con Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('Se canceló la ventana de inicio de sesión con Google.');
      } else if (err.code === 'auth/popup-blocked') {
        setLoginError('El navegador bloqueó la ventana emergente de Google. Habilita las ventanas emergentes e intenta de nuevo.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Intento concurrente ignorado
      } else {
        setLoginError(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Actualizar estado de cita
  const handleCambiarEstadoCita = async (token: string, nuevoEstado: EstadoCita) => {
    try {
      const citaRef = doc(db, 'citas', token);
      await updateDoc(citaRef, {
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      });

      // Si se cancela, liberar franja en agenda_dia
      if (nuevoEstado === 'cancelada') {
        const c = citas.find((item) => item.token_gestion === token);
        if (c) {
          try {
            const agendaRef = doc(db, 'agenda_dia', `${c.barbero_id}_${c.fecha}`);
            const aSnap = await getDoc(agendaRef);
            if (aSnap.exists()) {
              const ocs = (aSnap.data().ocupaciones as OcupacionSlot[]) || [];
              await updateDoc(agendaRef, {
                ocupaciones: ocs.filter((occ) => occ.id !== token),
              });
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }

      // Actualizar estado local
      setCitas((prev) =>
        prev.map((c) => (c.token_gestion === token ? { ...c, estado: nuevoEstado } : c))
      );
    } catch (err: any) {
      alert('Error actualizando cita: ' + err.message);
    }
  };

  // Crear bloqueo de horario
  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoBloqueo(true);
    setBloqueoFeedback(null);
    try {
      const nuevo = {
        barbero_id: nuevoBloqueoBarbero,
        fecha: nuevoBloqueoFecha,
        hora_inicio: nuevoBloqueoInicio,
        hora_fin: nuevoBloqueoFin,
        motivo: nuevoBloqueoMotivo.trim() || 'Bloqueo administrativo',
        creado_en: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'bloqueos'), nuevo);
      const bloqueoId = docRef.id;

      // Sincronizar en agenda_dia para que el horario quede bloqueado en la agenda
      try {
        const agendaRef = doc(db, 'agenda_dia', `${nuevoBloqueoBarbero}_${nuevoBloqueoFecha}`);
        const agendaSnap = await getDoc(agendaRef);
        const slotBloqueo: OcupacionSlot = {
          id: bloqueoId,
          inicio: nuevoBloqueoInicio,
          fin: nuevoBloqueoFin,
          tipo: 'bloqueo',
        };

        if (agendaSnap.exists()) {
          const ocs = (agendaSnap.data().ocupaciones as OcupacionSlot[]) || [];
          await updateDoc(agendaRef, {
            ocupaciones: [...ocs, slotBloqueo],
            actualizado_en: new Date().toISOString(),
          });
        } else {
          await setDoc(agendaRef, {
            barbero_id: nuevoBloqueoBarbero,
            fecha: nuevoBloqueoFecha,
            ocupaciones: [slotBloqueo],
            actualizado_en: new Date().toISOString(),
          });
        }
      } catch (agendaErr) {
        console.warn('Error agregando bloqueo a agenda_dia:', agendaErr);
      }
      
      setBloqueos((prev) => [
        { id: bloqueoId, ...nuevo },
        ...prev,
      ]);

      setNuevoBloqueoMotivo('');
      setBloqueoFeedback({
        tipo: 'exito',
        texto: `Horario bloqueado con éxito para ${
          nuevoBloqueoBarbero === 'barbero_ciro' ? 'Sebastián Ciro' : 'Sebastián Correa'
        } (${nuevoBloqueoInicio} - ${nuevoBloqueoFin}).`,
      });
    } catch (err: any) {
      console.error('Error creando bloqueo:', err);
      setBloqueoFeedback({
        tipo: 'error',
        texto: 'Error creando bloqueo: ' + (err.message || 'Ocurrió un error inesperado.'),
      });
    } finally {
      setCreandoBloqueo(false);
    }
  };

  // Liberar bloqueo de horario
  const handleEliminarBloqueo = async (bloqueoOrId: Bloqueo | string) => {
    const bloqueo = typeof bloqueoOrId === 'string'
      ? bloqueos.find((b) => b.id === bloqueoOrId)
      : bloqueoOrId;

    const id = typeof bloqueoOrId === 'string' ? bloqueoOrId : bloqueoOrId.id;

    setLiberandoBloqueoId(id);
    setBloqueoFeedback(null);
    try {
      // 1. Eliminar documento de la colección bloqueos
      await deleteDoc(doc(db, 'bloqueos', id));

      // 2. Eliminar de agenda_dia la entrada en ocupaciones cuyo id coincide con el ID de ese bloqueo
      if (bloqueo) {
        try {
          const agendaRef = doc(db, 'agenda_dia', `${bloqueo.barbero_id}_${bloqueo.fecha}`);
          const agendaSnap = await getDoc(agendaRef);
          if (agendaSnap.exists()) {
            const data = agendaSnap.data();
            const ocs = (data.ocupaciones as OcupacionSlot[]) || [];
            const filtradas = ocs.filter((occ) => occ.id !== id);
            await updateDoc(agendaRef, {
              ocupaciones: filtradas,
              actualizado_en: new Date().toISOString(),
            });
          }
        } catch (agendaErr) {
          console.warn('Error actualizando agenda_dia tras liberar bloqueo:', agendaErr);
        }
      }

      // 3. Actualizar la lista de bloqueos activos en pantalla de inmediato
      setBloqueos((prev) => prev.filter((b) => b.id !== id));
      setBloqueoFeedback({
        tipo: 'exito',
        texto: 'Horario liberado con éxito. Ya está disponible nuevamente para reservas.',
      });
    } catch (err: any) {
      console.error('Error eliminando bloqueo:', err);
      setBloqueoFeedback({
        tipo: 'error',
        texto: 'Error al liberar el bloqueo: ' + (err.message || 'Ocurrió un error inesperado.'),
      });
    } finally {
      setLiberandoBloqueoId(null);
    }
  };

  // Filtros aplicados a citas
  const bogotaNow = getBogotaNow();
  const hoyIso = formatDateIso(bogotaNow);

  // Calcular inicio y fin de la semana actual (Lunes a Sábado)
  const primerDiaSemana = new Date(bogotaNow);
  const diaActualSemana = bogotaNow.getDay(); // 0 domingo, 1 lunes...
  const distLunes = diaActualSemana === 0 ? -6 : 1 - diaActualSemana;
  primerDiaSemana.setDate(bogotaNow.getDate() + distLunes);
  const ultimoDiaSemana = new Date(primerDiaSemana);
  ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 5);

  const lunesIso = formatDateIso(primerDiaSemana);
  const sabadoIso = formatDateIso(ultimoDiaSemana);

  // ---- Citas manuales ----
  const abrirCitaManual = () => {
    const fechaBase = filtroFecha === 'custom' && fechaEspecifica ? fechaEspecifica : hoyIso;
    // Hora sugerida: el próximo medio punto si es hoy; la apertura si es otro día
    const minutosAhora = bogotaNow.getHours() * 60 + bogotaNow.getMinutes();
    const sugerida =
      fechaBase === hoyIso
        ? Math.min(Math.max(Math.ceil(minutosAhora / 30) * 30, OPENING_MINUTES), 23 * 60 + 30)
        : OPENING_MINUTES;

    setManualError('');
    setAgendaFeedback(null);
    setManualBarbero(filtroBarbero !== 'todos' ? filtroBarbero : 'barbero_sebas');
    setManualFecha(fechaBase);
    setManualHora(minutesToTime(sugerida));
    setManualAbierto(true);
  };

  const handleManualServicio = (servicioId: string) => {
    setManualServicioId(servicioId);
    const s = SERVICIOS_BASE.find((x) => x.id === servicioId);
    if (s) {
      // Precarga la duración y el precio del servicio; el barbero puede cambiarlos
      setManualDuracion(String(s.duracion_minutos));
      setManualPrecio(String(s.precio));
    }
  };

  const handleCrearCitaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    const esOtro = manualServicioId === 'otro';
    const servicioBase = SERVICIOS_BASE.find((s) => s.id === manualServicioId);
    const servicioNombre = esOtro ? manualServicioOtro.trim() : servicioBase?.nombre || '';
    if (!servicioNombre) {
      setManualError('Escribe el nombre del servicio.');
      return;
    }
    const barbero = BARBEROS_BASE.find((b) => b.id === manualBarbero);
    if (!barbero) {
      setManualError('Selecciona el barbero.');
      return;
    }

    setGuardandoManual(true);
    try {
      const { cita } = await createManualBookingTransaction({
        cliente_nombre: manualNombre,
        cliente_telefono: manualTelefono,
        barbero_id: barbero.id,
        barbero_nombre: barbero.nombre,
        servicio_id: esOtro ? 'srv_personalizado' : manualServicioId,
        servicio_nombre: servicioNombre,
        precio: parseInt(manualPrecio.replace(/\D/g, ''), 10) || 0,
        duracion_minutos: parseInt(manualDuracion, 10),
        fecha: manualFecha,
        hora_inicio: manualHora,
        estado_inicial: manualYaAtendida ? 'completada' : 'confirmada',
        notas: manualNotas,
      });

      setCitas((prev) => [cita, ...prev]);

      // Mostrar de inmediato el día de la cita nueva para que el barbero la vea en su agenda
      setFiltroBarbero('todos');
      setFiltroEstado('todas');
      setBusquedaTexto('');
      setFiltroFecha('custom');
      setFechaEspecifica(cita.fecha);

      setAgendaFeedback({
        tipo: 'exito',
        texto: `Cita agendada: ${cita.cliente_nombre} • ${cita.fecha} de ${aHora12(cita.hora_inicio)} a ${aHora12(cita.hora_fin)} con ${cita.barbero_nombre}.`,
      });

      setManualNombre('');
      setManualTelefono('');
      setManualNotas('');
      setManualYaAtendida(false);
      setManualAbierto(false);
    } catch (err: any) {
      console.error('Error creando cita manual:', err);
      if (err?.code === 'permission-denied') {
        setManualError(
          'Firebase no permitió guardar la cita (permission-denied). Falta publicar las reglas de Firestore actualizadas (archivo firestore.rules) en Firebase Console → Firestore Database → Reglas.'
        );
      } else {
        setManualError(err?.message || 'No se pudo guardar la cita. Intenta de nuevo.');
      }
    } finally {
      setGuardandoManual(false);
    }
  };

  // Datos derivados del formulario manual (aviso de cruce en vivo, hora de fin)
  const manualDuracionNum = parseInt(manualDuracion, 10);
  const manualInicioMin = manualHora ? timeToMinutes(manualHora) : NaN;
  const manualFinMin = manualInicioMin + manualDuracionNum;
  const manualDatosValidos = Number.isFinite(manualFinMin) && manualDuracionNum > 0;
  const manualChoque = manualDatosValidos
    ? ocupacionesDia.find((o) => manualInicioMin < timeToMinutes(o.fin) && manualFinMin > timeToMinutes(o.inicio))
    : undefined;
  const manualFueraDeHorario =
    manualDatosValidos && (manualInicioMin < OPENING_MINUTES || manualFinMin > CLOSING_MINUTES);

  const citasFiltradas = citas.filter((c) => {
    // Filtro por barbero
    if (filtroBarbero !== 'todos' && c.barbero_id !== filtroBarbero) {
      return false;
    }

    // Filtro por fecha
    if (filtroFecha === 'hoy' && c.fecha !== hoyIso) {
      return false;
    }
    if (filtroFecha === 'semana' && (c.fecha < lunesIso || c.fecha > sabadoIso)) {
      return false;
    }
    if (filtroFecha === 'custom' && c.fecha !== fechaEspecifica) {
      return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'todas' && c.estado !== filtroEstado) {
      return false;
    }

    // Búsqueda libre
    if (busquedaTexto.trim()) {
      const q = busquedaTexto.toLowerCase();
      const coincide =
        c.cliente_nombre.toLowerCase().includes(q) ||
        (c.cliente_telefono || '').includes(q) ||
        c.servicio_nombre.toLowerCase().includes(q) ||
        c.token_gestion.toLowerCase().includes(q);
      if (!coincide) return false;
    }

    return true;
  }).sort((a, b) => {
    // Agenda de un solo día: de la primera a la última cita. Varios días: el más reciente primero.
    if (filtroFecha === 'hoy' || filtroFecha === 'custom') {
      return timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
    }
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
  });

  // Métricas para pestaña Reportes
  const totalCitas = citas.length;
  const citasCompletadas = citas.filter((c) => c.estado === 'completada');
  const ingresosEstimados = citasCompletadas.reduce((acc, c) => acc + (c.precio || 0), 0);

  const citasSebas = citas.filter((c) => c.barbero_id === 'barbero_sebas').length;
  const citasCiro = citas.filter((c) => c.barbero_id === 'barbero_ciro').length;

  const conteoServicios: Record<string, number> = {};
  citas.forEach((c) => {
    conteoServicios[c.servicio_nombre] = (conteoServicios[c.servicio_nombre] || 0) + 1;
  });

  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 p-4">
        <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // PANTALLA DE LOGIN (GOOGLE SIGN-IN CON LISTA BLANCA)
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg transition-colors"
            title="Cerrar panel"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Panel de Control
              </h3>
              <p className="text-xs text-amber-400 font-medium tracking-wide">
                New Concept 24k • Acceso Administrador
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4 text-xs text-neutral-300 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="h-4 w-4" />
                <span>Acceso Restringido</span>
              </div>
              <p>
                Inicia sesión con tu cuenta de Google autorizada. El acceso está protegido dinámicamente mediante la colección <code>admins</code> de Firestore y validado con reglas de seguridad estrictas.
              </p>
            </div>

            {loginError && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex gap-3 items-start animate-fade-in">
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-300 uppercase tracking-wide text-[11px]">Acceso Denegado</p>
                  <p className="leading-normal">{loginError}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 text-neutral-900 animate-spin" />
                  <span>Verificando con Google...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.15C3.25 21.26 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.41l4.01-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.74 1.27 6.59l4.01 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                    />
                  </svg>
                  <span>Iniciar sesión con Google</span>
                </>
              )}
            </button>

            {/* Aviso de lista blanca dinámica */}
            <div className="pt-2 text-center">
              <p className="text-[11px] text-neutral-500">
                Solo cuentas registradas en Firestore (<code>admins/&#123;email&#125;</code>) con <code>activo: true</code> pueden ingresar y gestionar citas.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed text-center">
            <p>
              🔒 <strong>Seguridad 24K:</strong> Autenticación Google + Verificación dinámica en colección <code>admins</code> en Firestore Rules.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA PRINCIPAL DE ADMINISTRACIÓN (AUTENTICADO)
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col overflow-hidden text-neutral-100">
      {/* Topbar */}
      <header className="px-6 py-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
              24k
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase leading-none">
                  Panel Administrativo
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold">
                  <ShieldCheck className="h-3 w-3" />
                  Admin Verificado
                </span>
              </div>
              <span className="text-[10px] text-amber-400/90 font-mono">
                {adminNombre ? `${adminNombre} • ` : ''}{user.email}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 ml-4">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'agenda'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Agenda de Citas ({citas.length})
            </button>
            <button
              onClick={() => setActiveTab('bloqueos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'bloqueos'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Bloqueos de Horario ({bloqueos.length})
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'reportes'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Reportes & Métricas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            title="Refrescar datos"
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg text-xs font-bold"
          >
            Actualizar
          </button>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      </header>

      {/* Tabs Mobile */}
      <div className="sm:hidden flex border-b border-neutral-800 bg-neutral-900/50 px-2 py-1.5 text-[11px] font-bold uppercase">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 py-1.5 text-center rounded-md ${
            activeTab === 'agenda' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
          }`}
        >
          Agenda ({citas.length})
        </button>
        <button
          onClick={() => setActiveTab('bloqueos')}
          className={`flex-1 py-1.5 text-center rounded-md ${
            activeTab === 'bloqueos' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
          }`}
        >
          Bloqueos ({bloqueos.length})
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`flex-1 py-1.5 text-center rounded-md ${
            activeTab === 'reportes' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
          }`}
        >
          Reportes
        </button>
      </div>

      {/* Contenido Principal con Scroll */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* PESTAÑA 1: AGENDA DE CITAS (Función más importante) */}
        {activeTab === 'agenda' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Encabezado + botón de cita manual */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white uppercase">Agenda</h3>
                <p className="text-xs text-neutral-400">
                  Registra también a los clientes que no reservan por la página, con la duración que necesites.
                </p>
              </div>
              <button
                type="button"
                onClick={abrirCitaManual}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva cita manual</span>
              </button>
            </div>

            {agendaFeedback && (
              <div
                role="status"
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  agendaFeedback.tipo === 'exito'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800 text-rose-300'
                }`}
              >
                <span>{agendaFeedback.texto}</span>
                <button
                  type="button"
                  onClick={() => setAgendaFeedback(null)}
                  aria-label="Cerrar aviso"
                  className="text-neutral-400 hover:text-white text-xs ml-4"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Barra de Filtros */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtro Barbero */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Barbero:</span>
                  <select
                    value={filtroBarbero}
                    onChange={(e) => setFiltroBarbero(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs font-bold text-white outline-none"
                  >
                    <option value="todos">Todos los Barberos</option>
                    <option value="barbero_sebas">Sebastián Correa</option>
                    <option value="barbero_ciro">Sebastián Ciro</option>
                  </select>
                </div>

                {/* Filtro Fecha */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Período:</span>
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs font-bold text-white outline-none"
                  >
                    <option value="hoy">Hoy ({hoyIso})</option>
                    <option value="semana">Esta Semana</option>
                    <option value="todas">Histórico Completo</option>
                    <option value="custom">Fecha Específica</option>
                  </select>
                </div>

                {filtroFecha === 'custom' && (
                  <input
                    type="date"
                    value={fechaEspecifica}
                    onChange={(e) => setFechaEspecifica(e.target.value)}
                    className="px-3 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white"
                  />
                )}

                {/* Filtro Estado */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Estado:</span>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs font-bold text-white outline-none"
                  >
                    <option value="todas">Todos los estados</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="no_show">No-Show</option>
                  </select>
                </div>

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, celular o token..."
                    value={busquedaTexto}
                    onChange={(e) => setBusquedaTexto(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white placeholder:text-neutral-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Lista / Grid de Citas */}
            {loadingData ? (
              <div className="py-16 text-center">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-neutral-400">Cargando agenda de citas...</p>
              </div>
            ) : citasFiltradas.length === 0 ? (
              <div className="p-12 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                <Calendar className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <h4 className="text-base font-black text-white uppercase">
                  No hay citas registradas con estos filtros
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Prueba cambiando la fecha o el barbero seleccionado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {citasFiltradas.map((cita) => {
                  const esConfirmada = cita.estado === 'confirmada';
                  const esCompletada = cita.estado === 'completada';
                  const esCancelada = cita.estado === 'cancelada';
                  const esNoShow = cita.estado === 'no_show';

                  return (
                    <div
                      key={cita.token_gestion}
                      className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                        esConfirmada
                          ? 'bg-neutral-900 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                          : 'bg-neutral-950 border-neutral-800/80'
                      }`}
                    >
                      <div>
                        {/* Header de la tarjeta */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                              {cita.fecha}
                              {cita.origen === 'manual' && (
                                <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-sans font-bold tracking-wide">
                                  Manual
                                </span>
                              )}
                            </span>
                            <h4 className="text-base font-black text-white uppercase">
                              {cita.hora_inicio} – {cita.hora_fin}
                            </h4>
                            <span className="text-[11px] text-neutral-400">
                              {aHora12(cita.hora_inicio)} a {aHora12(cita.hora_fin)} • {cita.duracion_minutos} min
                            </span>
                          </div>

                          {/* Badge de estado */}
                          <div>
                            {esConfirmada && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                Confirmada
                              </span>
                            )}
                            {esCompletada && (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase">
                                Completada
                              </span>
                            )}
                            {esCancelada && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase">
                                Cancelada
                              </span>
                            )}
                            {esNoShow && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                                No-Show
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Servicio & Barbero */}
                        <div className="space-y-1 py-2 border-y border-neutral-800/60 my-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Servicio:</span>
                            <span className="font-bold text-white">{cita.servicio_nombre}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Barbero:</span>
                            <span className="font-bold text-amber-400">{cita.barbero_nombre}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Precio:</span>
                            <span className="font-black text-white">{formatCOP(cita.precio)}</span>
                          </div>
                        </div>

                        {/* Datos del Cliente */}
                        <div className="space-y-1 text-xs pt-1">
                          <p className="font-bold text-white">
                            Cliente: <span className="font-normal">{cita.cliente_nombre}</span>
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400">Teléfono:</span>
                            {cita.cliente_telefono ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-neutral-300">{cita.cliente_telefono}</span>
                                <a
                                  href={`https://wa.me/57${cleanPhone(cita.cliente_telefono)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir chat en WhatsApp"
                                  className="p-1 text-emerald-400 hover:bg-emerald-950 rounded"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-neutral-500 italic">Sin celular</span>
                            )}
                          </div>
                          {cita.notas && (
                            <p className="text-neutral-400 pt-1">
                              Nota: <span className="text-neutral-200">{cita.notas}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botones de acción rápida sobre la cita */}
                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase">
                        <button
                          onClick={() => handleCambiarEstadoCita(cita.token_gestion, 'completada')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border transition-colors ${
                            esCompletada
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-neutral-900 hover:bg-blue-950 text-neutral-300 border-neutral-800'
                          }`}
                        >
                          ✓ Completar
                        </button>
                        <button
                          onClick={() => handleCambiarEstadoCita(cita.token_gestion, 'no_show')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border transition-colors ${
                            esNoShow
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-neutral-900 hover:bg-amber-950 text-neutral-300 border-neutral-800'
                          }`}
                        >
                          No-Show
                        </button>
                        <button
                          onClick={() => handleCambiarEstadoCita(cita.token_gestion, 'cancelada')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border transition-colors ${
                            esCancelada
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-neutral-900 hover:bg-rose-950 text-neutral-300 border-neutral-800'
                          }`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN DE BLOQUEOS MANUALES */}
        {activeTab === 'bloqueos' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Explicación de la función para el dueño */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Bloquear / Liberar Horarios Manualmente
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Utiliza este módulo cuando el horario de Ciro o Sebastián cambie ese día (por ejemplo: si Ciro entra a las 11:00 a.m., o Sebastián sale temprano). El sistema bloqueará automáticamente estos tramos para que ningún cliente pueda agendar en esas horas.
              </p>
            </div>

            {/* Mensaje de retroalimentación en pantalla */}
            {bloqueoFeedback && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  bloqueoFeedback.tipo === 'exito'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800 text-rose-300'
                }`}
              >
                <span>{bloqueoFeedback.texto}</span>
                <button
                  type="button"
                  onClick={() => setBloqueoFeedback(null)}
                  className="text-neutral-400 hover:text-white text-xs ml-4"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Formulario para agregar un bloqueo */}
            <form onSubmit={handleCrearBloqueo} className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Nuevo Bloqueo de Horario
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1 uppercase">Barbero</label>
                  <select
                    value={nuevoBloqueoBarbero}
                    onChange={(e) => setNuevoBloqueoBarbero(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                  >
                    <option value="barbero_ciro">Sebastián Ciro</option>
                    <option value="barbero_sebas">Sebastián Correa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1 uppercase">Fecha</label>
                  <input
                    type="date"
                    required
                    value={nuevoBloqueoFecha}
                    onChange={(e) => setNuevoBloqueoFecha(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1 uppercase">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={nuevoBloqueoInicio}
                    onChange={(e) => setNuevoBloqueoInicio(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1 uppercase">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={nuevoBloqueoFin}
                    onChange={(e) => setNuevoBloqueoFin(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1 uppercase text-xs">Motivo</label>
                <input
                  type="text"
                  placeholder="Ej. Ciro entra tarde hoy / Asunto personal / Almuerzo"
                  value={nuevoBloqueoMotivo}
                  onChange={(e) => setNuevoBloqueoMotivo(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creandoBloqueo}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {creandoBloqueo ? 'Guardando Bloqueo...' : '+ Aplicar Bloqueo'}
              </button>
            </form>

            {/* Lista de bloqueos activos */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                Bloqueos Activos ({bloqueos.length})
              </h4>

              {bloqueos.length === 0 ? (
                <div className="p-8 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-center text-xs text-neutral-400">
                  No hay bloqueos manuales activos en este momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {bloqueos.map((bloqueo) => (
                    <div
                      key={bloqueo.id}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-400 uppercase">
                            {bloqueo.barbero_id === 'barbero_ciro' ? 'Sebastián Ciro' : 'Sebastián Correa'}
                          </span>
                          <span className="text-neutral-400 font-mono">• {bloqueo.fecha}</span>
                          <span className="font-bold text-white">
                            ({bloqueo.hora_inicio} a {bloqueo.hora_fin})
                          </span>
                        </div>
                        <p className="text-neutral-400 text-[11px]">
                          Motivo: {bloqueo.motivo}
                        </p>
                      </div>

                      <button
                        onClick={() => handleEliminarBloqueo(bloqueo)}
                        disabled={liberandoBloqueoId === bloqueo.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-bold uppercase transition-colors disabled:opacity-50"
                      >
                        {liberandoBloqueoId === bloqueo.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Liberando...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Liberar</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: REPORTES & MÉTRICAS SIMPLES */}
        {activeTab === 'reportes' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold uppercase block">Total Citas</span>
                <span className="text-3xl font-black text-white mt-1 block">{totalCitas}</span>
                <span className="text-[11px] text-neutral-500 mt-1 block">Histórico acumulado</span>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold uppercase block">Completadas</span>
                <span className="text-3xl font-black text-emerald-400 mt-1 block">{citasCompletadas.length}</span>
                <span className="text-[11px] text-neutral-500 mt-1 block">Atendidas con éxito</span>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold uppercase block">Ingresos Estimados</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">
                  {formatCOP(ingresosEstimados)}
                </span>
                <span className="text-[11px] text-neutral-500 mt-1 block">De citas completadas</span>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold uppercase block">No-Shows / Canceladas</span>
                <span className="text-3xl font-black text-rose-400 mt-1 block">
                  {citas.filter((c) => c.estado === 'no_show' || c.estado === 'cancelada').length}
                </span>
                <span className="text-[11px] text-neutral-500 mt-1 block">Cupos liberados o ausentes</span>
              </div>
            </div>

            {/* Citas por barbero */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Distribución de Citas por Barbero
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white">Sebastián Correa (Dueño)</span>
                    <span className="font-black text-amber-400">{citasSebas} citas</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-950 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${totalCitas > 0 ? (citasSebas / totalCitas) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white">Sebastián Ciro</span>
                    <span className="font-black text-amber-400">{citasCiro} citas</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-950 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${totalCitas > 0 ? (citasCiro / totalCitas) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Servicios más solicitados */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Servicios Más Solicitados
              </h4>
              <div className="space-y-2">
                {Object.entries(conteoServicios).length === 0 ? (
                  <p className="text-xs text-neutral-500">Aún no hay citas registradas.</p>
                ) : (
                  Object.entries(conteoServicios)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nombre, cantidad]) => (
                      <div
                        key={nombre}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                      >
                        <span className="font-bold text-white uppercase">{nombre}</span>
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold">
                          {cantidad} {cantidad === 1 ? 'cita' : 'citas'}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NUEVA CITA MANUAL */}
      {manualAbierto && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !guardandoManual) setManualAbierto(false);
          }}
        >
          <form
            onSubmit={handleCrearCitaManual}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cita-manual-titulo"
            className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
              <div>
                <h3 id="cita-manual-titulo" className="text-base font-black text-white uppercase tracking-tight">
                  Nueva cita manual
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Queda ocupada en la agenda y la página deja de ofrecer ese horario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualAbierto(false)}
                disabled={guardandoManual}
                aria-label="Cerrar formulario"
                className="p-2 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Quién, cuándo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="cm-barbero" className="block text-neutral-400 font-bold mb-1 uppercase">Barbero</label>
                  <select
                    id="cm-barbero"
                    value={manualBarbero}
                    onChange={(e) => setManualBarbero(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  >
                    {BARBEROS_BASE.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cm-fecha" className="block text-neutral-400 font-bold mb-1 uppercase">Fecha</label>
                  <input
                    id="cm-fecha"
                    type="date"
                    required
                    value={manualFecha}
                    onChange={(e) => setManualFecha(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="cm-hora" className="block text-neutral-400 font-bold mb-1 uppercase">Hora de inicio</label>
                  <input
                    id="cm-hora"
                    type="time"
                    step={300}
                    required
                    value={manualHora}
                    onChange={(e) => setManualHora(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  />
                </div>
              </div>

              {/* Duración libre */}
              <div>
                <label htmlFor="cm-duracion" className="block text-neutral-400 font-bold mb-1 uppercase">
                  Duración (minutos)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="cm-duracion"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={600}
                    step={5}
                    required
                    value={manualDuracion}
                    onChange={(e) => setManualDuracion(e.target.value)}
                    className="w-28 p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  />
                  {DURACIONES_RAPIDAS.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setManualDuracion(String(min))}
                      className={`px-3 py-2 rounded-lg border font-bold transition-colors ${
                        manualDuracionNum === min
                          ? 'bg-amber-500 text-neutral-950 border-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-500/60'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                {manualDatosValidos && (
                  <p className="mt-2 text-neutral-300">
                    Va de <strong className="text-amber-400">{aHora12(manualHora)}</strong> a{' '}
                    <strong className="text-amber-400">{aHora12(minutesToTime(Math.min(manualFinMin, 24 * 60)))}</strong>
                  </p>
                )}
              </div>

              {/* Ocupación del día */}
              <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-3">
                <p className="text-neutral-400 font-bold uppercase mb-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Ya ocupado ese día
                  {cargandoOcupaciones && <Loader2 className="h-3 w-3 animate-spin" />}
                </p>
                {ocupacionesDia.length === 0 && !cargandoOcupaciones ? (
                  <p className="text-emerald-400">Todo el día está libre para este barbero.</p>
                ) : (
                  <ul className="space-y-1">
                    {ocupacionesDia.map((o) => {
                      const citaOcupa = o.tipo === 'cita' ? citas.find((c) => c.token_gestion === o.id) : undefined;
                      const bloqueoOcupa = o.tipo === 'bloqueo' ? bloqueos.find((b) => b.id === o.id) : undefined;
                      const detalle =
                        o.tipo === 'cita'
                          ? citaOcupa
                            ? `${citaOcupa.cliente_nombre} • ${citaOcupa.servicio_nombre}`
                            : 'Cita'
                          : `Bloqueo${bloqueoOcupa?.motivo ? `: ${bloqueoOcupa.motivo}` : ''}`;
                      return (
                        <li key={o.id} className="flex items-center justify-between gap-3 text-neutral-300">
                          <span className="font-mono text-white">
                            {aHora12(o.inicio)} – {aHora12(o.fin)}
                          </span>
                          <span className="truncate text-right text-neutral-400">{detalle}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {manualChoque && (
                <div role="alert" className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 font-bold flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Este horario se cruza con {manualChoque.tipo === 'bloqueo' ? 'un bloqueo' : 'otra cita'} de{' '}
                    {aHora12(manualChoque.inicio)} a {aHora12(manualChoque.fin)} — cambia la hora o la duración.
                  </span>
                </div>
              )}

              {!manualChoque && manualFueraDeHorario && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/70 text-amber-300 flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Esta cita queda fuera del horario habitual (10:00 a. m. a 8:00 p. m.). Se puede guardar igual.
                  </span>
                </div>
              )}

              {/* Servicio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={manualServicioId === 'otro' ? '' : 'sm:col-span-2'}>
                  <label htmlFor="cm-servicio" className="block text-neutral-400 font-bold mb-1 uppercase">Servicio</label>
                  <select
                    id="cm-servicio"
                    value={manualServicioId}
                    onChange={(e) => handleManualServicio(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  >
                    {SERVICIOS_BASE.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} — {formatCOP(s.precio)}
                      </option>
                    ))}
                    <option value="otro">Otro (escribir)</option>
                  </select>
                </div>
                {manualServicioId === 'otro' && (
                  <div>
                    <label htmlFor="cm-servicio-otro" className="block text-neutral-400 font-bold mb-1 uppercase">
                      Nombre del servicio
                    </label>
                    <input
                      id="cm-servicio-otro"
                      type="text"
                      required
                      maxLength={60}
                      placeholder="Ej. Corte niño"
                      value={manualServicioOtro}
                      onChange={(e) => setManualServicioOtro(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="cm-precio" className="block text-neutral-400 font-bold mb-1 uppercase">Precio (COP)</label>
                  <input
                    id="cm-precio"
                    type="text"
                    inputMode="numeric"
                    value={manualPrecio}
                    onChange={(e) => setManualPrecio(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold"
                  />
                </div>
              </div>

              {/* Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cm-nombre" className="block text-neutral-400 font-bold mb-1 uppercase">Nombre del cliente</label>
                  <input
                    id="cm-nombre"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Ej. Juan Pérez"
                    value={manualNombre}
                    onChange={(e) => setManualNombre(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cm-telefono" className="block text-neutral-400 font-bold mb-1 uppercase">
                    Celular <span className="text-neutral-500 normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    id="cm-telefono"
                    type="tel"
                    inputMode="tel"
                    maxLength={14}
                    placeholder="3001234567"
                    value={manualTelefono}
                    onChange={(e) => setManualTelefono(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cm-notas" className="block text-neutral-400 font-bold mb-1 uppercase">
                  Nota <span className="text-neutral-500 normal-case font-normal">(opcional, solo la ves tú)</span>
                </label>
                <input
                  id="cm-notas"
                  type="text"
                  maxLength={200}
                  placeholder="Ej. Pidió degradado bajo, paga en efectivo"
                  value={manualNotas}
                  onChange={(e) => setManualNotas(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualYaAtendida}
                  onChange={(e) => setManualYaAtendida(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-500"
                />
                <span className="text-neutral-300">
                  <strong className="text-white">Ya fue atendida</strong> — guardarla directamente como completada (cuenta en los ingresos de Reportes).
                </span>
              </label>

              {manualError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 font-bold flex gap-2 items-start">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{manualError}</span>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-3 px-5 py-4 bg-neutral-950/95 backdrop-blur border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setManualAbierto(false)}
                disabled={guardandoManual}
                className="sm:w-40 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoManual || !!manualChoque}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardandoManual ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Agendar cita</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
