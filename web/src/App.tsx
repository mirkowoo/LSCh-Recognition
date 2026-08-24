/**
 * Cascaron de la aplicacion.
 *
 * El perfil no se edita aca: vive en el portafolio, que es el hub del workspace.
 * Esta app solo lo lee para mostrar nombre y foto en la cabecera.
 */
import { useCallback, useEffect, useState } from 'react';
import { Practica } from './vistas/Practica';
import { Evaluacion } from './vistas/Evaluacion';
import { Portal } from './vistas/Portal';
import { MenuUsuario } from './vistas/MenuUsuario';
import { AvisoSesion } from './vistas/AvisoSesion';
import { Datos } from './vistas/Datos';
import { ABECEDARIO, LETRAS_DINAMICAS } from './puntaje';
import {
  alCambiar,
  estadoSesion,
  haySesion,
  msHastaVencer,
  nombreVisible,
  obtenerSesion,
  perfilPropio,
  salir,
} from './praxsuite/auth';
import type { PerfilPropio } from './praxsuite/auth';

type Vista = 'practica' | 'evaluacion';

export function App() {
  // Un contador, no la sesión: el objeto de sesión no cambia de identidad
  // cuando el token vence — vence el reloj, no el objeto — y React se saltaría
  // el render si se guardara la misma referencia.
  const [, setLatido] = useState(0);
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [invitado, setInvitado] = useState(false);
  const [vista, setVista] = useState<Vista>('practica');
  const [letraLibre, setLetraLibre] = useState('A');
  const [datos, setDatos] = useState(false);

  useEffect(() => alCambiar(() => setLatido((n) => n + 1)), []);

  const estado = estadoSesion();
  const identificado = haySesion();
  // Hay cuenta aunque el token ya no sirva: seguimos sabiendo quién es.
  const hayCuenta = estado !== 'sin-sesion';

  // El perfil se lee una vez por sesión: nombre y foto para la cabecera.
  useEffect(() => {
    if (!identificado) {
      setPerfil(null);
      return;
    }
    let vivo = true;
    perfilPropio().then((p) => {
      if (vivo) setPerfil(p);
    });
    return () => {
      vivo = false;
    };
  }, [identificado]);

  // Los relojes de auth.ts avisan en dos instantes puntuales; entre medio el
  // contador de minutos se quedaría congelado. Mientras está por vencer se
  // refresca cada 30 s — y de paso, si un reloj no dispara porque el equipo
  // estuvo suspendido, este intervalo hace la transición igual.
  useEffect(() => {
    if (estado !== 'por-vencer') return;
    const id = setInterval(() => setLatido((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [estado]);

  const cerrar = useCallback(() => {
    salir();
    setPerfil(null);
    setInvitado(false);
    setVista('practica');
  }, []);

  if (datos) {
    return (
      <div className="envoltorio">
        <Datos onVolver={() => setDatos(false)} />
      </div>
    );
  }

  // Ojo con la condición: se mira `hayCuenta`, no `identificado`. Con el token
  // vencido seguimos dentro de la app — mandar al portal cerraría la práctica o
  // la evaluación en curso, que es justo lo que no hay que hacerle a alguien
  // que ya lleva media hora acá. El aviso de abajo se encarga.
  if (!hayCuenta && !invitado) {
    return (
      <div className="envoltorio">
        <Portal
          onEntrar={() => setInvitado(false)}
          onInvitado={() => setInvitado(true)}
          onDatos={() => setDatos(true)}
        />
      </div>
    );
  }

  const nombre = perfil?.username || nombreVisible();
  const correo = perfil?.email || obtenerSesion()?.usuario.email || null;

  return (
    <div className="envoltorio">
      <header className="cabecera">
        <nav className="nav">
          <button
            className={vista === 'practica' ? 'activo' : ''}
            onClick={() => setVista('practica')}
          >
            Práctica libre
          </button>
          <button
            className={vista === 'evaluacion' ? 'activo' : ''}
            onClick={() => setVista('evaluacion')}
            disabled={!identificado}
            title={
              identificado
                ? undefined
                : 'La evaluación necesita una cuenta para guardar el resultado'
            }
          >
            Evaluación
          </button>
        </nav>

        <div className="cabecera-sesion">
          {hayCuenta ? (
            <MenuUsuario
              nombre={nombre}
              email={correo}
              avatarUrl={perfil?.profileImageUrl || null}
              onSalir={cerrar}
            />
          ) : (
            <>
              <span className="detalle">Invitado</span>
              <button onClick={() => setInvitado(false)}>Iniciar sesión</button>
            </>
          )}
        </div>
      </header>

      {(estado === 'por-vencer' || estado === 'vencida') && (
        <AvisoSesion
          estado={estado}
          email={correo}
          minutos={Math.max(1, Math.ceil((msHastaVencer() ?? 0) / 60_000))}
          onSalir={cerrar}
        />
      )}

      {vista === 'practica' && (
        <>
          {/* Rejilla en vez de <select>: en el telefono el desplegable nativo
              tapa la camara entera y hay que cerrarlo para ver si acertaste la
              letra. Aca el objetivo se cambia de un toque, sin ocultar nada. */}
          <div className="barra">
            <div className="barra-titulo">Letra objetivo</div>

            <div className="letras" role="group" aria-label="Elegir letra">
              {ABECEDARIO.map((l) => {
                const dinamica = LETRAS_DINAMICAS.includes(
                  l as (typeof LETRAS_DINAMICAS)[number],
                );
                return (
                  <button
                    key={l}
                    className={`letra-chip${l === letraLibre ? ' activo' : ''}`}
                    disabled={dinamica}
                    aria-pressed={l === letraLibre}
                    title={
                      dinamica
                        ? 'Lleva movimiento: todavía no se evalúa'
                        : undefined
                    }
                    onClick={() => setLetraLibre(l)}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            <span className="detalle">
              Las atenuadas llevan movimiento y todavía no se evalúan. Sin nota ni
              registro: practica lo que quieras, las veces que quieras.
            </span>
          </div>
          <Practica letra={letraLibre} />
        </>
      )}

      {/* `hayCuenta`, no `identificado`: si el token vence a mitad del
          recorrido, desmontar Evaluacion tiraría las letras ya hechas. Se deja
          montada; guardarSesion fallará al final y ahí queda el botón de
          reintentar, que sirve porque el aviso de arriba permite reconectarse
          sin moverse de la pantalla. */}
      {vista === 'evaluacion' && hayCuenta && <Evaluacion />}

      <footer className="pie-sitio">
        <button className="enlace" onClick={() => setDatos(true)}>
          Manejo de datos
        </button>
      </footer>
    </div>
  );
}
