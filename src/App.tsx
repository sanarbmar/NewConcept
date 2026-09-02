import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Loader } from './components/Loader';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { BarbersSection } from './components/BarbersSection';
import { GallerySection } from './components/GallerySection';
import { AboutSection } from './components/AboutSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FaqSection } from './components/FaqSection';
import { LocationSection } from './components/LocationSection';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { ClientAppointmentView } from './components/ClientAppointmentView';
import { AdminPanel } from './components/AdminPanel';
import { SearchAppointmentModal } from './components/SearchAppointmentModal';
import { DataPrivacyModal } from './components/DataPrivacyModal';
import { Phone, Calendar } from 'lucide-react';
import { BUSINESS_PHONE_INTL, getWhatsAppGeneralLink } from './lib/bookingLogic';

export default function App() {
  const [loading, setLoading] = useState(true);

  // Modals & Navigation States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [preselectedBarberoId, setPreselectedBarberoId] = useState<string | undefined>(undefined);
  const [preselectedServicioId, setPreselectedServicioId] = useState<string | undefined>(undefined);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSearchAppointmentOpen, setIsSearchAppointmentOpen] = useState(false);
  const [initialSearchPhone, setInitialSearchPhone] = useState<string>('');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Personal client appointment view (/mis-citas/{token})
  const [clientTokenView, setClientTokenView] = useState<string | null>(null);

  // Escuchar ruta inicial o cambios en hash (#mis-citas/TOKEN, #mis-citas o #admin)
  useEffect(() => {
    const parseRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (hash.startsWith('#mis-citas/')) {
        const token = hash.replace('#mis-citas/', '').trim();
        if (token) setClientTokenView(token);
      } else if (hash === '#mis-citas' || pathname === '/mis-citas') {
        setIsSearchAppointmentOpen(true);
      } else if (pathname.startsWith('/mis-citas/')) {
        const token = pathname.replace('/mis-citas/', '').trim();
        if (token) setClientTokenView(token);
      } else if (hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    return () => window.removeEventListener('hashchange', parseRoute);
  }, []);

  // Animación inicial del loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenBooking = (barberoId?: string, servicioId?: string) => {
    setPreselectedBarberoId(barberoId);
    setPreselectedServicioId(servicioId);
    setIsBookingOpen(true);
  };

  const handleNavigateToClientView = (token: string) => {
    setClientTokenView(token);
    window.location.hash = `mis-citas/${token}`;
  };

  const handleBackToHome = () => {
    setClientTokenView(null);
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-400 selection:text-black">
      {/* Loader animado con el wordmark de New Concept 24k */}
      <AnimatePresence>
        {loading && <Loader />}
      </AnimatePresence>

      {/* Si el cliente ingresó a su enlace personal de cita /mis-citas/{token} */}
      {clientTokenView ? (
        <ClientAppointmentView
          token={clientTokenView}
          onBackToHome={handleBackToHome}
          onOpenNewBooking={() => {
            setClientTokenView(null);
            window.location.hash = '';
            handleOpenBooking();
          }}
          onOpenSearchAppointment={(phone) => {
            if (phone) setInitialSearchPhone(phone);
            setIsSearchAppointmentOpen(true);
          }}
        />
      ) : (
        /* Sitio web principal & Landing Page */
        <>
          <Navbar
            onOpenBooking={handleOpenBooking}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenSearchAppointment={() => setIsSearchAppointmentOpen(true)}
          />

          <main>
            <Hero
              onOpenBooking={() => handleOpenBooking()}
              onExploreServices={() => {
                const el = document.getElementById('servicios');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <ServicesSection
              onSelectService={(srvId) => handleOpenBooking(undefined, srvId)}
            />

            <BarbersSection
              onSelectBarber={(barbId) => handleOpenBooking(barbId, undefined)}
            />

            <GallerySection />

            <AboutSection />

            <TestimonialsSection />

            <FaqSection />

            <LocationSection onOpenBooking={() => handleOpenBooking()} />
          </main>

          <Footer
            onOpenBooking={() => handleOpenBooking()}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />

          {/* Botón flotante de WhatsApp */}
          <a
            href={getWhatsAppGeneralLink()}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat directo con Barbería New Concept 24k"
            className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:scale-110 active:scale-95"
          >
            <Phone className="h-7 w-7" />
          </a>

          {/* Barra móvil inferior fija para agendar rápido */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 p-3 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 flex items-center gap-3">
            <button
              onClick={() => setIsSearchAppointmentOpen(true)}
              className="py-3 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold"
            >
              Mis Citas
            </button>
            <button
              onClick={() => handleOpenBooking()}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg"
            >
              <Calendar className="h-4 w-4" />
              <span>Agendar Cita en Vivo</span>
            </button>
          </div>
        </>
      )}

      {/* MODAL DE RESERVA EN VIVO */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialBarberoId={preselectedBarberoId}
        initialServicioId={preselectedServicioId}
        onNavigateToClientView={handleNavigateToClientView}
      />

      {/* MODAL DE BÚSQUEDA DE CITA POR CELULAR O POR TOKEN */}
      <SearchAppointmentModal
        isOpen={isSearchAppointmentOpen}
        onClose={() => {
          setIsSearchAppointmentOpen(false);
          setInitialSearchPhone('');
          if (window.location.hash === '#mis-citas') {
            window.location.hash = '';
          }
        }}
        initialPhone={initialSearchPhone}
        onSearchToken={(token) => handleNavigateToClientView(token)}
        onOpenBooking={() => {
          setIsSearchAppointmentOpen(false);
          handleOpenBooking();
        }}
      />

      {/* PANEL DE ADMINISTRACIÓN (LOGIN & AGENDA PARA SEBASTIÁN) */}
      {isAdminOpen && (
        <AdminPanel
          onClose={() => {
            setIsAdminOpen(false);
            if (window.location.hash === '#admin') {
              window.location.hash = '';
            }
          }}
        />
      )}

      {/* POLÍTICA DE DATOS LEY 1581 */}
      <DataPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
