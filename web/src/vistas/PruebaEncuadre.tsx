/**
 * Prueba de encuadre — herramienta de diagnostico.
 *
 * Ya cumplio su proposito: el recorte central gano por goleada (86.2% de acierto
 * contra 27.5% de stretch y 1.8% de letterbox, sobre 167 muestras de la letra B).
 * El producto usa recorte central; ver preprocess.ts.
 *
 * Se conserva porque sigue siendo util para: repetir la medicion en otro equipo o
 * navegador, medir latencia con el boton correspondiente, y rehacer la
 * comparacion completa cuando entre el motor de landmarks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { LADO, aTensor, encuadrar } from '../inference/preprocess';
import { ENCUADRES, NOMBRES_ENCUADRE } from '../inference/types';
import type { Deteccion, Encuadre, ResultadoFrame } from '../inference/types';

interface Acumulado {
  muestras: number;
  aciertos: number;
  sumaScoreAcierto: number;
  sinDeteccion: number;
}

const vacio = (): Acumulado => ({
  muestras: 0,
  aciertos: 0,
  sumaScoreAcierto: 0,
  sinDeteccion: 0,
});

const ABECEDARIO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function PruebaEncuadre() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRefs = useRef<Record<Encuadre, HTMLCanvasElement | null>>({
    letterbox: null,
    stretch: null,
    recorte: null,
  });
  const workerRef = useRef<Worker | null>(null);
  const ocupadoRef = useRef(false);
  const buffersRef = useRef<Record<Encuadre, Float32Array> | null>(null);
  const idRef = useRef(0);

  const [listo, setListo] = useState(false);
  const [proveedor, setProveedor] = useState('');
  const [hilos, setHilos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [umbral, setUmbral] = useState(0.5);
  const [objetivo, setObjetivo] = useState('A');
  const [ultimo, setUltimo] = useState<ResultadoFrame | null>(null);
  const [bench, setBench] = useState<null | {
    proveedor: string; repeticiones: number;
    mediana: number; p90: number; min: number; max: number;
  }>(null);
  const [midiendo, setMidiendo] = useState(false);
  const [acum, setAcum] = useState<Record<Encuadre, Acumulado>>({
    letterbox: vacio(),
    stretch: vacio(),
    recorte: vacio(),
  });

  const objetivoRef = useRef(objetivo);
  objetivoRef.current = objetivo;

  // --- worker ---
  useEffect(() => {
    const w = new Worker(new URL('../inference/worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = w;
    w.onmessage = (e) => {
      const d = e.data;
      if (d.tipo === 'listo') {
        setListo(true);
        setProveedor(d.proveedor);
        setHilos(d.wasmThreads ?? null);
      } else if (d.tipo === 'resultado') {
        ocupadoRef.current = false;
        setUltimo(d.resultado);
        const objetivoActual = objetivoRef.current;
        setAcum((prev) => {
          const sig = { ...prev };
          for (const enc of ENCUADRES) {
            const det: Deteccion = d.resultado.porEncuadre[enc];
            const a = { ...prev[enc] };
            a.muestras++;
            if (det.letra === null) {
              a.sinDeteccion++;
            } else if (det.letra === objetivoActual) {
              a.aciertos++;
              a.sumaScoreAcierto += det.score;
            }
            sig[enc] = a;
          }
          return sig;
        });
      } else if (d.tipo === 'bench') {
        setBench(d);
        setMidiendo(false);
      } else if (d.tipo === 'error') {
        ocupadoRef.current = false;
        setError(d.mensaje);
      }
    };
    w.postMessage({
      tipo: 'init',
      rutaModelo: '/models/best-320.onnx',
      rutaMeta: '/models/clases.json',
    });
    return () => w.terminate();
  }, []);

  // --- camara ---
  const iniciar = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCorriendo(true);
    } catch (e) {
      setError(
        'No se pudo abrir la camara: ' +
          String(e) +
          '. Revisa el permiso del navegador; getUserMedia solo funciona en https o en localhost.',
      );
    }
  }, []);

  // --- bucle: cola de un solo frame ---
  useEffect(() => {
    if (!corriendo || !listo) return;
    let vivo = true;

    if (!buffersRef.current) {
      buffersRef.current = {
        letterbox: new Float32Array(3 * LADO * LADO),
        stretch: new Float32Array(3 * LADO * LADO),
        recorte: new Float32Array(3 * LADO * LADO),
      };
    }

    const tick = () => {
      if (!vivo) return;
      const video = videoRef.current;
      // Si el worker sigue ocupado se descarta este frame: la camara se ve
      // fluida aunque las detecciones lleguen mas lento.
      if (video && video.readyState >= 2 && !ocupadoRef.current) {
        const entradas: { encuadre: Encuadre; datos: Float32Array }[] = [];
        for (const enc of ENCUADRES) {
          const canvas = canvasRefs.current[enc];
          if (!canvas) continue;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) continue;
          encuadrar(video, video.videoWidth, video.videoHeight, ctx, enc);
          const datos = aTensor(
            ctx.getImageData(0, 0, LADO, LADO),
            buffersRef.current![enc],
          );
          // Se copia porque el buffer se reusa en el proximo frame.
          entradas.push({ encuadre: enc, datos: datos.slice() });
        }
        if (entradas.length) {
          ocupadoRef.current = true;
          workerRef.current?.postMessage({
            tipo: 'inferir',
            id: ++idRef.current,
            umbral,
            entradas,
          });
        }
      }
      requestAnimationFrame(tick);
    };
    const h = requestAnimationFrame(tick);
    return () => {
      vivo = false;
      cancelAnimationFrame(h);
    };
  }, [corriendo, listo, umbral]);

  const reiniciarConteo = () =>
    setAcum({ letterbox: vacio(), stretch: vacio(), recorte: vacio() });

  const tasa = (a: Acumulado) => (a.muestras ? a.aciertos / a.muestras : 0);
  const lider = ENCUADRES.reduce(
    (mejor, e) => (tasa(acum[e]) > tasa(acum[mejor]) ? e : mejor),
    ENCUADRES[0],
  );
  const hayDatos = acum[lider].muestras > 0 && acum[lider].aciertos > 0;

  return (
    <div className="envoltorio">
      <h1>LSCh — prueba de encuadre</h1>
      <p className="sub">
        Elige una letra, hazla frente a la camara y sostenla. Los tres encuadres
        corren sobre el mismo frame, asi que la comparacion es directa. Repite con
        varias letras antes de decidir — sobre todo con E, que es la unica que se
        degradaba a 320&nbsp;px.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="barra">
        <button onClick={iniciar} disabled={corriendo || !listo}>
          {corriendo ? 'Camara activa' : listo ? 'Encender camara' : 'Cargando modelo…'}
        </button>
        <label>
          Letra objetivo
          <select
            value={objetivo}
            onChange={(e) => {
              setObjetivo(e.target.value);
              reiniciarConteo();
            }}
          >
            {ABECEDARIO.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Umbral {umbral.toFixed(2)}
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={umbral}
            onChange={(e) => setUmbral(Number(e.target.value))}
          />
        </label>
        <button onClick={reiniciarConteo}>Reiniciar conteo</button>
        <button
          onClick={() => {
            setMidiendo(true);
            setBench(null);
            workerRef.current?.postMessage({ tipo: 'bench', repeticiones: 100 });
          }}
          disabled={!listo || midiendo || corriendo}
          title="Corre 100 inferencias con entrada sintetica. Apaga la camara antes para no competir por CPU."
        >
          {midiendo ? 'Midiendo…' : 'Medir latencia'}
        </button>
      </div>

      <div className="principal">
        <div>
          <video ref={videoRef} playsInline muted />
          <p className="detalle" style={{ marginTop: 8 }}>
            {proveedor && (
              <>
                Motor: <b>{proveedor}</b>
                {hilos ? ' · ' + hilos + ' hilo(s) WASM' : ''} ·{' '}
              </>
            )}
            {ultimo && (
              <>
                {ultimo.msInferencia.toFixed(0)} ms los tres ·{' '}
                {(ultimo.msInferencia / 3).toFixed(0)} ms c/u ·{' '}
                {(1000 / ultimo.msTotal).toFixed(1)} pasadas/s
              </>
            )}
          </p>
        </div>

        <div className="tarjetas">
          {ENCUADRES.map((enc) => {
            const det = ultimo?.porEncuadre[enc];
            const acierta = det?.letra === objetivo;
            return (
              <div
                key={enc}
                className={'tarjeta' + (hayDatos && enc === lider ? ' gana' : '')}
              >
                <canvas
                  ref={(el) => {
                    canvasRefs.current[enc] = el;
                  }}
                  width={LADO}
                  height={LADO}
                />
                <div>
                  <div className="nombre">{NOMBRES_ENCUADRE[enc]}</div>
                  {det ? (
                    det.letra ? (
                      <div
                        className="letra"
                        style={{ color: acierta ? 'var(--ok)' : 'var(--mal)' }}
                      >
                        {det.letra}
                      </div>
                    ) : (
                      <div className="letra nada">sin seña</div>
                    )
                  ) : (
                    <div className="letra nada">—</div>
                  )}
                  <div className="detalle">
                    conf {det ? det.score.toFixed(3) : '—'} · acierto{' '}
                    {(tasa(acum[enc]) * 100).toFixed(0)}% de {acum[enc].muestras}
                  </div>
                  <div className="medidor">
                    <i style={{ width: (det?.score ?? 0) * 100 + '%' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {bench && (
        <p className="detalle" style={{ marginTop: 16 }}>
          <b>Latencia en este navegador</b> ({bench.proveedor}, {bench.repeticiones} inferencias):
          mediana <b>{bench.mediana.toFixed(1)} ms</b> ({(1000 / bench.mediana).toFixed(1)} FPS) ·
          p90 {bench.p90.toFixed(1)} ms · min {bench.min.toFixed(1)} · max {bench.max.toFixed(1)}
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Encuadre</th>
            <th>Muestras</th>
            <th>Acierta {objetivo}</th>
            <th>Confianza media</th>
            <th>Sin detección</th>
          </tr>
        </thead>
        <tbody>
          {ENCUADRES.map((enc) => {
            const a = acum[enc];
            return (
              <tr key={enc} className={hayDatos && enc === lider ? 'lider' : ''}>
                <td>{NOMBRES_ENCUADRE[enc]}</td>
                <td>{a.muestras}</td>
                <td>{(tasa(a) * 100).toFixed(1)}%</td>
                <td>
                  {a.aciertos ? (a.sumaScoreAcierto / a.aciertos).toFixed(3) : '—'}
                </td>
                <td>
                  {a.muestras
                    ? ((a.sinDeteccion / a.muestras) * 100).toFixed(1)
                    : '0.0'}
                  %
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="pie">
        El video se muestra espejado porque es lo natural para el usuario, pero al
        modelo se le entrega el frame sin espejar. El entrenamiento uso volteo
        horizontal, asi que no deberia importar — esta fijo solo para tener una
        variable menos.
        <br />
        La confianza media se promedia solo sobre los frames que acertaron:
        mezclarla con los fallos daria un numero que no significa nada.
      </p>
    </div>
  );
}
