/**
 * Persistencia de resultados.
 *
 * REPARTO DE RESPONSABILIDADES — y por que es asi:
 *
 *   Sesiones e Intentos  -> los escribe el cliente directo con su JWT.
 *                           El gateway estampa la columna `Usuario` desde el
 *                           claim `sub` del token y RECHAZA cualquier intento
 *                           del cliente de fijarla. Por eso nadie puede escribir
 *                           a nombre de otro, aunque manipule el cuerpo.
 *
 *   Ranking              -> NO lo escribe el cliente. Lo recalcula una Automation
 *                           detras de un Endpoint sync, leyendo las sesiones
 *                           desde la base. El endpoint no acepta datos: solo el
 *                           token. No hay payload que falsificar.
 *
 * LO QUE ESTO NO RESUELVE, dicho claro: la inferencia corre en el cliente, asi
 * que alguien decidido puede escribir una sesion con notas inventadas usando su
 * propio token. Ningun servidor puede verificar lo que vio una camara ajena.
 * Lo que si queda garantizado es la identidad: nadie puntua a nombre de otro.
 */
import { CONFIG } from './config';
import { consultar, insertar, llamarEndpoint } from './api';
import { obtenerSesion, obtenerToken } from './auth';
import type { ResultadoLetra } from '../vistas/Practica';

/** Id de sesion legible y ordenable, unico por usuario y momento. */
export function nuevaSesionId(): string {
  const ahora = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const azar = Math.random().toString(36).slice(2, 8);
  return `s${ahora}-${azar}`;
}

function dispositivo(): string {
  // Solo lo suficiente para diagnosticar rendimiento por tipo de equipo.
  const ua = navigator.userAgent;
  const motor = /Firefox/.test(ua)
    ? 'Firefox'
    : /Edg/.test(ua)
      ? 'Edge'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'otro';
  const plataforma = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'otro';
  return `${motor}/${plataforma}`;
}

export interface ResumenSesion {
  sesionId: string;
  inicio: Date;
  fin: Date;
  letrasEvaluadas: number;
  letrasLogradas: number;
  puntajePromedio: number;
  nota: number;
  completa: boolean;
}

/**
 * Guarda la sesion y sus intentos, y pide el recalculo del ranking.
 *
 * Los intentos van en UNA sola mutacion, no una por letra: son 24 filas.
 */
export async function guardarSesion(
  resumen: ResumenSesion,
  intentos: ResultadoLetra[],
  fpsMedio: number,
): Promise<{ publicado: boolean } | null> {
  const token = obtenerToken();
  if (!token) return null;

  await insertar(
    CONFIG.tablas.sesiones,
    [
      {
        SesionId: resumen.sesionId,
        Inicio: resumen.inicio.toISOString(),
        Fin: resumen.fin.toISOString(),
        LetrasEvaluadas: resumen.letrasEvaluadas,
        LetrasLogradas: resumen.letrasLogradas,
        PuntajePromedio: Number(resumen.puntajePromedio.toFixed(2)),
        Nota: Number(resumen.nota.toFixed(1)),
        Completa: resumen.completa,
        ModeloVersion: CONFIG.modeloVersion,
        // `Usuario` no se manda: lo estampa el gateway desde el token.
      },
    ],
    token,
  );

  if (intentos.length) {
    await insertar(
      CONFIG.tablas.intentos,
      intentos.map((i, n) => ({
        IntentoId: `${resumen.sesionId}-${String(n).padStart(2, '0')}-${i.letra}`,
        SesionId: resumen.sesionId,
        Letra: i.letra,
        Logrado: i.logrado,
        // Senales crudas: se guardan aparte del puntaje derivado para poder
        // recalcular la formula sobre el historico sin volver a pedir datos.
        ConfianzaMedia: Number(i.confianzaMedia.toFixed(4)),
        Estabilidad: Number(i.estabilidad.toFixed(4)),
        SegundosHastaLogro: Number(i.segundosHastaLogro.toFixed(2)),
        Umbral: i.umbral,
        Puntaje: Number(i.puntaje.toFixed(2)),
        FpsMedio: Number(fpsMedio.toFixed(1)),
        Dispositivo: dispositivo(),
        FechaHora: new Date().toISOString(),
      })),
      token,
    );
  }

  // Solo una sesion completa mueve el ranking.
  if (!resumen.completa) return { publicado: false };

  const r = (await llamarEndpoint(CONFIG.cerrarSesionUrl, { token })) as {
    publicado?: boolean;
  } | null;
  return { publicado: Boolean(r?.publicado) };
}

export interface FilaRanking {
  Email: string;
  NombreVisible: string;
  MejorNota: number;
  MejorPuntaje: number;
  SesionesCompletas: number;
}

/** Lectura publica: no necesita sesion. */
export function leerRanking(limite = 20) {
  return consultar<FilaRanking>(CONFIG.tablas.ranking, {
    select: [
      'Email',
      'NombreVisible',
      'MejorNota',
      'MejorPuntaje',
      'SesionesCompletas',
    ],
    orderBy: [{ field: 'MejorNota', dir: 'desc' }],
    limit: limite,
  });
}

export interface FilaSesion {
  SesionId: string;
  Fin: string;
  Nota: number;
  PuntajePromedio: number;
  LetrasLogradas: number;
  Completa: boolean;
}

/**
 * Historial propio. El gateway aplica el filtro por fila (`__SELF__`) contra la
 * columna Usuario, asi que aunque no se pida un `where` por usuario, solo
 * vuelven las filas del que llama.
 */
export function leerMiHistorial(limite = 20) {
  const token = obtenerToken();
  if (!token) return Promise.resolve<FilaSesion[]>([]);
  return consultar<FilaSesion>(
    CONFIG.tablas.sesiones,
    {
      select: [
        'SesionId',
        'Fin',
        'Nota',
        'PuntajePromedio',
        'LetrasLogradas',
        'Completa',
      ],
      orderBy: [{ field: 'Fin', dir: 'desc' }],
      limit: limite,
    },
    token,
  );
}

/** Marca de agua para saber si el perfil ya existe sin traer todo. */
export async function miPerfil() {
  const token = obtenerToken();
  const email = obtenerSesion()?.usuario.email;
  if (!token || !email) return null;
  const filas = await consultar<{
    Email: string;
    NombreVisible: string;
    ApareceEnRanking: boolean;
  }>(
    CONFIG.tablas.perfiles,
    { where: [{ field: 'Email', op: 'eq', value: email }], limit: 1 },
    token,
  );
  return filas[0] ?? null;
}
