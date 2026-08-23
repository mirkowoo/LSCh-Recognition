/// <reference lib="webworker" />
/**
 * Worker de inferencia. Existe por la misma razon por la que la app de escritorio
 * necesitaba un QThread: correr el modelo en el hilo de UI congela la animacion
 * de la letra, que es el nucleo del ejercicio.
 *
 * Politica de cola: un solo frame. Si llega uno nuevo mientras se procesa el
 * anterior, el viejo se descarta (lo maneja el llamador).
 */
import * as ort from 'onnxruntime-web';
import { decodificar } from './decode';
import type { Deteccion, Encuadre, MetaModelo, ResultadoFrame } from './types';

let sesion: ort.InferenceSession | null = null;
let meta: MetaModelo | null = null;
let anchors = 0;
let nombreEntrada = '';
let proveedor = '';

interface MensajeInit {
  tipo: 'init';
  rutaModelo: string;
  rutaMeta: string;
}
interface MensajeInferir {
  tipo: 'inferir';
  id: number;
  umbral: number;
  /** Un tensor NCHW ya preprocesado por cada encuadre a evaluar. */
  entradas: { encuadre: Encuadre; datos: Float32Array }[];
}
type Mensaje = MensajeInit | MensajeInferir;

async function init(msg: MensajeInit) {
  meta = await fetch(msg.rutaMeta).then((r) => r.json());

  // WebGPU cuando existe; WASM es el piso garantizado.
  const intentos: ort.InferenceSession.ExecutionProviderConfig[][] = [
    ['webgpu', 'wasm'],
    ['wasm'],
  ];
  let ultimoError: unknown = null;
  for (const eps of intentos) {
    try {
      sesion = await ort.InferenceSession.create(msg.rutaModelo, {
        executionProviders: eps,
        graphOptimizationLevel: 'all',
      });
      proveedor = String(eps[0]);
      break;
    } catch (e) {
      ultimoError = e;
    }
  }
  if (!sesion) throw ultimoError ?? new Error('no se pudo crear la sesion');

  nombreEntrada = sesion.inputNames[0];
  // anchors = (L/8)^2 + (L/16)^2 + (L/32)^2, pero se lee del modelo por si acaso.
  const salida = sesion.outputMetadata?.[0];
  const dims = (salida as { shape?: (number | string)[] } | undefined)?.shape;
  anchors = typeof dims?.[2] === 'number' ? (dims[2] as number) : 2100;

  self.postMessage({
    tipo: 'listo',
    proveedor,
    clases: meta!.clases,
    anchors,
    wasmThreads: ort.env.wasm.numThreads,
    simd: ort.env.wasm.simd,
  });
}

async function inferir(msg: MensajeInferir) {
  if (!sesion || !meta) return;
  const t0 = performance.now();
  const porEncuadre = {} as Record<Encuadre, Deteccion>;
  let msInferencia = 0;

  for (const { encuadre, datos } of msg.entradas) {
    const tensor = new ort.Tensor('float32', datos, [1, 3, 320, 320]);
    const t1 = performance.now();
    const salida = await sesion.run({ [nombreEntrada]: tensor });
    msInferencia += performance.now() - t1;
    const cruda = salida[sesion.outputNames[0]].data as Float32Array;
    porEncuadre[encuadre] = decodificar(
      cruda, meta.numClases, anchors, meta.clases, msg.umbral,
    );
  }

  const resultado: ResultadoFrame = {
    porEncuadre,
    msInferencia,
    msTotal: performance.now() - t0,
  };
  self.postMessage({ tipo: 'resultado', id: msg.id, resultado });
}

self.onmessage = async (e: MessageEvent<Mensaje>) => {
  try {
    if (e.data.tipo === 'init') await init(e.data);
    else if (e.data.tipo === 'inferir') await inferir(e.data);
  } catch (err) {
    self.postMessage({ tipo: 'error', mensaje: String(err) });
  }
};
