/**
 * Recorrido evaluado del abecedario.
 *
 * Recorre las 21 letras estaticas — LETRAS_EVALUABLES en puntaje.ts. Las cinco
 * con movimiento (G, J, S, X, Z) quedan fuera: llevan desplazamiento y un
 * detector de imagenes fijas no puede juzgarlas. Aparecen atenuadas en la fila
 * de progreso para que el abecedario se vea completo.
 *
 * Hay una tercera categoria: las de LETRAS_SIN_PUNTAJE se practican pero no
 * entran en la nota, porque el modelo no las mide bien. Hoy es la P.
 *
 * Al terminar guarda la sesion y los 21 intentos en Praxsuite, y pide el
 * recalculo del ranking. Se guardan los cuatro insumos crudos ADEMAS del puntaje
 * derivado, para poder recalcular la formula sobre el historico sin volver a
 * pedirle a nadie que repita la evaluacion.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Practica } from './Practica';
import type { ResultadoLetra } from './Practica';
import {
  ABECEDARIO,
  LETRAS_DINAMICAS,
  LETRAS_EVALUABLES,
  LETRAS_PUNTUABLES,
  LETRAS_SIN_PUNTAJE,
  nota,
  promedioSesion,
} from '../puntaje';
import { guardarSesion, nuevaSesionId } from '../praxsuite/persistencia';
import { haySesion } from '../praxsuite/auth';

export function Evaluacion() {
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<Record<string, ResultadoLetra>>({});
  const [terminada, setTerminada] = useState(false);
  const [guardado, setGuardado] = useState<
    'pendiente' | 'guardando' | 'ok' | 'error'
  >('pendiente');
  const [publicado, setPublicado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const inicioRef = useRef(new Date());
  const sesionIdRef = useRef(nuevaSesionId());

  const letra = LETRAS_EVALUABLES[indice];

  const avanzar = (r: ResultadoLetra) => {
    setResultados((prev) => ({ ...prev, [r.letra]: r }));
    // Pausa breve para que se alcance a ver el mensaje de refuerzo.
    setTimeout(() => {
      if (indice + 1 >= LETRAS_EVALUABLES.length) setTerminada(true);
      else setIndice(indice + 1);
    }, r.logrado ? 900 : 0);
  };

  const puntajes = useMemo(
    () =>
      Object.fromEntries(
        Object.values(resultados).map((r) => [r.letra, r.puntaje]),
      ),
    [resultados],
  );

  const promedio = promedioSesion(puntajes);
  const laNota = nota(promedio);
  // Dos conteos distintos, a proposito:
  //   `logradas`   -> lo que hiciste, sobre las 21 que se recorren. Es lo que
  //                   se muestra en pantalla, porque describe la practica.
  //   `puntuadas`  -> lo que CUENTA, sobre las que entran en la nota. Es lo que
  //                   se guarda, porque la fila de sesion es el registro
  //                   calificado: su nota, su promedio y sus conteos tienen que
  //                   referirse todos al mismo conjunto.
  const logradas = LETRAS_EVALUABLES.filter((l) => resultados[l]?.logrado).length;
  const puntuadas = LETRAS_PUNTUABLES.filter((l) => resultados[l]?.logrado).length;

  useEffect(() => {
    if (!terminada || guardado !== 'pendiente') return;
    if (!haySesion()) {
      setGuardado('error');
      setErrorGuardado('Tu sesión expiró: el resultado no se guardó.');
      return;
    }
    setGuardado('guardando');
    const intentos = LETRAS_EVALUABLES.map((l) => resultados[l]).filter(Boolean);
    guardarSesion(
      {
        sesionId: sesionIdRef.current,
        inicio: inicioRef.current,
        fin: new Date(),
        letrasEvaluadas: LETRAS_PUNTUABLES.length,
        letrasLogradas: puntuadas,
        puntajePromedio: promedio,
        nota: laNota,
        completa: true,
      },
      intentos,
      0,
    )
      .then((r) => {
        setGuardado('ok');
        setPublicado(Boolean(r?.publicado));
      })
      .catch((e) => {
        setGuardado('error');
        setErrorGuardado(e instanceof Error ? e.message : String(e));
      });
  }, [terminada, guardado, resultados, puntuadas, promedio, laNota]);

  const reiniciar = () => {
    setResultados({});
    setIndice(0);
    setTerminada(false);
    setGuardado('pendiente');
    setPublicado(false);
    setErrorGuardado(null);
    inicioRef.current = new Date();
    sesionIdRef.current = nuevaSesionId();
  };

  if (terminada) {
    const ordenadas = LETRAS_EVALUABLES.map((l) => ({
      letra: l,
      r: resultados[l],
    })).sort((a, b) => (a.r?.puntaje ?? 0) - (b.r?.puntaje ?? 0));

    return (
      <div className="resultado">
        <h2>Resultado</h2>
        <div className="resultado-nota">
          <div className="nota-numero">{laNota.toFixed(1)}</div>
          <div className="nota-detalle">
            {logradas} de {LETRAS_EVALUABLES.length} letras logradas
            <br />
            puntaje promedio {promedio.toFixed(1)} / 100
          </div>
        </div>

        <div className="guardado">
          {guardado === 'guardando' && <span className="detalle">Guardando…</span>}
          {guardado === 'ok' && (
            <span className="detalle">
              Resultado guardado.{' '}
              {publicado
                ? 'Tu mejor nota está en el ranking.'
                : 'No apareces en el ranking: actívalo en tu perfil si quieres.'}
            </span>
          )}
          {guardado === 'error' && (
            <div className="error">
              No se pudo guardar: {errorGuardado}
              {/* La causa mas comun es el token vencido. Si ya se reconectaron
                  desde el aviso de la cabecera, el resultado sigue en memoria y
                  se puede subir: volver a 'pendiente' relanza el efecto que
                  guarda. Sin esto, reconectarse no servia de nada — la
                  evaluacion ya estaba perdida. */}
              {haySesion() && (
                <button
                  className="reintentar"
                  onClick={() => {
                    setErrorGuardado(null);
                    setGuardado('pendiente');
                  }}
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        <h3>Dónde flaqueaste</h3>
        <table>
          <thead>
            <tr>
              <th>Letra</th>
              <th>Puntaje</th>
              <th>Estabilidad</th>
              <th>Confianza</th>
              <th>Segundos</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.slice(0, 8).map(({ letra: l, r }) => (
              // data-rotulo lo usa el CSS para poner el nombre de cada columna
              // delante del dato cuando la tabla se apila en el telefono.
              <tr key={l}>
                <td>{l}</td>
                <td data-rotulo="Puntaje">{(r?.puntaje ?? 0).toFixed(1)}</td>
                <td data-rotulo="Estabilidad">{((r?.estabilidad ?? 0) * 100).toFixed(0)}%</td>
                <td data-rotulo="Confianza">{(r?.confianzaMedia ?? 0).toFixed(2)}</td>
                <td data-rotulo="Segundos">{(r?.segundosHastaLogro ?? 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="pie">
          «Confianza» es lo que reporta el modelo, no cuánto se parece tu seña a
          una correcta. El puntaje combina estabilidad (50%), confianza (35%) y
          fluidez (15%) — la estabilidad pesa más porque mide si sostuviste la
          seña, que es lo que de verdad se está practicando.
        </p>

        <button onClick={reiniciar}>Empezar de nuevo</button>
      </div>
    );
  }

  return (
    <>
      <div className="progreso-abecedario">
        {ABECEDARIO.map((l) => {
          const r = resultados[l];
          const clase = LETRAS_DINAMICAS.includes(
            l as (typeof LETRAS_DINAMICAS)[number],
          )
            ? 'dinamica'
            : r?.logrado
              ? 'lograda'
              : r
                ? 'fallada'
                : l === letra
                  ? 'actual'
                  : 'pendiente';
          return (
            <span key={l} className={`chip ${clase}`}>
              {l}
            </span>
          );
        })}
      </div>

      {/* Sin key: remontar Practica destruiria el worker y recargaria el modelo
          entre letra y letra. El reset lo hace Practica al cambiar la prop. */}
      <Practica
        letra={letra}
        // Se avisa AQUI y no en un pie de pagina: es el momento en que la
        // persona esta haciendo esa letra y la unica vez que le importa.
        contexto={
          `Letra ${indice + 1} de ${LETRAS_EVALUABLES.length}` +
          (LETRAS_SIN_PUNTAJE.includes(
            letra as (typeof LETRAS_SIN_PUNTAJE)[number],
          )
            ? ' · esta letra no puntúa'
            : '')
        }
        onCompletada={avanzar}
        onSaltar={avanzar}
      />
    </>
  );
}
