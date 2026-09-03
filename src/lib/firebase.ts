import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Barbero, Servicio } from '../types';

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initializing Firestore with specific databaseId if provided
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Catálogo base predeterminado de Barberos
export const BARBEROS_BASE: Barbero[] = [
  {
    id: 'barbero_sebas',
    nombre: 'Sebastián Correa',
    rol: 'Dueño & Master Barber',
    especialidad: 'Especialista en todos los servicios, con máxima maestría en corte con barba y perfilado.',
    foto_url: '',
    activo: true,
    orden: 1,
    es_dueno: true,
  },
  {
    id: 'barbero_ciro',
    nombre: 'Jhon Ciro',
    rol: 'Barbero Profesional',
    especialidad: 'Especialista en todos los servicios, con gran precisión en corte con barba y acabados urbanos.',
    foto_url: '',
    activo: true,
    orden: 2,
    es_dueno: false,
  },
];

// Catálogo base de Servicios con duraciones y precios solicitados
export const SERVICIOS_BASE: Servicio[] = [
  {
    id: 'srv_corte',
    nombre: 'Corte',
    precio: 25000,
    duracion_minutos: 90,
    duracion_label: '75–90 min',
    descripcion: 'Corte completo personalizado, lavado y acabado con productos de alta fijación.',
    activo: true,
    orden: 1,
  },
  {
    id: 'srv_corte_barba',
    nombre: 'Corte con barba',
    precio: 35000,
    duracion_minutos: 90,
    duracion_label: '75–90 min',
    descripcion: 'Corte de cabello integral con toalla caliente, esculpido, alineación y tratamiento de barba.',
    activo: true,
    orden: 2,
  },
  {
    id: 'srv_marcada',
    nombre: 'Marcada',
    precio: 20000,
    duracion_minutos: 20,
    duracion_label: '20 min',
    descripcion: 'Definición de contornos, patillas, cuello y líneas limpias con navaja clásica.',
    activo: true,
    orden: 3,
  },
  {
    id: 'srv_cejas',
    nombre: 'Cejas',
    precio: 15000,
    duracion_minutos: 15,
    duracion_label: '15 min',
    descripcion: 'Diseño, recorte y perfilado milimétrico de cejas con navaja para un look pulido.',
    activo: true,
    orden: 4,
  },
];
