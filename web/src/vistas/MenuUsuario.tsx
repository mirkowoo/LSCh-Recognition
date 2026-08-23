/**
 * Menú de usuario de la cabecera.
 *
 * "Perfil" lleva al portafolio, que es el hub: el perfil y los logros viven allá
 * y se comparten entre todas las apps del workspace. Esta app no edita el perfil,
 * solo lo muestra.
 */
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../praxsuite/config';

interface Props {
  nombre: string;
  email: string | null;
  avatarUrl: string | null;
  onSalir: () => void;
}

export function MenuUsuario({ nombre, email, avatarUrl, onSalir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape: un menú que se queda pegado
  // tapando la interfaz es peor que no tenerlo.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  const inicial = (nombre || email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="menu-usuario" ref={raizRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        {avatarUrl ? (
          <img className="menu-usuario-avatar" src={avatarUrl} alt="" />
        ) : (
          <span className="menu-usuario-avatar">{inicial}</span>
        )}
        {nombre}
      </button>

      {abierto && (
        <div className="menu-usuario-lista" role="menu">
          {email && <div className="menu-usuario-correo">{email}</div>}
          <button
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              // Pestaña nueva: irse del medio de una evaluación perdería el
              // progreso, que no se guarda hasta terminarla.
              window.open(CONFIG.portafolioUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Perfil
          </button>
          <div className="separador" />
          <button
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              onSalir();
            }}
          >
            Desconectarse
          </button>
        </div>
      )}
    </div>
  );
}
