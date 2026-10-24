import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import {
  Camera,
  CalendarCheck,
  Clock,
  Music2,
  Scissors,
  Sparkles,
  Star,
  X,
  ZoomIn,
} from 'lucide-react';
import { SERVICIOS_BASE } from '../lib/firebase';
import { formatCOP } from '../lib/bookingLogic';

// ───────────────────────────────────────────────────────────────────────────────
// CONTENIDO DE LA GALERÍA
// Para cambiar textos, nombres u orden de los cortes edita solo este arreglo.
// Las fotos viven en /public/galeria/ (rutas relativas porque el sitio se sirve
// desde la subcarpeta /NewConcept/ de GitHub Pages).
// ───────────────────────────────────────────────────────────────────────────────
interface GalleryClient {
  name: string;
  role: string;
}

interface GalleryItem {
  id: string;
  title: string;
  category: 'Corte' | 'Corte con barba';
  servicioId: string; // id del servicio en SERVICIOS_BASE, para "Agendar este Blow"
  imageUrl: string;
  objectPosition: string; // encuadre de la foto dentro de la tarjeta (mantiene la cabeza a la vista)
  cliente?: GalleryClient; // si existe, la tarjeta se muestra como "cliente destacado"
  resumen: string;
  historia: string[];
  detalles: string[];
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'blow-geezydee',
    title: 'Blow',
    category: 'Corte con barba',
    servicioId: 'srv_corte_barba',
    imageUrl: 'galeria/blow-geezydee.jpg',
    objectPosition: 'center 28%',
    cliente: { name: 'GeezyDee', role: 'Artista del trap colombiano' },
    resumen: 'El Blow que firmamos para uno de los artistas importantes del trap colombiano.',
    historia: [
      'GeezyDee es uno de los artistas importantes del trap colombiano, y cuando alguien con su trayectoria se sienta en la silla de New Concept 24k, el estándar sube.',
      'El resultado fue un Blow peinado hacia atrás con ondas marcadas, degradado limpio a los lados y la barba esculpida con línea definida. Un acabado prolijo de principio a fin.',
    ],
    detalles: ['Peinado hacia atrás', 'Degradado limpio', 'Barba esculpida'],
  },
  {
    id: 'blow-bravs',
    title: 'Blow',
    category: 'Corte con barba',
    servicioId: 'srv_corte_barba',
    imageUrl: 'galeria/blow-bravs.jpg',
    objectPosition: 'center 22%',
    cliente: { name: 'Bravs', role: 'Productor musical' },
    resumen: 'Detrás de cada beat también hay imagen: el Blow de uno de los productores importantes del género.',
    historia: [
      'Bravs es un productor musical importante del género, de los que están detrás de los beats que suenan. Pero detrás de los beats también hay imagen.',
      'Para él hicimos un Blow con trenzas, degradado marcado a los lados y barba perfilada. Un look con carácter, trabajado con la misma precisión que se le exige a una buena mezcla.',
    ],
    detalles: ['Trenzas', 'Degradado marcado', 'Barba perfilada'],
  },
  {
    id: 'blow-corte',
    title: 'Blow',
    category: 'Corte',
    servicioId: 'srv_corte',
    imageUrl: 'galeria/blow-corte.jpg',
    objectPosition: 'center 28%',
    resumen: 'Blow en su versión más limpia: degradado a los lados y textura arriba.',
    historia: [
      'El Blow no es solo para los nombres grandes. También lo hacemos en su versión más limpia y fresca, con degradado a los lados y textura peinada en la parte de arriba.',
      'Mismo estándar de la casa: tiempo dedicado a cada corte, sin afanes y con el acabado que se nota apenas sales por la puerta.',
    ],
    detalles: ['Degradado', 'Textura arriba', 'Acabado limpio'],
  },
  {
    id: 'blow-barba',
    title: 'Blow',
    category: 'Corte con barba',
    servicioId: 'srv_corte_barba',
    imageUrl: 'galeria/blow-barba.jpg',
    objectPosition: 'center 20%',
    resumen: 'Degradado limpio, cabello recogido y barba full perfilada.',
    historia: [
      'Un Blow pensado para quien quiere llevar el cabello largo atrás sin descuidar los costados: degradado limpio, cabello recogido y la barba full perfilada con navaja.',
      'Es el tipo de corte donde se nota el detalle: líneas nítidas, volumen bien distribuido y una barba que enmarca el rostro.',
    ],
    detalles: ['Degradado', 'Cabello recogido', 'Barba full perfilada'],
  },
];

// ───────────────────────────────────────────────────────────────────────────────
// ANIMACIÓN
// ───────────────────────────────────────────────────────────────────────────────
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function buildPanelVariants(reduce: boolean): { panel: Variants; item: Variants } {
  if (reduce) {
    return {
      panel: { hidden: {}, show: { transition: { staggerChildren: 0 } } },
      item: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.01 } } },
    };
  }
  return {
    panel: {
      hidden: {},
      show: { transition: { staggerChildren: 0.075, delayChildren: 0.25 } },
    },
    item: {
      hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
      show: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: EASE_OUT },
      },
    },
  };
}

interface GallerySectionProps {
  // Abre el modal de reserva con el servicio ya elegido (ver App.tsx)
  onSelectService?: (servicioId: string) => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ onSelectService }) => {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const reduce = !!useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const { panel: panelVariants, item: itemVariants } = buildPanelVariants(reduce);

  // Resorte del "magic move": la foto de la tarjeta viaja hasta el modal (y regresa al cerrar)
  const layoutTransition = reduce
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 230, damping: 30, mass: 0.95 };

  const cerrar = useCallback(() => {
    setSelected(null);
    // Devolver el foco a la tarjeta que abrió el modal (accesibilidad con teclado)
    const trigger = lastTriggerRef.current;
    if (trigger) window.setTimeout(() => trigger.focus({ preventScroll: true }), 50);
  }, []);

  // Con el modal abierto: bloquear el scroll del fondo, cerrar con Esc y enfocar el botón de cerrar
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus({ preventScroll: true }), 400);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [selected, cerrar]);

  const handleAgendar = (servicioId: string) => {
    cerrar();
    // Esperamos a que termine la animación de salida para no superponer los dos modales
    if (onSelectService) window.setTimeout(() => onSelectService(servicioId), reduce ? 0 : 380);
  };

  const servicioSeleccionado = selected
    ? SERVICIOS_BASE.find((s) => s.id === selected.servicioId)
    : undefined;

  return (
    <section id="galeria" className="py-24 bg-neutral-900/40 border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Camera className="h-3 w-3" />
            <span>Portafolio de Trabajo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Galería de <span className="text-amber-400">Cortes 24k</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Cada foto es un Blow firmado en nuestra silla: texturas, degradados impecables y líneas nítidas.
          </p>
        </div>

        {/* Historia de la silla */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="relative mb-12 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-neutral-900/70 to-neutral-950 p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-neutral-950/70 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Historias de la silla
              </h3>
              <p className="mt-2 text-sm sm:text-base text-neutral-300 leading-relaxed">
                Por la silla de New Concept 24k han pasado artistas y productores de la escena del trap
                colombiano. Los dos primeros Blow de la galería tienen nombre propio: toca una foto y
                conoce la historia detrás de cada corte.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cuadrícula de fotos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {GALLERY_ITEMS.map((item, index) => {
            const destacado = !!item.cliente;
            return (
              <motion.div
                key={item.id}
                initial={reduce ? false : { opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: index * 0.09, ease: EASE_OUT }}
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Ver historia del ${item.title}${item.cliente ? ` para ${item.cliente.name}` : ''} (${item.category})`}
                  onClick={(e) => {
                    lastTriggerRef.current = e.currentTarget;
                    setSelected(item);
                  }}
                  className={`group relative block w-full aspect-[3/4] rounded-2xl overflow-hidden text-left cursor-pointer border bg-neutral-950 shadow-md transition-shadow duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${
                    destacado
                      ? 'border-amber-400/50 shadow-[0_0_45px_-14px_rgba(245,158,11,0.55)] hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.7)]'
                      : 'border-neutral-800 hover:border-amber-500/40'
                  }`}
                >
                  {/* Foto (elemento compartido con el modal) */}
                  <motion.div
                    layoutId={`blow-img-${item.id}`}
                    transition={layoutTransition}
                    className="absolute inset-0 overflow-hidden"
                  >
                    <img
                      src={item.imageUrl}
                      alt={`Blow ${item.category.toLowerCase()}${item.cliente ? ` para ${item.cliente.name}` : ''}`}
                      style={{ objectPosition: item.objectPosition }}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] brightness-90 group-hover:brightness-100"
                      loading="lazy"
                      draggable={false}
                    />
                  </motion.div>

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-70" />

                  {/* Brillo que cruza la tarjeta al pasar el mouse */}
                  <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[320%] transition-all duration-1000 ease-out" />

                  {/* Insignia de cliente destacado */}
                  {destacado && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-neutral-950/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Cliente destacado
                    </div>
                  )}

                  {/* Icono de zoom */}
                  <div className="absolute top-3 right-3 h-9 w-9 rounded-full bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 flex items-center justify-center text-amber-400 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 transition-all duration-300">
                    <ZoomIn className="h-4 w-4" />
                  </div>

                  {/* Texto de la tarjeta */}
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider mb-2">
                      {item.category}
                    </span>
                    <h4 className="text-2xl font-black text-white uppercase tracking-wide leading-none">
                      {item.title}
                    </h4>
                    {item.cliente ? (
                      <>
                        <p className="mt-1.5 text-sm font-bold uppercase tracking-wide text-amber-300">
                          para {item.cliente.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-300">{item.cliente.role}</p>
                      </>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-neutral-300">
                        {item.detalles.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Línea dorada inferior */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 transition-transform duration-500 group-hover:scale-x-100" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal de la historia */}
      <AnimatePresence>
        {selected && (
          <motion.div key="blow-modal" className="fixed inset-0 z-[60]">
            {/* Fondo desenfocado */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.35 }}
              onClick={cerrar}
            />

            {/* Un solo contenedor de scroll para todo el modal (sin barra visible y sin scroll
                anidado dentro del texto): si la pantalla es baja, se desliza el modal completo
                como una página. Tocar fuera del diálogo lo cierra. */}
            <div
              className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) cerrar();
              }}
            >
              <div
                className="flex min-h-full items-center justify-center p-3 sm:p-6"
                onClick={(e) => {
                  if (e.target === e.currentTarget) cerrar();
                }}
              >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`blow-title-${selected.id}`}
                className="relative w-full max-w-4xl md:grid md:grid-cols-[5fr_6fr]"
              >
                {/* Superficie del diálogo */}
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl border border-amber-500/25 bg-neutral-900 shadow-[0_40px_140px_-30px_rgba(245,158,11,0.35)]"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.25 } }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
                />

                {/* Foto: viaja desde la tarjeta */}
                <motion.div
                  layoutId={`blow-img-${selected.id}`}
                  transition={layoutTransition}
                  className="relative h-[30dvh] min-h-[200px] md:h-auto md:min-h-[480px] overflow-hidden rounded-t-3xl md:rounded-tr-none md:rounded-l-3xl"
                >
                  <motion.img
                    src={selected.imageUrl}
                    alt={`Blow ${selected.category.toLowerCase()}${selected.cliente ? ` para ${selected.cliente.name}` : ''}`}
                    style={{ objectPosition: selected.objectPosition }}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ scale: 1 }}
                    animate={reduce ? { scale: 1 } : { scale: 1.08 }}
                    transition={{ duration: 12, ease: 'linear' }}
                    draggable={false}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900/50" />
                </motion.div>

                {/* Información */}
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                  className="relative p-5 sm:p-7 md:p-8 flex flex-col"
                >
                  <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-amber-500/10 blur-3xl" />

                  <motion.div variants={itemVariants} className="relative flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-950">
                      <Scissors className="h-3 w-3" />
                      {selected.category}
                    </span>
                    {selected.cliente && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        Cliente destacado
                      </span>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="relative mt-3 md:mt-4">
                    <h3
                      id={`blow-title-${selected.id}`}
                      className="text-4xl sm:text-5xl md:text-6xl font-black uppercase leading-[0.95] tracking-tight text-white"
                    >
                      {selected.title}
                    </h3>
                    {selected.cliente && (
                      <p className="mt-1 text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                        para {selected.cliente.name}
                      </p>
                    )}
                    <motion.span
                      aria-hidden="true"
                      className="mt-3 md:mt-4 block h-0.5 w-24 origin-left bg-gradient-to-r from-amber-300 to-amber-600"
                      initial={{ scaleX: reduce ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.5, duration: 0.7, ease: EASE_OUT }}
                    />
                  </motion.div>

                  {selected.cliente && (
                    <motion.p
                      variants={itemVariants}
                      className="relative mt-3 md:mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300"
                    >
                      <Music2 className="h-3.5 w-3.5 text-amber-400" />
                      {selected.cliente.role}
                    </motion.p>
                  )}

                  <div className="relative mt-4 md:mt-5 space-y-2.5 md:space-y-3">
                    {selected.historia.map((parrafo, i) => (
                      <motion.p
                        key={i}
                        variants={itemVariants}
                        className="text-[13.5px] sm:text-sm md:text-[15px] leading-relaxed text-neutral-300"
                      >
                        {parrafo}
                      </motion.p>
                    ))}
                  </div>

                  <motion.ul variants={itemVariants} className="relative mt-4 md:mt-5 flex flex-wrap gap-2">
                    {selected.detalles.map((detalle) => (
                      <li
                        key={detalle}
                        className="rounded-full border border-neutral-700 bg-neutral-950/60 px-3 py-1 text-[11px] font-semibold text-neutral-200"
                      >
                        {detalle}
                      </li>
                    ))}
                  </motion.ul>

                  <motion.div variants={itemVariants} className="relative mt-auto pt-5 md:pt-6">
                    {servicioSeleccionado && (
                      <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                        <span className="font-bold text-white">{servicioSeleccionado.nombre}</span>
                        <span className="font-bold text-amber-400">{formatCOP(servicioSeleccionado.precio)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {servicioSeleccionado.duracion_label}
                        </span>
                      </p>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => handleAgendar(selected.servicioId)}
                      whileHover={reduce ? undefined : { scale: 1.02 }}
                      whileTap={reduce ? undefined : { scale: 0.97 }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-neutral-950 shadow-[0_0_30px_-6px_rgba(245,158,11,0.6)] hover:from-amber-300 hover:to-amber-400 transition-colors"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Agendar este Blow
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* Botón cerrar */}
                <motion.button
                  ref={closeBtnRef}
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar"
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.6, rotate: reduce ? 0 : -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
                  transition={{ delay: reduce ? 0 : 0.35, duration: 0.4, ease: EASE_OUT }}
                  className="fixed right-5 top-5 md:absolute md:right-3 md:top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950/80 text-white backdrop-blur-sm transition-colors hover:border-amber-400 hover:text-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
