/**
 * Configuracion de Praxsuite.
 *
 * La clave pk_live_ es la mitad PUBLICA de una credencial y va embebida en el
 * bundle a proposito: es de solo lectura y solo sobre LSCh_Ranking y
 * LSCh_Contenidos, que es lo unico publico de la app. No da acceso a Perfiles,
 * Sesiones ni Intentos.
 *
 * La mitad secreta (sk_live_) NO existe en este repositorio y no debe existir
 * nunca: un bundle estatico es codigo publico.
 */
const WORKSPACE = 'e0efff61-b451-46de-8dcf-e2fa8634d20a';
const GATEWAY = `https://gateway.praxsuite.com/${WORKSPACE}`;

export const CONFIG = {
  workspace: WORKSPACE,
  queryUrl: `${GATEWAY}/query`,
  authUrl: `${GATEWAY}/auth`,
  /**
   * Endpoint sync que recalcula el ranking. NO recibe datos, solo el token:
   * lee las sesiones desde la base y deriva el ranking de ahi. No hay payload
   * que falsificar.
   */
  cerrarSesionUrl: `${GATEWAY}/endpoint/77c6b447-23a7-4cb3-b3b0-3c9a681396ee`,
  /** El hub: el perfil y los logros viven alla, compartidos entre apps. */
  portafolioUrl: 'https://mirkowo.praxsuite.app/index.html#/perfil',
  /** Perfil propio del end-user. Self-service con el JWT: no necesita admin. */
  perfilUrl: `${GATEWAY}/profile/me`,
  clavePublica:
    'pk_live_316911b6e9e4d4b84d94c7625a2aed20dae5f04895560f52f3b521ac95b75158',
  tablas: {
    perfiles: 'bd780485-1bfa-4806-a596-7a982d9fa25e',
    sesiones: '2a96f474-a695-4b11-bbfa-44748facc7f7',
    intentos: '679512be-a7e6-4977-b90f-d9d03610c4ab',
    ranking: 'e087b5ea-b7ed-46fa-a358-7c78bc74c5b0',
    contenidos: '166d1e91-cd84-4284-951f-a5eabd3e0c56',
  },
  /** Version del motor, se guarda con cada intento para poder comparar epocas. */
  modeloVersion: 'yolov9t-320-recorte-v1',
} as const;
