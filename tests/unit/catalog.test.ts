// Fase 1 — Catálogo y configuración (RF-03, RF-04, RNF-13) — datos hardcodeados en src/lib/firebase.ts
// Casos: TC-UI-03 y TC-UI-04 (nivel de datos), regresiones Rondas 15, 18 y 21
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SERVICIOS_BASE, BARBEROS_BASE } from '../../src/lib/firebase';

const raiz = resolve(__dirname, '../..');

describe('Servicios (sección 1.1 del plan)', () => {
  const porId = Object.fromEntries(SERVICIOS_BASE.map((s) => [s.id, s]));

  it('TC-UI-03: precios y duraciones que bloquean la agenda', () => {
    expect(SERVICIOS_BASE).toHaveLength(4);
    expect(porId.srv_corte).toMatchObject({ nombre: 'Corte', precio: 25000, duracion_minutos: 90 });
    expect(porId.srv_corte_barba).toMatchObject({ nombre: 'Corte con barba', precio: 35000, duracion_minutos: 90 });
    expect(porId.srv_marcada).toMatchObject({ nombre: 'Marcada', precio: 20000, duracion_minutos: 20 });
    expect(porId.srv_cejas).toMatchObject({ nombre: 'Cejas', precio: 15000, duracion_minutos: 15 });
  });

  it('Ronda 18: Corte y Corte con barba bloquean 90 min (antes 60/75 y se cruzaban clientes)', () => {
    expect(porId.srv_corte.duracion_minutos).toBeGreaterThanOrEqual(90);
    expect(porId.srv_corte_barba.duracion_minutos).toBeGreaterThanOrEqual(90);
  });

  it('la etiqueta mostrada nunca promete menos tiempo del que se bloquea', () => {
    for (const s of SERVICIOS_BASE) {
      const maximos = [...s.duracion_label.matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect(Math.max(...maximos)).toBeLessThanOrEqual(s.duracion_minutos);
    }
  });

  it('todos activos, con id único y orden único', () => {
    expect(new Set(SERVICIOS_BASE.map((s) => s.id)).size).toBe(4);
    expect(new Set(SERVICIOS_BASE.map((s) => s.orden)).size).toBe(4);
    expect(SERVICIOS_BASE.every((s) => s.activo)).toBe(true);
  });
});

describe('Barberos (RF-04)', () => {
  it('hay dos barberos activos con ids estables', () => {
    expect(BARBEROS_BASE.map((b) => b.id)).toEqual(['barbero_sebas', 'barbero_ciro']);
    expect(BARBEROS_BASE.every((b) => b.activo)).toBe(true);
  });

  it('Ronda 21: el segundo barbero se llama "Sebastián Ciro"; Jhon ya no aparece', () => {
    expect(BARBEROS_BASE[1].nombre).toBe('Sebastián Ciro');
    expect(JSON.stringify(BARBEROS_BASE)).not.toMatch(/Jhon/);
  });

  it('TC-UI-04: los dos comparten primer nombre, pero nombre_corto los distingue', () => {
    const [a, b] = BARBEROS_BASE;
    expect(a.nombre.split(' ')[0]).toBe(b.nombre.split(' ')[0]); // ambos "Sebastián"
    expect(a.nombre_corto).toBe('Sebastián');
    expect(b.nombre_corto).toBe('Ciro');
    expect(a.nombre_corto).not.toBe(b.nombre_corto);
  });

  it('RNF-13: las fotos son rutas relativas (el sitio vive en /NewConcept/) y los archivos existen', () => {
    for (const b of BARBEROS_BASE) {
      expect(b.foto_url.startsWith('/')).toBe(false);
      expect(b.foto_url.startsWith('http')).toBe(false);
      expect(existsSync(resolve(raiz, 'public', b.foto_url))).toBe(true);
    }
  });
});

describe('Configuración del despliegue (regresiones Rondas 11 y 15)', () => {
  const config = JSON.parse(readFileSync(resolve(raiz, 'firebase-applet-config.json'), 'utf8'));

  it('Ronda 15: la base de datos se llama "default" (sin paréntesis) y el proyecto es el propio', () => {
    expect(config.firestoreDatabaseId).toBe('default');
    expect(config.projectId).toBe('newconcept24kbarberia');
  });

  it('Ronda 11: Vite usa base "/NewConcept/" para GitHub Pages', () => {
    const vite = readFileSync(resolve(raiz, 'vite.config.ts'), 'utf8');
    expect(vite).toMatch(/base:\s*'\/NewConcept\/'/);
  });
});
