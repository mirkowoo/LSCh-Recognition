/**
 * Cascaron de la aplicacion.
 *
 * Sin router todavia: son tres vistas y un estado. El routing real entra cuando
 * haya URLs que compartir (una seccion de contenidos, un perfil).
 */
import { useEffect, useState } from 'react';
import { Practica } from './vistas/Practica';
import { Evaluacion } from './vistas/Evaluacion';
import { Portal } from './vistas/Portal';
import { PruebaEncuadre } from './vistas/PruebaEncuadre';
import { ABECEDARIO, LETRAS_DINAMICAS } from './puntaje';
import { alCambiar, haySesion, nombreVisible, salir } from './praxsuite/auth';
import type { Sesion } from './praxsuite/auth';

type Vista = 'practica' | 'evaluacion' | 'encuadre';

export function App() {
  const [, setSesion] = useState<Sesion | null>(null);
  const [invitado, setInvitado] = useState(false);
  const [vista, setVista] = useState<Vista>('practica');
  const [letraLibre, setLetraLibre] = useState('A');

  // Re-renderiza cuando entra o sale un usuario.
  useEffect(() => alCambiar(setSesion), []);

  const identificado = haySesion();

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

  const cerrar = () => {
    salir();
    setInvitado(false);
    setVista('practica');
  };

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
          <button
            className={vista === 'encuadre' ? 'activo' : ''}
            onClick={() => setVista('encuadre')}
            title="Herramienta de diagnóstico"
          >
            Diagnóstico
          </button>
        </nav>

        <div className="cabecera-sesion">
          {identificado ? (
            <>
              <span className="detalle">{nombreVisible()}</span>
              <button onClick={cerrar}>Salir</button>
            </>
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
      {vista === 'encuadre' && <PruebaEncuadre />}
    </div>
  );
}
