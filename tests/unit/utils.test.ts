// Fase 1 — Utilidades: tokens, teléfono, moneda, WhatsApp, navegador móvil
// Casos: TC-SEC-15, TC-E2E-03 (validación de celular), TC-E2E-09/10 (nivel unitario), RF-03, RNF-04
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async () => (await import('./helpers/fakeFirestore')).fakeFirestoreModule());

import {
  generateTokenGestion,
  isValidColombianPhone,
  cleanPhone,
  formatCOP,
  timeToMinutes,
  minutesToTime,
  getWhatsAppBookingLink,
  getWhatsAppGeneralLink,
  getWhatsAppCancellationNoticeLink,
  isMobileUserAgent,
  openWhatsAppAuto,
  BUSINESS_PHONE,
  BUSINESS_PHONE_INTL,
} from '../../src/lib/bookingLogic';
import type { Cita } from '../../src/types';

afterEach(() => vi.unstubAllGlobals());

describe('Token de gestión (RNF-04, TC-SEC-15)', () => {
  const FORMATO = /^nc24k_[a-hjkmnp-z2-9]{18}$/;

  it('TC-SEC-15: 1.000 tokens con crypto → formato correcto, ≥16 caracteres tras el prefijo y todos únicos', () => {
    vi.stubGlobal('window', { crypto: globalThis.crypto });
    const tokens = Array.from({ length: 1000 }, () => generateTokenGestion());
    for (const t of tokens) {
      expect(t).toMatch(FORMATO);
      expect(t.slice('nc24k_'.length).length).toBeGreaterThanOrEqual(16);
      expect(t.length).toBeGreaterThanOrEqual(16); // exigido por firestore.rules (token_gestion.size() >= 16)
    }
    expect(new Set(tokens).size).toBe(1000);
  });

  it('no usa caracteres ambiguos (0, 1, o, i, l) ni mayúsculas', () => {
    vi.stubGlobal('window', { crypto: globalThis.crypto });
    const todos = Array.from({ length: 500 }, () => generateTokenGestion().slice(6)).join('');
    expect(todos).not.toMatch(/[01oilA-Z]/);
  });

  it('sin window.crypto (respaldo) sigue generando tokens válidos y únicos', () => {
    // En Node "window" no existe: se ejerce la rama de respaldo con Math.random
    const tokens = Array.from({ length: 300 }, () => generateTokenGestion());
    tokens.forEach((t) => expect(t).toMatch(FORMATO));
    expect(new Set(tokens).size).toBe(300);
  });
});

describe('Celular colombiano (BR-11, TC-E2E-03)', () => {
  it.each(['3000000001', '3112352517', '300 000 0001', '300-000-0001', '(300) 000-0001', ' 3000000001 '])(
    'válido: "%s"',
    (n) => expect(isValidColombianPhone(n)).toBe(true)
  );

  it.each(['2000000000', '300000000', '30000000012', 'abc1234567', '', '   ', '0000000000', '+573000000001', '573000000001'])(
    'inválido: "%s"',
    (n) => expect(isValidColombianPhone(n)).toBe(false)
  );

  it('cleanPhone quita espacios, guiones, puntos y paréntesis', () => {
    expect(cleanPhone('(300) 000-0001')).toBe('3000000001');
    expect(cleanPhone('300.000.0001')).toBe('3000000001');
  });
});

describe('Formato de dinero y hora (RF-03)', () => {
  it('RF-03: precios en COP con punto de miles (sin decimales)', () => {
    const sinEspacios = (v: number) => formatCOP(v).replace(/\s/g, '');
    expect(sinEspacios(25000)).toBe('$25.000');
    expect(sinEspacios(35000)).toBe('$35.000');
    expect(sinEspacios(20000)).toBe('$20.000');
    expect(sinEspacios(15000)).toBe('$15.000');
    expect(sinEspacios(1250000)).toBe('$1.250.000');
  });

  it('timeToMinutes y minutesToTime son inversas', () => {
    for (const h of ['00:00', '09:05', '10:00', '18:30', '23:59']) {
      expect(minutesToTime(timeToMinutes(h))).toBe(h);
    }
    expect(timeToMinutes('10:00')).toBe(600);
    expect(minutesToTime(1200)).toBe('20:00');
  });
});

describe('Enlaces de WhatsApp (RF-11, TC-E2E-09)', () => {
  const cita: Cita = {
    id: 'nc24k_abcdefghjkmnpqrstu',
    cliente_nombre: 'ZZ_TEST Cliente Uno & "Ñandú"',
    cliente_telefono: '3000000001',
    barbero_id: 'barbero_sebas',
    barbero_nombre: 'Sebastián Correa',
    servicio_id: 'srv_corte_barba',
    servicio_nombre: 'Corte con barba',
    precio: 35000,
    duracion_minutos: 90,
    fecha: '2026-11-13',
    hora_inicio: '10:00',
    hora_fin: '11:30',
    estado: 'confirmada',
    token_gestion: 'nc24k_abcdefghjkmnpqrstu',
    consentimiento_datos: true,
    creado_en: '2026-11-11T14:00:00.000Z',
  };

  it('apunta al WhatsApp del negocio (311 235 2517) con prefijo de Colombia', () => {
    expect(BUSINESS_PHONE).toBe('3112352517');
    expect(BUSINESS_PHONE_INTL).toBe('573112352517');
    expect(getWhatsAppBookingLink(cita).startsWith('https://wa.me/573112352517?text=')).toBe(true);
  });

  it('el mensaje trae cliente, teléfono, servicio, barbero, fecha, inicio y fin, valor y código', () => {
    const url = new URL(getWhatsAppBookingLink(cita));
    const texto = decodeURIComponent(url.searchParams.get('text') ?? '');
    expect(texto).toContain('ZZ_TEST Cliente Uno & "Ñandú"');
    expect(texto).toContain('3000000001');
    expect(texto).toContain('Corte con barba');
    expect(texto).toContain('Sebastián Correa');
    expect(texto).toContain('2026-11-13');
    expect(texto).toContain('10:00 - 11:30');
    expect(texto.replace(/\s/g, '')).toContain('$35.000');
    expect(texto).toContain('nc24k_abcdefghjkmnpqrstu');
  });

  it('caracteres especiales (&, comillas, ñ, saltos de línea) viajan codificados sin romper la URL', () => {
    const url = getWhatsAppBookingLink(cita);
    expect(url).not.toMatch(/\s/);
    expect(url.split('?text=')[1]).not.toContain('&"');
    expect(new URL(url).searchParams.get('text')).toContain('\n');
  });

  it('enlaces generales y de aviso de cancelación apuntan al mismo número', () => {
    expect(getWhatsAppGeneralLink().startsWith('https://wa.me/573112352517?text=')).toBe(true);
    const aviso = decodeURIComponent(new URL(getWhatsAppCancellationNoticeLink(cita)).searchParams.get('text') ?? '');
    expect(aviso).toContain('Corte con barba');
    expect(aviso).toContain('2026-11-13');
    expect(aviso).toContain('10:00');
    expect(aviso).toContain('nc24k_abcdefghjkmnpqrstu');
  });
});

describe('Apertura automática de WhatsApp (RF-11, TC-E2E-10 — regresión Ronda 22)', () => {
  const URL_WA = 'https://wa.me/573112352517?text=hola';

  function entorno(userAgent: string) {
    const win = { location: { href: '' }, open: vi.fn(), crypto: globalThis.crypto };
    vi.stubGlobal('window', win);
    vi.stubGlobal('navigator', { userAgent });
    return win;
  }

  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari'],
    ['iPad', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'],
    ['Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'],
  ])('en %s redirige la MISMA pestaña (no usa window.open)', (_n, ua) => {
    const win = entorno(ua);
    expect(isMobileUserAgent()).toBe(true);
    openWhatsAppAuto(URL_WA);
    expect(win.location.href).toBe(URL_WA);
    expect(win.open).not.toHaveBeenCalled();
  });

  it.each([
    ['Windows/Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'],
    ['macOS/Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15'],
  ])('en %s abre una pestaña nueva con noopener', (_n, ua) => {
    const win = entorno(ua);
    expect(isMobileUserAgent()).toBe(false);
    openWhatsAppAuto(URL_WA);
    expect(win.open).toHaveBeenCalledWith(URL_WA, '_blank', 'noopener,noreferrer');
    expect(win.location.href).toBe('');
  });

  it('sin window (render en servidor) no lanza error', () => {
    expect(() => openWhatsAppAuto(URL_WA)).not.toThrow();
  });
});
