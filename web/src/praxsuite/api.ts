/**
 * Cliente de Praxsuite.
 *
 *   Lectura   -> POST /query con la clave publica (solo lectura).
 *   Auth      -> POST /auth/login y /auth/register, con la misma clave publica.
 *   Escritura -> POST a un Endpoint sync SIN credencial; la Automation detras
 *                valida el JWT y escribe con la identidad verificada. Todavia no
 *                implementado; ver PLAN_EMPAQUETADO_WEB.md C.5.
 *
 * La regla que hace segura la escritura: el UsuarioId sale del token, nunca del
 * payload. Un cliente no puede escribir a nombre de otro aunque lo intente.
 */
import { CONFIG } from './config';

/**
 * El gateway responde en ingles. Se traducen los mensajes conocidos y se deja
 * pasar el resto tal cual: es preferible mostrar un mensaje en ingles que
 * tragarse uno que no anticipamos.
 */
const TRADUCCIONES: Record<string, string> = {
  'Invalid email or password.': 'Correo o contraseña incorrectos.',
  'User already exists.': 'Ya existe una cuenta con ese correo.',
  'Email already registered.': 'Ya existe una cuenta con ese correo.',
  'Email not confirmed.': 'Falta confirmar tu correo. Revisa tu bandeja de entrada.',
  'Password does not meet requirements.':
    'La contraseña no cumple los requisitos: al menos 8 caracteres.',
  'Invalid credentials.': 'Correo o contraseña incorrectos.',
};

export function traducir(mensaje: unknown): string {
  const texto = typeof mensaje === 'string' ? mensaje : '';
  return TRADUCCIONES[texto.trim()] ?? texto;
}

/**
 * Saca un mensaje legible de una respuesta de error.
 *
 * El gateway no tiene UNA forma de error: `/auth` devuelve { message } como
 * string, y PraxQL devuelve { error: { code, message } } como OBJETO. Tratar
 * ambos igual reventaba con "mensaje.trim is not a function" — y peor, tapaba
 * el error real. Esta funcion normaliza las dos formas y nunca lanza.
 */
export function mensajeDeError(datos: unknown, respaldo: string): string {
  const d = datos as
    | {
        message?: unknown;
        error?: unknown;
        errors?: unknown;
      }
    | null
    | undefined;

  const candidatos: unknown[] = [];
  if (d && typeof d === 'object') {
    candidatos.push(d.message);
    if (typeof d.error === 'string') {
      candidatos.push(d.error);
    } else if (d.error && typeof d.error === 'object') {
      const e = d.error as { message?: unknown; code?: unknown };
      // El codigo se conserva: distingue SCOPE_VIOLATION de INVALID_QUERY, y esa
      // diferencia es justo la que hace falta para diagnosticar.
      if (typeof e.message === 'string') {
        candidatos.push(e.code ? `${e.message} (${String(e.code)})` : e.message);
      } else if (typeof e.code === 'string') {
        candidatos.push(e.code);
      }
    }
    if (Array.isArray(d.errors) && d.errors.length) {
      const primero = d.errors[0];
      if (typeof primero === 'string') candidatos.push(primero);
      else if (primero && typeof primero === 'object') {
        candidatos.push((primero as { message?: string }).message);
      }
    }
  }

  const bruto = candidatos.find((c) => typeof c === 'string' && c.trim());
  return traducir(bruto) || respaldo;
}

export class ErrorPraxsuite extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
    readonly codigo?: string,
  ) {
    super(mensaje);
    this.name = 'ErrorPraxsuite';
  }
}

async function post(url: string, cuerpo: unknown, token?: string) {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || CONFIG.clavePublica}`,
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorPraxsuite('No se pudo conectar con el servidor.');
  }

  const texto = await respuesta.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    // Respuesta no-JSON: se reporta el texto crudo, que suele traer la causa.
  }

  if (!respuesta.ok) {
    throw new ErrorPraxsuite(
      mensajeDeError(datos, texto || `HTTP ${respuesta.status}`),
      respuesta.status,
    );
  }

  // PraxQL responde 200 con { error: {...} } cuando la mutacion es rechazada:
  // el status por si solo no dice si funciono.
  const conError = datos as { error?: unknown } | null;
  if (conError?.error) {
    throw new ErrorPraxsuite(mensajeDeError(datos, 'La operación fue rechazada.'));
  }

  return datos;
}

export interface Filtro {
  field: string;
  op: string;
  value?: unknown;
}

/** Consulta PraxQL de solo lectura. */
export async function consultar<T = Record<string, unknown>>(
  tablaId: string,
  consulta: {
    select?: string[];
    where?: Filtro[];
    orderBy?: { field: string; dir: 'asc' | 'desc' }[];
    limit?: number;
  },
  token?: string,
): Promise<T[]> {
  const datos = (await post(
    CONFIG.queryUrl,
    { refs: { t: tablaId }, query: { from: 't', ...consulta } },
    token,
  )) as { data?: T[]; rows?: T[] } | T[] | null;

  if (Array.isArray(datos)) return datos;
  return datos?.data ?? datos?.rows ?? [];
}

export function peticionAuth(ruta: 'login' | 'register', cuerpo: unknown) {
  return post(`${CONFIG.authUrl}/${ruta}`, cuerpo);
}

/** Mutacion PraxQL con el JWT del usuario. La identidad la estampa el gateway. */
export async function insertar(
  tablaId: string,
  filas: Record<string, unknown>[],
  token: string,
) {
  return post(
    CONFIG.queryUrl,
    {
      refs: { t: tablaId },
      mutation: { type: 'insert', table: 't', values: filas, returning: false },
    },
    token,
  );
}

/**
 * Llama a un Endpoint sync.
 *
 * OJO: estos endpoints responden HTTP 200 aunque falle un paso interno, con
 * { error } en el cuerpo. Verificar el status no basta.
 */
export async function llamarEndpoint(url: string, cuerpo: unknown) {
  // post() ya lanza si el cuerpo trae `error`, que es como fallan estos
  // endpoints: HTTP 200 con el error adentro.
  return post(url, cuerpo);
}
