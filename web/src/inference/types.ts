export type Encuadre = 'letterbox' | 'stretch' | 'recorte';

export const ENCUADRES: Encuadre[] = ['letterbox', 'stretch', 'recorte'];

export const NOMBRES_ENCUADRE: Record<Encuadre, string> = {
  letterbox: 'Letterbox',
  stretch: 'Stretch',
  recorte: 'Recorte central',
};

/** Lo que devuelve el modelo para un frame bajo un encuadre dado. */
export interface Deteccion {
  /** null = ninguna clase supero el umbral ("sin sena"). */
  letra: string | null;
  /** Mejor puntaje global, aunque este bajo el umbral. Sirve para diagnosticar. */
  score: number;
  /** cx, cy, w, h en pixeles de la entrada del modelo (320). */
  caja: [number, number, number, number] | null;
}

export interface ResultadoFrame {
  porEncuadre: Record<Encuadre, Deteccion>;
  msInferencia: number;
  msTotal: number;
}

export interface MetaModelo {
  clases: string[];
  numClases: number;
}
