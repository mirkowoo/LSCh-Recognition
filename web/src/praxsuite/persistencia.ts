/**
 * Persistencia de resultados.
 *
 * REPARTO DE RESPONSABILIDADES — y por que es asi:
 *
 *   Sesiones e Intentos  -> los escribe una Automation detras de un Endpoint
 *                           sync. Valida el JWT y estampa la identidad ella
 *                           misma, asi que el cuerpo no decide de quien es la
 *                           sesion.
 *
 *                           Antes los escribia el cliente directo, confiando en
 *                           que el gateway estampara `Usuario` desde el claim
 *                           `sub`. Ese camino NO funciona: `Usuario` es de tipo
 *                           Enduser (uuid[] en la base) y la plantilla del
 *                           gateway lo inserta como texto. Ver
 *                           CONFIG.guardarSesionUrl.
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
import { consultar, llamarEndpoint } from './api';
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

  // UNA sola llamada: la sesion y los 21 intentos van juntos al endpoint, que
  // los escribe con la identidad verificada. Ver CONFIG.guardarSesionUrl para
  // por que ya no se escribe directo contra las tablas.
  //
  // El `Usuario` no viaja en el cuerpo — lo estampa el script de la automation
  // desde el token. Mandarlo no serviria de nada: se descarta.
  await llamarEndpoint(CONFIG.guardarSesionUrl, {
    token,
    modeloVersion: CONFIG.modeloVersion,
    sesion: {
      sesionId: resumen.sesionId,
      inicio: resumen.inicio.toISOString(),
      fin: resumen.fin.toISOString(),
      letrasEvaluadas: resumen.letrasEvaluadas,
      letrasLogradas: resumen.letrasLogradas,
      puntajePromedio: Number(resumen.puntajePromedio.toFixed(2)),
      nota: Number(resumen.nota.toFixed(1)),
      completa: resumen.completa,
    },
    intentos: intentos.map((i) => ({
      letra: i.letra,
      logrado: i.logrado,
      // Senales crudas: se guardan aparte del puntaje derivado para poder
      // recalcular la formula sobre el historico sin volver a pedir datos.
      confianzaMedia: Number(i.confianzaMedia.toFixed(4)),
      estabilidad: Number(i.estabilidad.toFixed(4)),
      segundosHastaLogro: Number(i.segundosHastaLogro.toFixed(2)),
      umbral: i.umbral,
      puntaje: Number(i.puntaje.toFixed(2)),
      fpsMedio: Number(fpsMedio.toFixed(1)),
      dispositivo: dispositivo(),
      fechaHora: new Date().toISOString(),
    })),
  });

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
