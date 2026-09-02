import React, { useState, useEffect } from 'react';
import { Scissors, Calendar, Menu, X, Phone, Lock, Search } from 'lucide-react';
import { BUSINESS_PHONE, BUSINESS_PHONE_INTL } from '../lib/bookingLogic';

interface NavbarProps {
  onOpenBooking: (barberoId?: string, servicioId?: string) => void;
  onOpenAdmin: () => void;
  onOpenSearchAppointment: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenAdmin,
  onOpenSearchAppointment,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Barberos', href: '#barberos' },
    { label: 'Galería', href: '#galeria' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Preguntas', href: '#faq' },
    { label: 'Ubicación', href: '#ubicacion' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 py-3 shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-black/80 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Wordmark */}
        <a
          href="#inicio"
          className="flex items-center gap-3 group focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('#inicio');
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 border border-amber-500/40 text-amber-400 group-hover:border-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Scissors className="h-5 w-5 rotate-[-45deg]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-wider text-base sm:text-lg text-white uppercase leading-none">
              New Concept <span className="text-amber-400">24k</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">
              Belén La Nubia
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
              }}
              className="text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-amber-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Consultar Cita */}
          <button
            onClick={onOpenSearchAppointment}
            title="Consultar o gestionar mi cita"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          >
            <Search className="h-3.5 w-3.5 text-neutral-400" />
            <span>Mis Citas</span>
          </button>

          {/* Botón Principal Agendar Cita */}
          <button
            onClick={() => onOpenBooking()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Calendar className="h-4 w-4" />
            <span>Agendar Cita</span>
          </button>

          {/* Admin link */}
          <button
            onClick={onOpenAdmin}
            title="Acceso panel de administración"
            className="p-2 text-neutral-500 hover:text-amber-400 hover:bg-neutral-900 rounded-lg transition-colors"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile menu toggle & quick booking */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => onOpenBooking()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wide shadow-md"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Agendar</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-neutral-950 border-b border-neutral-800 px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pt-2 pb-3 border-b border-neutral-800/80">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="block px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-amber-400 hover:bg-neutral-900 rounded-md"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSearchAppointment();
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg"
            >
              <Search className="h-4 w-4 text-amber-400" />
              <span>Consultar mi cita (Token)</span>
            </button>

            <a
              href={`https://wa.me/${BUSINESS_PHONE_INTL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg"
            >
              <Phone className="h-4 w-4" />
              <span>WhatsApp: {BUSINESS_PHONE}</span>
            </a>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-neutral-400 hover:text-white"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Panel de Administración</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
