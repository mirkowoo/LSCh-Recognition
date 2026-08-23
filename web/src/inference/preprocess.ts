/**
 * Las tres formas de llevar un frame 16:9 a la entrada cuadrada del modelo.
 *
 * MEDIDO CON CAMARA REAL (letra B, 167 muestras, umbral 0.50):
 *
 *   encuadre          acierta   detecta mal   sin senal
 *   recorte central    86.2%        0%          13.8%   <- el que se usa
 *   stretch            27.5%        0%          72.5%
 *   letterbox           1.8%       43.1%        55.1%
 *
 * El resultado importante no es que letterbox pierda, sino COMO pierde: en el
 * 43% de los frames devolvio con confianza una letra equivocada. Recorte y
 * stretch nunca lo hacen — o aciertan o callan. Para un ejercicio de aprendizaje
 * un falso positivo confiado es peor que no detectar nada: le ensena al usuario
 * que hizo bien algo que hizo mal.
 *
 * La hipotesis de por que: el modelo se entreno con "Stretch to 640x640" sobre
 * imagenes que ya venian recortadas a la mano, y nunca vio barras grises. El
 * relleno del letterbox es una textura fuera de distribucion que se come casi
 * la mitad del cuadro.
 *
 * Se conservan las tres para poder repetir la medicion en otros equipos y, sobre
 * todo, cuando llegue el motor de landmarks. Ver PLAN_EMPAQUETADO_WEB.md A.0.
 */
import type { Encuadre } from './types';

export const LADO = 320;

/** El encuadre que gano la medicion. Todo el producto usa este. */
export const ENCUADRE_PRODUCCION: Encuadre = 'recorte';
const COLOR_PAD = 114; // el gris que usa Ultralytics para rellenar

/** Como se mapea un punto de la entrada del modelo de vuelta al frame original. */
export interface Mapeo {
  escala: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Dibuja el frame sobre un canvas cuadrado de LADO x LADO segun el encuadre.
 * Devuelve como deshacer la transformacion para poder ubicar la caja despues.
 */
export function encuadrar(
  origen: CanvasImageSource,
  anchoOrigen: number,
  altoOrigen: number,
  destino: CanvasRenderingContext2D,
  encuadre: Encuadre,
): Mapeo {
  destino.clearRect(0, 0, LADO, LADO);

  if (encuadre === 'stretch') {
    // Deforma para llenar el cuadrado. Reproduce la distorsion del entrenamiento.
    destino.drawImage(origen, 0, 0, anchoOrigen, altoOrigen, 0, 0, LADO, LADO);
    return {
      escala: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }

  if (encuadre === 'recorte') {
    // Recorta el cuadrado central del frame. Sin barras ni deformacion.
    const lado = Math.min(anchoOrigen, altoOrigen);
    const sx = (anchoOrigen - lado) / 2;
    const sy = (altoOrigen - lado) / 2;
    destino.drawImage(origen, sx, sy, lado, lado, 0, 0, LADO, LADO);
    return {
      escala: LADO / lado,
      offsetX: -sx * (LADO / lado),
      offsetY: -sy * (LADO / lado),
    };
  }

  // letterbox: conserva proporcion y rellena el resto con gris.
  destino.fillStyle = `rgb(${COLOR_PAD},${COLOR_PAD},${COLOR_PAD})`;
  destino.fillRect(0, 0, LADO, LADO);
  const escala = Math.min(LADO / anchoOrigen, LADO / altoOrigen);
  const w = Math.round(anchoOrigen * escala);
  const h = Math.round(altoOrigen * escala);
  const dx = Math.floor((LADO - w) / 2);
  const dy = Math.floor((LADO - h) / 2);
  destino.drawImage(origen, 0, 0, anchoOrigen, altoOrigen, dx, dy, w, h);
  return { escala, offsetX: dx, offsetY: dy };
}

/**
 * ImageData (RGBA 0-255) -> Float32Array NCHW normalizado a 0-1, canales RGB.
 * Se reutiliza el buffer entre frames para no presionar al recolector de basura.
 */
export function aTensor(datos: ImageData, buffer: Float32Array): Float32Array {
  const px = datos.data;
  const n = LADO * LADO;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    buffer[i] = px[j] / 255;             // R
    buffer[n + i] = px[j + 1] / 255;     // G
    buffer[2 * n + i] = px[j + 2] / 255; // B
  }
  return buffer;
}
