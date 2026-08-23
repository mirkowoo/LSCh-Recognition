/**
 * Cascaron de la aplicacion.
 *
 * El perfil no se edita aca: vive en el portafolio, que es el hub del workspace.
 * Esta app solo lo lee para mostrar nombre y foto en la cabecera.
 */
import { useCallback, useEffect, useState } from 'react';
import { Practica } from './vistas/Practica';
import { Evaluacion } from './vistas/Evaluacion';
import { Portal } from './vistas/Portal';
import { MenuUsuario } from './vistas/MenuUsuario';
import { ABECEDARIO, LETRAS_DINAMICAS } from './puntaje';
import {
  alCambiar,
  haySesion,
  nombreVisible,
  obtenerSesion,
  perfilPropio,
  salir,
} from './praxsuite/auth';
import type { PerfilPropio, Sesion } from './praxsuite/auth';

type Vista = 'practica' | 'evaluacion';

export function App() {
  const [, setSesion] = useState<Sesion | null>(null);
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [invitado, setInvitado] = useState(false);
  const [vista, setVista] = useState<Vista>('practica');
  const [letraLibre, setLetraLibre] = useState('A');

  useEffect(() => alCambiar(setSesion), []);

  const identificado = haySesion();

  // El perfil se lee una vez por sesión: nombre y foto para la cabecera.
  useEffect(() => {
    if (!identificado) {
      setPerfil(null);
      return;
    }
    let vivo = true;
    perfilPropio().then((p) => {
      if (vivo) setPerfil(p);
    });
    return () => {
      vivo = false;
    };
  }, [identificado]);

  const cerrar = useCallback(() => {
    salir();
    setPerfil(null);
    setInvitado(false);
    setVista('practica');
  }, []);

  if (!identificado && !invitado) {
    return (
      <div className="envoltorio">
        <Portal
          onEntrar={() => setInvitado(false)}
          onInvitado={() => setInvitado(true)}
        />
      </div>
    );
  }

  const nombre = perfil?.username || nombreVisible();
  const correo = perfil?.email || obtenerSesion()?.usuario.email || null;

  return (
    <div className="envoltorio">
      <header className="cabecera">
        <nav className="nav">
          <button
            className={vista === 'practica' ? 'activo' : ''}
            onClick={() => setVista('practica')}
          >
            Práctica libre
          </button>
          <button
            className={vista === 'evaluacion' ? 'activo' : ''}
            onClick={() => setVista('evaluacion')}
            disabled={!identificado}
            title={
              identificado
                ? undefined
                : 'La evaluación necesita una cuenta para guardar el resultado'
            }
          >
            Evaluación
          </button>
        </nav>

        <div className="cabecera-sesion">
          {identificado ? (
            <MenuUsuario
              nombre={nombre}
              email={correo}
              avatarUrl={perfil?.profileImageUrl || null}
              onSalir={cerrar}
            />
          ) : (
            <>
              <span className="detalle">Invitado</span>
              <button onClick={() => setInvitado(false)}>Iniciar sesión</button>
            </>
          )}
        </div>
      </header>

      {vista === 'practica' && (
        <>
          <div className="barra">
            <label>
              Letra
              <select
                value={letraLibre}
                onChange={(e) => setLetraLibre(e.target.value)}
              >
                {ABECEDARIO.map((l) => (
                  <option
                    key={l}
                    value={l}
                    disabled={LETRAS_DINAMICAS.includes(
                      l as (typeof LETRAS_DINAMICAS)[number],
                    )}
                  >
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <span className="detalle">
              Sin nota ni registro. Practica lo que quieras, las veces que quieras.
            </span>
          </div>
          <Practica letra={letraLibre} />
        </>
      )}

      {vista === 'evaluacion' && identificado && <Evaluacion />}
    </div>
  );
}
