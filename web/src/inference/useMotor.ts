/**
 * Motor de reconocimiento — LA frontera del sistema.
 *
 * Contrato: entra un frame de video, sale { letra, confianza }. Nada mas.
 *
 * Todo lo que hay detras (YOLOv9-t en ONNX, recorte central, umbral, worker) es
 * intercambiable sin tocar una sola linea de la UI. Cuando llegue el motor de
 * landmarks —MediaPipe Hand Landmarker + un clasificador chico— reemplaza al
 * worker y respeta este mismo contrato. Ese es todo el punto de tener esta capa.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ENCUADRE_PRODUCCION, LADO, aTensor, encuadrar } from './preprocess';
import type { Deteccion } from './types';

/** Cada cuanto se corre el modelo. El video sigue mostrandose a 60 FPS. */
const INTERVALO_MS = 80; // ~12 Hz: de sobra para una ventana de retencion de 4 s

export interface EstadoMotor {
  listo: boolean;
  proveedor: string;
  camaraActiva: boolean;
  error: string | null;
  /** Inferencias por segundo efectivas, promediadas. */
  fps: number;
}

export interface OpcionesMotor {
  umbral: number;
  /** Se llama en cada deteccion. Debe ser barata: corre ~12 veces por segundo. */
  onDeteccion?: (d: Deteccion, dtSegundos: number) => void;
  /** Si es false, no se corre el modelo aunque la camara este encendida. */
  activo?: boolean;
}

export function useMotor(opciones: OpcionesMotor) {
  const { umbral, onDeteccion, activo = true } = opciones;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const ocupadoRef = useRef(false);
  const bufferRef = useRef<Float32Array | null>(null);
  const ultimoEnvioRef = useRef(0);
  const ultimaDeteccionRef = useRef(0);
  const fpsRef = useRef(0);

  // Se guardan en refs para que cambiar el umbral o el callback no reinicie el
  // bucle de captura ni recree el worker.
  const umbralRef = useRef(umbral);
  umbralRef.current = umbral;
  const callbackRef = useRef(onDeteccion);
  callbackRef.current = onDeteccion;
  const activoRef = useRef(activo);
  activoRef.current = activo;

  const [estado, setEstado] = useState<EstadoMotor>({
    listo: false,
    proveedor: '',
    camaraActiva: false,
    error: null,
    fps: 0,
  });

  // --- worker ---
  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = w;

    w.onmessage = (e) => {
      const d = e.data;
      if (d.tipo === 'listo') {
        setEstado((s) => ({ ...s, listo: true, proveedor: d.proveedor }));
      } else if (d.tipo === 'resultado') {
        ocupadoRef.current = false;
        const ahora = performance.now();
        const dt = ultimaDeteccionRef.current
          ? (ahora - ultimaDeteccionRef.current) / 1000
          : INTERVALO_MS / 1000;
        ultimaDeteccionRef.current = ahora;
        // Media movil suave: el numero es para diagnostico, no debe saltar.
        fpsRef.current = fpsRef.current
          ? fpsRef.current * 0.9 + (1 / dt) * 0.1
          : 1 / dt;
        callbackRef.current?.(d.resultado.porEncuadre[ENCUADRE_PRODUCCION], dt);
      } else if (d.tipo === 'error') {
        ocupadoRef.current = false;
        setEstado((s) => ({ ...s, error: d.mensaje }));
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
  const encenderCamara = useCallback(async () => {
    setEstado((s) => ({ ...s, error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado((s) => ({ ...s, camaraActiva: true }));
    } catch (e) {
      setEstado((s) => ({
        ...s,
        error:
          'No se pudo abrir la camara: ' +
          String(e) +
          '. Revisa el permiso del navegador.',
      }));
    }
  }, []);

  const apagarCamara = useCallback(() => {
    const v = videoRef.current;
    const stream = v?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setEstado((s) => ({ ...s, camaraActiva: false }));
  }, []);

  useEffect(() => () => apagarCamara(), [apagarCamara]);

  // --- bucle de captura: cola de un solo frame ---
  useEffect(() => {
    if (!estado.camaraActiva || !estado.listo) return;
    let vivo = true;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = LADO;
      canvasRef.current.height = LADO;
    }
    if (!bufferRef.current) bufferRef.current = new Float32Array(3 * LADO * LADO);

    const tick = () => {
      if (!vivo) return;
      requestAnimationFrame(tick);

      const ahora = performance.now();
      const video = videoRef.current;
      // Se salta el frame si: el worker sigue ocupado, no toca todavia, o el
      // motor esta pausado. Descartar es correcto — un frame viejo no sirve.
      if (
        !activoRef.current ||
        ocupadoRef.current ||
        ahora - ultimoEnvioRef.current < INTERVALO_MS ||
        !video ||
        video.readyState < 2
      ) {
        return;
      }

      const ctx = canvasRef.current!.getContext('2d', {
        willReadFrequently: true,
      });
      if (!ctx) return;

      encuadrar(
        video,
        video.videoWidth,
        video.videoHeight,
        ctx,
        ENCUADRE_PRODUCCION,
      );
      const datos = aTensor(
        ctx.getImageData(0, 0, LADO, LADO),
        bufferRef.current!,
      );

      ultimoEnvioRef.current = ahora;
      ocupadoRef.current = true;
      workerRef.current?.postMessage({
        tipo: 'inferir',
        id: ahora,
        umbral: umbralRef.current,
        entradas: [{ encuadre: ENCUADRE_PRODUCCION, datos: datos.slice() }],
      });
    };

    const h = requestAnimationFrame(tick);
    return () => {
      vivo = false;
      cancelAnimationFrame(h);
    };
  }, [estado.camaraActiva, estado.listo]);

  return {
    videoRef,
    estado,
    encenderCamara,
    apagarCamara,
    /** Lectura barata del FPS sin provocar re-render. */
    leerFps: () => fpsRef.current,
  };
}
