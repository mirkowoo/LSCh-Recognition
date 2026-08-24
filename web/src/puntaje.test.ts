import { describe, expect, it } from 'vitest';
import {
  CONFIANZA_PLENA,
  LETRAS_EVALUABLES,
  LETRAS_PUNTUABLES,
  LETRAS_SIN_PUNTAJE,
  UMBRAL_POR_DEFECTO,
  VENTANA_RETENCION,
  nota,
  promedioSesion,
  puntajeLetra,
} from './puntaje';

const base = {
  estabilidad: 1,
  confianzaMedia: 1,
  segundosHastaLogro: VENTANA_RETENCION,
  umbral: UMBRAL_POR_DEFECTO,
};

describe('puntajeLetra', () => {
  it('da 100 con ejecucion perfecta e inmediata', () => {
    expect(puntajeLetra(base)).toBeCloseTo(100, 5);
  });

  it('da 0 si nunca se sostuvo la sena', () => {
    expect(
      puntajeLetra({ ...base, estabilidad: 0, confianzaMedia: 0, segundosHastaLogro: 30 }),
    ).toBe(0);
  });

  it('no regala puntaje por rozar el umbral', () => {
    // Confianza exactamente en el umbral => componente de confianza vale 0,
    // no la mitad. Es el punto de normalizar sobre el umbral y no sobre cero.
    const p = puntajeLetra({ ...base, confianzaMedia: UMBRAL_POR_DEFECTO });
    expect(p).toBeCloseTo(65, 5); // 50 de estabilidad + 0 de confianza + 15 de fluidez
  });

  it('pondera la estabilidad por encima de la confianza', () => {
    // La confianza se elige a MITAD de camino entre el umbral y el techo: por
    // encima del techo la componente ya vale el maximo y la comparacion no
    // probaria nada.
    const aMedias = UMBRAL_POR_DEFECTO + (CONFIANZA_PLENA - UMBRAL_POR_DEFECTO) / 2;
    const menosEstable = puntajeLetra({ ...base, estabilidad: 0.5 });
    const menosConfiado = puntajeLetra({ ...base, confianzaMedia: aMedias });
    expect(menosEstable).toBeLessThan(menosConfiado);
  });

  it('da la confianza por completa al llegar al techo', () => {
    // Lo que hace alcanzable el 7,0: no hay que sacarle al modelo una certeza
    // que no da. En el techo y por encima, la componente vale lo mismo.
    const enElTecho = puntajeLetra({ ...base, confianzaMedia: CONFIANZA_PLENA });
    expect(enElTecho).toBeCloseTo(100, 5);
    expect(puntajeLetra({ ...base, confianzaMedia: 0.9 })).toBeCloseTo(enElTecho, 5);
  });

  it('penaliza poco la lentitud', () => {
    const lento = puntajeLetra({ ...base, segundosHastaLogro: 30 });
    expect(100 - lento).toBeCloseTo(15, 5); // solo el peso de fluidez
  });

  it('acota entradas fuera de rango', () => {
    expect(puntajeLetra({ ...base, estabilidad: 5 })).toBeLessThanOrEqual(100);
    expect(puntajeLetra({ ...base, segundosHastaLogro: -10 })).toBeLessThanOrEqual(100);
    expect(puntajeLetra({ ...base, estabilidad: -1, confianzaMedia: -1 })).toBeGreaterThanOrEqual(0);
  });
});

describe('nota', () => {
  it('mapea 60 puntos a un 4,0 exacto (exigencia 60%)', () => {
    expect(nota(60)).toBe(4);
  });

  it('mapea los extremos a 1,0 y 7,0', () => {
    expect(nota(0)).toBe(1);
    expect(nota(100)).toBe(7);
  });

  it('es monotona creciente', () => {
    for (let p = 0; p < 100; p += 5) {
      expect(nota(p)).toBeLessThanOrEqual(nota(p + 5));
    }
  });
});

describe('promedioSesion', () => {
  it('cuenta como cero las letras no logradas', () => {
    // El promedio se calcula sobre TODAS las evaluables, no solo las logradas:
    // saltarse letras baja la nota, que es el comportamiento correcto.
    // El esperado se deriva del conteo real para que el test no se rompa cuando
    // cambia que letras son evaluables.
    const n = 7;
    const algunas = Object.fromEntries(
      LETRAS_PUNTUABLES.slice(0, n).map((l) => [l, 100]),
    );
    expect(promedioSesion(algunas)).toBeCloseTo(
      (n / LETRAS_PUNTUABLES.length) * 100,
      5,
    );
  });

  it('ignora las letras que no puntuan', () => {
    // Fallar la P no puede bajar la nota, y lograrla no puede subirla: no esta
    // ni en el numerador ni en el divisor.
    const puntuables = Object.fromEntries(LETRAS_PUNTUABLES.map((l) => [l, 100]));
    expect(promedioSesion(puntuables)).toBeCloseTo(100, 5);

    const conCero = { ...puntuables };
    LETRAS_SIN_PUNTAJE.forEach((l) => { conCero[l] = 0; });
    expect(promedioSesion(conCero)).toBeCloseTo(100, 5);
  });

  it('da 100 solo si se lograron todas', () => {
    const todas = Object.fromEntries(LETRAS_EVALUABLES.map((l) => [l, 100]));
    expect(promedioSesion(todas)).toBeCloseTo(100, 5);
    expect(nota(promedioSesion(todas))).toBe(7);
  });

  it('excluye las letras con movimiento, salvo la H', () => {
    expect(LETRAS_EVALUABLES).toHaveLength(21);
    for (const l of ['G', 'J', 'S', 'X', 'Z']) {
      expect(LETRAS_EVALUABLES).not.toContain(l);
    }
    // La H se evalua pese a llevar desplazamiento: su forma de mano basta.
    expect(LETRAS_EVALUABLES).toContain('H');
  });
});
