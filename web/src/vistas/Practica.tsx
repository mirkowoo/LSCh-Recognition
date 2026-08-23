/**
 * Bucle de practica — el corazon pedagogico, portado de la app PyQt5.
 *
 * El usuario sostiene la sena; la letra transiciona de rojo a verde a medida que
 * acumula tiempo. Dos decisiones que no estaban en la version de escritorio:
 *
 * 1. DECAIMIENTO en vez de reset. Si se pierde la deteccion medio segundo, perder
 *    los 4 s acumulados desmotiva. Decae al doble de velocidad de la que sube.
 * 2. "No veo tu mano" es un estado VISUALMENTE DISTINTO de "veo otra letra". Son
 *    problemas distintos y el usuario necesita saber cual tiene.
 *
 * La animacion se escribe directo al DOM desde requestAnimationFrame en vez de
 * pasar por estado de React: son 60 actualizaciones por segundo y no tiene
 * sentido re-renderizar el arbol para mover un color.
 *
 * El video se muestra RECORTADO al cuadrado central — exactamente la region que
 * el modelo recibe. Si se mostrara el 16:9 completo, el usuario encuadraria la
 * mano contra un marco que el modelo no ve.
 *
 * La referencia visual sale de img/ del repositorio original. OJO: no esta
 * verificado que TODAS coincidan con lo que el modelo fue entrenado a reconocer
 * — la Q, por ejemplo, ilustra un gesto tocando el menton que no corresponde al
 * alfabeto ASL del que deriva el dataset. Una letra cuya referencia no coincide
 * con el modelo es imposible de lograr. Ver PLAN_EMPAQUETADO_WEB.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotor } from '../inference/useMotor';
import type { Deteccion } from '../inference/types';
import {
  UMBRAL_POR_DEFECTO,
  VENTANA_RETENCION,
  mensajeRefuerzo,
  puntajeLetra,
} from '../puntaje';

/** El progreso decae al doble de la velocidad a la que sube. */
const FACTOR_DECAIMIENTO = 2;

export interface ResultadoLetra {
  letra: string;
  logrado: boolean;
  estabilidad: number;
  confianzaMedia: number;
  segundosHastaLogro: number;
  umbral: number;
  puntaje: number;
}

interface Props {
  letra: string;
  /** Si se omite, la practica es libre y no reporta nada. */
  onCompletada?: (r: ResultadoLetra) => void;
  onSaltar?: (r: ResultadoLetra) => void;
  umbral?: number;
  /** Texto de contexto, ej. "Letra 3 de 24". */
  contexto?: string;
}

type Situacion = 'esperando' | 'sinMano' | 'otraLetra' | 'correcta' | 'logrado';

export function Practica({
  letra,
  onCompletada,
  onSaltar,
  umbral = UMBRAL_POR_DEFECTO,
  contexto,
}: Props) {
  const letraElRef = useRef<HTMLDivElement>(null);
  const aroElRef = useRef<SVGCircleElement>(null);

  // Todo el estado del bucle vive en refs: cambia 12 veces por segundo y no
  // debe provocar re-render.
  const progresoRef = useRef(0);
  const inicioRef = useRef(performance.now());
  const totalMuestrasRef = useRef(0);
  const muestrasValidasRef = useRef(0);
  const sumaConfianzaRef = useRef(0);
  const logradoRef = useRef(false);
  const situacionRef = useRef<Situacion>('esperando');
  const ultimaDeteccionRef = useRef<Deteccion | null>(null);

  const [situacion, setSituacion] = useState<Situacion>('esperando');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confianzaVista, setConfianzaVista] = useState(0);

  const reiniciar = useCallback(() => {
    progresoRef.current = 0;
    inicioRef.current = performance.now();
    totalMuestrasRef.current = 0;
    muestrasValidasRef.current = 0;
    sumaConfianzaRef.current = 0;
    logradoRef.current = false;
    situacionRef.current = 'esperando';
    ultimaDeteccionRef.current = null;
    setSituacion('esperando');
    setMensaje(null);
    setConfianzaVista(0);
  }, []);

  useEffect(() => reiniciar(), [letra, reiniciar]);

  const armarResultado = useCallback(
    (logrado: boolean): ResultadoLetra => {
      const total = totalMuestrasRef.current || 1;
      const validas = muestrasValidasRef.current;
      return {
        letra,
        logrado,
        estabilidad: validas / total,
        confianzaMedia: validas ? sumaConfianzaRef.current / validas : 0,
        segundosHastaLogro: (performance.now() - inicioRef.current) / 1000,
        umbral,
        puntaje: 0, // se rellena abajo
      };
    },
    [letra, umbral],
  );

  const alDetectar = useCallback(
    (d: Deteccion, dt: number) => {
      if (logradoRef.current) return;
      ultimaDeteccionRef.current = d;
      totalMuestrasRef.current++;

      const acierta = d.letra === letra;
      if (acierta) {
        muestrasValidasRef.current++;
        sumaConfianzaRef.current += d.score;
        progresoRef.current = Math.min(
          1,
          progresoRef.current + dt / VENTANA_RETENCION,
        );
      } else {
        progresoRef.current = Math.max(
          0,
          progresoRef.current - (dt * FACTOR_DECAIMIENTO) / VENTANA_RETENCION,
        );
      }

      const sig: Situacion = acierta
        ? 'correcta'
        : d.letra === null
          ? 'sinMano'
          : 'otraLetra';
      if (sig !== situacionRef.current) {
        situacionRef.current = sig;
        setSituacion(sig);
      }
      setConfianzaVista(d.score);

      if (progresoRef.current >= 1) {
        logradoRef.current = true;
        situacionRef.current = 'logrado';
        setSituacion('logrado');
        setMensaje(mensajeRefuerzo());
        const r = armarResultado(true);
        r.puntaje = puntajeLetra(r);
        onCompletada?.(r);
      }
    },
    [letra, armarResultado, onCompletada],
  );

  const { videoRef, estado, encenderCamara } = useMotor({
    umbral,
    onDeteccion: alDetectar,
  });

  // Animacion: escribe directo al DOM, sin pasar por React.
  useEffect(() => {
    let vivo = true;
    const CIRCUNFERENCIA = 2 * Math.PI * 54;
    const tick = () => {
      if (!vivo) return;
      requestAnimationFrame(tick);
      const p = progresoRef.current;
      if (letraElRef.current) {
        // Rojo (0) -> verde (120) en HSL: una interpolacion de tono, no de RGB,
        // asi el camino pasa por naranjo y amarillo en vez de por gris.
        letraElRef.current.style.color = `hsl(${p * 120}, 78%, 58%)`;
        letraElRef.current.style.transform = `scale(${1 + p * 0.08})`;
      }
      if (aroElRef.current) {
        aroElRef.current.style.strokeDashoffset = String(
          CIRCUNFERENCIA * (1 - p),
        );
        aroElRef.current.style.stroke = `hsl(${p * 120}, 78%, 58%)`;
      }
    };
    const h = requestAnimationFrame(tick);
    return () => {
      vivo = false;
      cancelAnimationFrame(h);
    };
  }, []);

  const saltar = () => {
    const r = armarResultado(false);
    r.puntaje = 0;
    onSaltar?.(r);
  };

  const textoSituacion: Record<Situacion, string> = {
    esperando: 'Haz la seña frente a la cámara',
    sinMano: 'No veo tu mano',
    otraLetra: `Veo una ${ultimaDeteccionRef.current?.letra ?? '?'}`,
    correcta: '¡Eso es! Mantenla',
    logrado: mensaje ?? 'Logrado',
  };

  return (
    <div className="practica">
      {/* La camara y su pie van envueltos: `.practica` es una grilla de dos
          columnas y cualquier hijo directo extra se lleva una celda. Sin este
          contenedor el aviso ocupaba la columna del panel. */}
      <div className="practica-izquierda">
        <div className="practica-camara">
          <video ref={videoRef} playsInline muted />
          {!estado.camaraActiva && (
            <div className="practica-overlay">
              <button onClick={encenderCamara} disabled={!estado.listo}>
                {estado.listo ? 'Encender cámara' : 'Cargando modelo…'}
              </button>
            </div>
          )}
        </div>

        <p className="practica-consejo">
          Recuerda estar en un ambiente bien iluminado.
        </p>
      </div>

      <div className="practica-panel">
        {contexto && <div className="practica-contexto">{contexto}</div>}

        <figure className="practica-referencia">
          <img
            src={`/img/letras/${letra}.png`}
            alt={`Cómo se hace la letra ${letra}`}
            width={160}
            height={200}
            loading="eager"
          />
          <figcaption>Así se hace</figcaption>
        </figure>

        <div className="practica-aro">
          <svg viewBox="0 0 120 120" width="180" height="180">
            <circle cx="60" cy="60" r="54" className="aro-fondo" />
            <circle
              ref={aroElRef}
              cx="60"
              cy="60"
              r="54"
              className="aro-progreso"
              style={{
                strokeDasharray: 2 * Math.PI * 54,
                strokeDashoffset: 2 * Math.PI * 54,
              }}
            />
          </svg>
          <div ref={letraElRef} className="practica-letra">
            {letra}
          </div>
        </div>

        <div className={`practica-estado est-${situacion}`}>
          {textoSituacion[situacion]}
        </div>
        <div className="practica-detalle">
          confianza {confianzaVista.toFixed(2)} · umbral {umbral.toFixed(2)}
          {estado.proveedor && ` · ${estado.proveedor}`}
        </div>

        {estado.error && <div className="error">{estado.error}</div>}

        <div className="practica-acciones">
          {!onCompletada && <button onClick={reiniciar}>Reiniciar</button>}
          {/* Disponible desde el primer segundo: quedarse atascado en una letra
              sin salida es la forma mas rapida de que alguien abandone. */}
          {onSaltar && <button onClick={saltar}>Saltar esta letra</button>}
        </div>
      </div>
    </div>
  );
}
