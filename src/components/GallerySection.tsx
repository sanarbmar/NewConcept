import React, { useState } from 'react';
import { Sparkles, Camera, ZoomIn } from 'lucide-react';

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    title: 'Mid Fade con Barba Esculpida',
    category: 'Corte con barba',
    imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Skin Fade Pulido al Cero',
    category: 'Corte',
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Perfilado de Navaja y Marcada',
    category: 'Marcada',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    title: 'Texturizado Crop Urbano',
    category: 'Corte',
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    title: 'Diseño de Cejas y Acabado Pro',
    category: 'Cejas',
    imageUrl: 'https://images.unsplash.com/photo-1517832606589-7629c3395909?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 6,
    title: 'Taper Fade Clásico & Bigote',
    category: 'Corte con barba',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  },
];

export const GallerySection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  return (
    <section id="galeria" className="py-24 bg-neutral-900/40 border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Camera className="h-3 w-3" />
            <span>Portafolio de Trabajo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Galería de <span className="text-amber-400">Cortes 24k</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Cada foto refleja la concentración y el detalle que aplicamos en cada silla. Texturas, degradados impecables y líneas nítidas.
          </p>
        </div>

        {/* Cuadrícula de fotos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer border border-neutral-800 bg-neutral-950 shadow-md"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

              {/* Botón zoom flotante */}
              <div className="absolute top-4 right-4 h-9 w-9 rounded-full bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 flex items-center justify-center text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4" />
              </div>

              {/* Título & Categoría */}
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider mb-1">
                  {item.category}
                </span>
                <h4 className="text-base font-bold text-white uppercase tracking-wide">
                  {item.title}
                </h4>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de visualización */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-3xl w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 p-2" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.title}
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                    {selectedImage.category}
                  </span>
                  <h3 className="text-lg font-bold text-white uppercase">
                    {selectedImage.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
