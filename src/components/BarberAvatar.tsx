import React, { useState } from 'react';
import { User } from 'lucide-react';

interface BarberAvatarProps {
  /** Ruta de la foto (relativa a la raíz del sitio, p. ej. "barberos/ciro.jpg"). Si falta o no carga, se muestra el ícono. */
  fotoUrl?: string;
  nombre: string;
  /** Tamaño y detalles del contenedor circular (p. ej. "h-14 w-14"). */
  className?: string;
  iconClassName?: string;
}

/**
 * Foto circular de un barbero con respaldo al ícono genérico:
 * si la imagen no existe o falla al cargar, el perfil no queda con un hueco roto.
 */
export const BarberAvatar: React.FC<BarberAvatarProps> = ({
  fotoUrl,
  nombre,
  className = '',
  iconClassName = 'h-7 w-7',
}) => {
  const [fallo, setFallo] = useState(false);
  const mostrarFoto = Boolean(fotoUrl) && !fallo;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-neutral-950 border border-amber-500/40 flex items-center justify-center text-amber-400 ${className}`}
    >
      {mostrarFoto ? (
        <img
          src={fotoUrl}
          alt={`Foto de ${nombre}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFallo(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className={iconClassName} aria-hidden="true" />
      )}
    </div>
  );
};
