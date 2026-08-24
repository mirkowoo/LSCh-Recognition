/**
 * Aviso de sesion por vencer o ya vencida, con reconexion en el sitio.
 *
 * POR QUE UN BANNER Y NO UN MODAL
 *
 * Esto puede aparecer en mitad de una evaluacion, con la camara encendida y
 * catorce letras hechas. Un modal taparia el video y obligaria a decidir en ese
 * segundo. El banner avisa, deja seguir, y el formulario se abre solo si lo
 * piden.
 *
 * POR QUE NO SE CIERRA LA SESION SOLA
 *
 * Cerrarla devolveria al portal y se perderia la evaluacion en curso, que no se
 * guarda hasta terminarla. La sesion vencida se queda en memoria — no sirve
 * para escribir nada, pero sirve para saber quien estaba y ofrecerle volver a
 * entrar sin escribir el correo.
 */
import { useState } from 'react';
import { entrar } from '../praxsuite/auth';
import { ErrorPraxsuite } from '../praxsuite/api';

interface Props {
  estado: 'por-vencer' | 'vencida';
  /** Correo de la sesion que vencio. Si no viene, se pide. */
  email: string | null;
  /** Minutos que quedan; solo se muestra en 'por-vencer'. */
  minutos: number;
  onSalir: () => void;
}

export function AvisoSesion({ estado, email, minutos, onSalir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState(email ?? '');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const vencida = estado === 'vencida';

  const reconectar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(correo, contrasena);
      // No hace falta cerrar nada: al haber sesion viva el padre deja de
      // renderizar este aviso.
      setContrasena('');
    } catch (err) {
      setError(
        err instanceof ErrorPraxsuite
          ? err.message
          : 'No se pudo reconectar. Intenta de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`aviso-sesion${vencida ? ' es-vencida' : ''}`} role="status">
      <div className="aviso-sesion-linea">
        <span className="aviso-sesion-marca" aria-hidden="true" />

        <div className="aviso-sesion-texto">
          <b>{vencida ? 'Tu sesión expiró.' : `Tu sesión vence en ${minutos} min.`}</b>{' '}
          {vencida
            ? 'Hasta que vuelvas a entrar, nada de lo que hagas se va a guardar.'
            : 'Reconéctate ahora para no perder lo que estés haciendo.'}
        </div>

        <div className="aviso-sesion-acciones">
          {!abierto && (
            <button className="primario" onClick={() => setAbierto(true)}>
              Reconectar
            </button>
          )}
          {vencida && (
            <button onClick={onSalir} title="Cierra la sesión y vuelve al portal">
              Salir
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <form className="aviso-sesion-form" onSubmit={reconectar}>
          <label>
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoComplete="email"
              readOnly={Boolean(email)}
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </label>

          <div className="aviso-sesion-botones">
            <button type="submit" className="primario" disabled={enviando}>
              {enviando ? 'Un momento…' : 'Entrar'}
            </button>
            <button type="button" onClick={() => setAbierto(false)}>
              Ahora no
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </form>
      )}
    </div>
  );
}
