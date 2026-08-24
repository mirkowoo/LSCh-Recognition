/**
 * Manejo de datos.
 *
 * Existe porque la app pide cuenta y usa la camara — las dos cosas obligan a
 * decir que pasa con lo que entra. Lo de la camara no es un formalismo: es lo
 * primero que alguien se pregunta antes de encenderla, y la respuesta es buena,
 * asi que va arriba de todo.
 *
 * Lo que dice esta pagina esta contrastado contra el codigo, no redactado de
 * memoria. Si cambia lo que se guarda, cambia aca: la lista de columnas sale de
 * praxsuite/persistencia.ts.
 */

/** Correo de contacto para bajas y consultas de datos. */
const CORREO = 'marcosfranichevicmuixi@gmail.com';

interface Props {
  onVolver: () => void;
}

export function Datos({ onVolver }: Props) {
  return (
    <div className="datos">
      <button className="datos-volver" onClick={onVolver}>
        ← Volver
      </button>

      <header className="datos-intro">
        <h1>Manejo de datos</h1>
        <p className="datos-fecha">Última actualización: 24 de agosto de 2026</p>
        <p className="datos-entrada">
          Esta aplicación usa tu cámara y, si quieres guardar resultados, una
          cuenta. Esto es todo lo que pasa con ambas cosas.
        </p>
      </header>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_la_camara_</h2>
        <p>
          <b>El video no sale de tu dispositivo.</b> El reconocimiento corre
          dentro de tu navegador: el modelo se descarga y analiza las imágenes
          ahí mismo. No se sube ninguna imagen, no se graba nada y no queda
          ningún archivo — ni en tu equipo ni en ningún servidor.
        </p>
        <p>
          Lo único que viaja son los resultados: qué letra intentaste y cómo te
          fue. Y solo si tienes sesión iniciada y estás rindiendo la evaluación.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_practicar_sin_cuenta_</h2>
        <p>
          La práctica libre no guarda nada. Ni la letra, ni el puntaje, ni que
          estuviste. Puedes usarla todo lo que quieras sin dejar rastro.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_la_cuenta_</h2>
        <p>
          Se piden <b>correo y contraseña</b>. La contraseña no pasa por esta
          aplicación: la gestiona Praxsuite, el servicio donde está alojado
          todo. El nombre y la foto que ves en la cabecera vienen de tu perfil,
          que vive en la cuenta.
        </p>
        <p>
          La cuenta es del <b>espacio de trabajo</b>, no solo de esta
          aplicación: las mismas credenciales sirven en el portafolio, y los
          logros son los mismos en las dos.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_lo_que_se_guarda_</h2>
        <p>Al terminar una evaluación se guarda, ligado a tu cuenta:</p>
        <ul>
          <li>
            De la sesión: cuándo empezó y terminó, la nota, el puntaje
            promedio, cuántas letras se evaluaron y cuántas lograste, y la
            versión del modelo que la evaluó.
          </li>
          <li>
            De cada letra: si la lograste, la confianza media que reportó el
            modelo, la estabilidad, los segundos que tardaste, el umbral, el
            puntaje, los fotogramas por segundo y una etiqueta de navegador y
            sistema — del estilo <i>Chrome/Windows</i>. Nada más específico que
            eso: no se identifica el equipo.
          </li>
        </ul>
        <p>
          Se guardan las señales crudas además del puntaje ya calculado para
          poder <b>recalcular la fórmula sobre el histórico</b> si mañana cambia,
          sin tener que pedirte que repitas la evaluación.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_el_ranking_</h2>
        <p>
          El ranking todavía no está a la vista en la aplicación. Cuando lo
          esté, va a mostrar tu nombre visible y tu mejor nota, y{' '}
          <b>solo si lo activas</b> desde tu perfil. Nunca aparece nadie por
          defecto.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_en_tu_navegador_</h2>
        <p>
          Queda tu <b>token de sesión</b> en el almacenamiento local mientras
          estés conectado. Se borra al desconectarte o al limpiar los datos del
          sitio. No hay analítica ni cookies de terceros.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_registros_tecnicos_</h2>
        <p>
          El servicio que atiende las peticiones guarda un registro de llamadas
          a la API que incluye la dirección IP de origen y, si hay sesión, el
          correo de la cuenta. Sirve para diagnosticar fallas y no se controla
          desde la aplicación: es del alojamiento.
        </p>
      </section>

      <section className="datos-bloque">
        <h2 className="datos-titulo">//_borrar_tus_datos_</h2>
        <p>
          Escribe a <a href={`mailto:${CORREO}`}>{CORREO}</a> y se borran la
          cuenta y todo lo asociado: sesiones, intentos, logros y perfil. Sin
          trámite y sin preguntas.
        </p>
      </section>
    </div>
  );
}
