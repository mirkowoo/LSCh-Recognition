/**
 * Sesion de usuario final contra Praxsuite Auth.
 *
 * Las cuentas son del workspace, no de esta app: quien ya tenga cuenta en otra
 * app del mismo workspace entra aca con las mismas credenciales.
 *
 * Portado del Portfolio, que ya resolvio dos cosas no obvias:
 *
 * 1. La forma de la respuesta de /auth NO esta garantizada entre versiones del
 *    gateway (accessToken vs access_token vs token, user vs profile). Se
 *    normaliza en un solo lugar para que el resto del codigo no se entere.
 * 2. El id de usuario se lee del claim `sub` del JWT y no del cuerpo de la
 *    respuesta, porque `sub` es lo que el servidor va a resolver como
 *    endUserId al validar el token. Si se usara el del cuerpo, el cliente
 *    creeria una identidad y el servidor escribiria otra.
 */
import { ErrorPraxsuite, peticionAuth } from './api';
import { CONFIG } from './config';

const CLAVE_ALMACEN = 'lsch.sesion';

export interface Usuario {
  id: string | null;
  email: string | null;
  username: string | null;
  nombre: string | null;
  apellido: string | null;
}

export interface Sesion {
  accessToken: string;
  refreshToken: string | null;
  usuario: Usuario;
}

interface Claims {
  sub?: string;
  nameid?: string;
  email?: string;
  unique_name?: string;
  exp?: number;
  [k: string]: unknown;
}

/**
 * Lee los claims del JWT SIN verificarlo. No autoriza nada: solo sirve para
 * saber que identidad va a resolver el servidor y cuando expira el token.
 */
function leerClaims(token: string): Claims {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(
      new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0))),
    );
  } catch {
    return {};
  }
}

function idDesde(claims: Claims, bruto: Record<string, unknown>): string | null {
  return (
    claims.sub ||
    claims.nameid ||
    (claims[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    ] as string | undefined) ||
    (bruto.id as string) ||
    (bruto.userId as string) ||
    null
  );
}

function normalizar(payload: unknown): Sesion | null {
  const d = ((payload as { data?: unknown })?.data ?? payload ?? {}) as Record<
    string,
    unknown
  >;
  const accessToken = (d.accessToken || d.access_token || d.token) as
    | string
    | undefined;
  if (!accessToken) return null;

  const bruto = ((d.user || d.profile || {}) as Record<string, unknown>) ?? {};
  const claims = leerClaims(accessToken);

  return {
    accessToken,
    refreshToken: ((d.refreshToken || d.refresh_token) as string) || null,
    usuario: {
      id: idDesde(claims, bruto),
      email: (bruto.email as string) || (d.email as string) || claims.email || null,
      username: (bruto.username as string) || claims.unique_name || null,
      nombre: ((bruto.firstName || bruto.first_name) as string) || null,
      apellido: ((bruto.lastName || bruto.last_name) as string) || null,
    },
  };
}

let sesion: Sesion | null = null;
const oyentes = new Set<(s: Sesion | null) => void>();

function cargar(): Sesion | null {
  try {
    sesion = JSON.parse(localStorage.getItem(CLAVE_ALMACEN) || 'null');
  } catch {
    sesion = null;
  }
  // Un token vencido guardado en localStorage no es una sesion.
  if (sesion && expirada()) sesion = null;
  return sesion;
}

function guardar(siguiente: Sesion | null) {
  sesion = siguiente;
  if (siguiente) {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(siguiente));
  } else {
    localStorage.removeItem(CLAVE_ALMACEN);
  }
  programarRelojes();
  oyentes.forEach((fn) => fn(sesion));
}

/** Margen contra el `exp` real: 30 s antes ya se considera vencida. */
const MARGEN_MS = 30_000;

/** Cuanto antes del vencimiento se avisa. */
const AVISO_MS = 5 * 60_000;

/** La expiracion sale del claim `exp`, que es el mismo valor que revisa el servidor. */
export function expirada(): boolean {
  const ms = msHastaVencer();
  return ms !== null && ms <= 0;
}

/**
 * Milisegundos hasta que la sesion deje de servir, o null si no hay sesion o el
 * token no declara `exp`.
 */
export function msHastaVencer(): number | null {
  const token = sesion?.accessToken;
  if (!token) return null;
  const exp = leerClaims(token).exp;
  if (!exp) return null;
  return exp * 1000 - MARGEN_MS - Date.now();
}

export type EstadoSesion = 'sin-sesion' | 'activa' | 'por-vencer' | 'vencida';

/**
 * El estado que le importa a la interfaz.
 *
 * 'vencida' NO es lo mismo que 'sin-sesion': la sesion sigue en memoria, con el
 * correo de quien estaba conectado, para poder ofrecer volver a entrar sin
 * escribirlo de nuevo — y sobre todo sin echar a nadie de la pantalla en la que
 * estaba. Una evaluacion a medias se pierde entera si se cierra la sesion.
 */
export function estadoSesion(): EstadoSesion {
  if (!sesion?.accessToken) return 'sin-sesion';
  const ms = msHastaVencer();
  if (ms === null) return 'activa';
  if (ms <= 0) return 'vencida';
  return ms <= AVISO_MS ? 'por-vencer' : 'activa';
}

// ---------------------------------------------------------------------------
// AVISO DE VENCIMIENTO
//
// El problema que resuelve: `expirada()` solo se consultaba al renderizar, y
// nada provocaba un render cuando el token moria. La sesion se apagaba en
// silencio — la cabecera seguia mostrando el nombre, y el usuario se enteraba
// al terminar la evaluacion, que es el peor momento posible para enterarse.
//
// Dos relojes: uno cinco minutos antes (para poder reconectarse a tiempo) y
// otro al vencer. Ambos solo NOTIFICAN; no borran nada.
// ---------------------------------------------------------------------------

let relojes: ReturnType<typeof setTimeout>[] = [];

function pararRelojes() {
  relojes.forEach(clearTimeout);
  relojes = [];
}

function avisar() {
  oyentes.forEach((fn) => fn(sesion));
}

function programarRelojes() {
  pararRelojes();
  const ms = msHastaVencer();
  if (ms === null || ms <= 0) return;
  if (ms > AVISO_MS) relojes.push(setTimeout(avisar, ms - AVISO_MS));
  relojes.push(setTimeout(avisar, ms));
}

// Un setTimeout no es fiable si el equipo se suspende: puede disparar tarde o
// no disparar. Volver a la pestana es justo cuando hay que recalcular, y es el
// caso mas comun de todos — dejar el navegador abierto y volver al otro dia.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') avisar();
  });
}

export function obtenerSesion(): Sesion | null {
  return sesion;
}

export function obtenerToken(): string | null {
  return sesion?.accessToken ?? null;
}

export function haySesion(): boolean {
  return Boolean(sesion?.accessToken) && !expirada();
}

export function nombreVisible(): string {
  const u = sesion?.usuario;
  if (!u) return '';
  const completo = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  return u.username || completo || u.email || 'Usuario';
}

export function alCambiar(fn: (s: Sesion | null) => void): () => void {
  oyentes.add(fn);
  fn(sesion);
  return () => oyentes.delete(fn);
}

export async function entrar(email: string, contrasena: string): Promise<Sesion> {
  const payload = await peticionAuth('login', { email, password: contrasena });
  const s = normalizar(payload);
  if (!s) {
    throw new ErrorPraxsuite(
      (payload as { message?: string })?.message ||
        'No se pudo iniciar sesión. Revisa el correo y la contraseña.',
    );
  }
  guardar(s);
  return s;
}

export interface DatosRegistro {
  email: string;
  contrasena: string;
  username?: string;
  nombre?: string;
  apellido?: string;
}

/**
 * Devuelve null cuando el workspace exige confirmar el correo: en ese caso el
 * registro fue exitoso pero todavia no hay tokens.
 */
export async function registrar(d: DatosRegistro): Promise<Sesion | null> {
  const payload = await peticionAuth('register', {
    email: d.email,
    password: d.contrasena,
    username: d.username || undefined,
    first_name: d.nombre || undefined,
    last_name: d.apellido || undefined,
  });
  const s = normalizar(payload);
  if (s) guardar(s);
  return s;
}

export function salir() {
  guardar(null);
}

cargar();
// Al arrancar con una sesion viva hay que armar los relojes: cargar() escribe
// `sesion` directo, sin pasar por guardar().
programarRelojes();

/** Perfil propio del end-user, tal como lo devuelve GET /profile/me. */
export interface PerfilPropio {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  settings: Record<string, unknown>;
}

/**
 * Lee el perfil propio.
 *
 * Es self-service: se autentica con el JWT del usuario, sin credenciales de
 * admin. El perfil vive en la cuenta del workspace, no en una tabla, asi que es
 * el mismo en todas las apps.
 */
export async function perfilPropio(): Promise<PerfilPropio | null> {
  const token = obtenerToken();
  if (!token) return null;
  try {
    const r = await fetch(CONFIG.perfilUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as PerfilPropio;
  } catch {
    // El perfil es decorativo aca: si falla, la app sigue con el nombre del JWT.
    return null;
  }
}
