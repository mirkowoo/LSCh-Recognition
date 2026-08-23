/**
 * Portal de entrada.
 *
 * Decision de producto: la practica libre NO exige cuenta. Solo la evaluacion,
 * porque es lo unico que se registra. Una barrera de entrada baja importa mas
 * que capturar correos: quien entra a probar y le gusta, se registra despues.
 */
import { useState } from 'react';
import { entrar, registrar } from '../praxsuite/auth';
import { ErrorPraxsuite } from '../praxsuite/api';

interface Props {
  onEntrar: () => void;
  onInvitado: () => void;
}

type Modo = 'entrar' | 'registrar';

export function Portal({ onEntrar, onInvitado }: Props) {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (modo === 'registrar' && contrasena.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, contrasena);
        onEntrar();
      } else {
        const s = await registrar({ email, contrasena, username });
        if (s) onEntrar();
        else {
          // El workspace exige confirmar el correo: no vuelven tokens todavia.
          setAviso(
            'Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.',
          );
          setModo('entrar');
        }
      }
    } catch (err) {
      setError(
        err instanceof ErrorPraxsuite ? err.message : 'Algo salió mal. Intenta de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="portal">
      <div className="portal-intro">
        <h1>Aprende el abecedario de la Lengua de Señas Chilena</h1>
        <p>
          Practica frente a la cámara y recibe corrección en el momento. El
          reconocimiento corre <b>dentro de tu navegador</b>: el video nunca sale
          de tu dispositivo, solo se guardan tus resultados.
        </p>
        <ul className="portal-puntos">
          <li>21 letras evaluadas, con puntaje y nota al terminar</li>
          <li>Práctica libre sin cuenta ni registro</li>
          <li>Ranking para quienes quieran aparecer</li>
        </ul>
        <p className="portal-nota">
          El modelo actual se entrenó sobre un conjunto de datos derivado del
          alfabeto ASL, que coincide con el chileno en muchas letras pero no en
          todas. Cinco letras —G, J, S, X y Z— llevan movimiento y todavía no se
          evalúan: se muestran como referencia.
        </p>
      </div>

      <div className="portal-caja">
        <div className="portal-tabs">
          <button
            className={modo === 'entrar' ? 'activo' : ''}
            onClick={() => {
              setModo('entrar');
              setError(null);
            }}
          >
            Iniciar sesión
          </button>
          <button
            className={modo === 'registrar' ? 'activo' : ''}
            onClick={() => {
              setModo('registrar');
              setError(null);
            }}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar}>
          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {modo === 'registrar' && (
            <label>
              Nombre para mostrar
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Cómo apareces en el ranking"
                autoComplete="nickname"
              />
            </label>
          )}

          <label>
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              minLength={modo === 'registrar' ? 8 : undefined}
              autoComplete={
                modo === 'registrar' ? 'new-password' : 'current-password'
              }
            />
          </label>

          {error && <div className="error">{error}</div>}
          {aviso && <div className="aviso">{aviso}</div>}

          <button type="submit" className="primario" disabled={enviando}>
            {enviando
              ? 'Un momento…'
              : modo === 'entrar'
                ? 'Entrar'
                : 'Crear cuenta'}
          </button>
        </form>

        <div className="portal-separador">
          <span>o</span>
        </div>

        <button className="secundario" onClick={onInvitado}>
          Practicar sin cuenta
        </button>
        <p className="portal-tenue">
          Sin cuenta puedes practicar todas las letras, pero no se guarda tu
          progreso ni puedes rendir la evaluación.
        </p>

        <p className="portal-tenue">
          Si ya tienes cuenta en otra aplicación de este espacio de trabajo, entra
          con las mismas credenciales.
        </p>
      </div>
    </div>
  );
}
