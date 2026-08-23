# LSCh — Empaquetado del modelo actual y app web en Praxsuite

**Etapa:** anterior al cambio de paradigma a landmarks.
**Objetivo:** sacar el YOLOv9-t que ya existe del escritorio con GPU y ponerlo a correr dentro del navegador, sobre una app web con login, evaluación del abecedario completo, persistencia de resultados y leaderboard.
**Fecha:** agosto 2026
**Documento previo:** `LSCh_contexto_completo.md` (investigación completa y hoja de ruta larga)

---

## Índice

1. [La idea, ampliada](#1-la-idea-ampliada)
2. [Alcance de esta etapa](#2-alcance-de-esta-etapa)
3. [Cuatro advertencias antes de escribir código](#3-cuatro-advertencias-antes-de-escribir-código)
4. [Parte A — Empaquetado del modelo](#parte-a--empaquetado-del-modelo)
5. [Parte B — La aplicación web](#parte-b--la-aplicación-web)
6. [Parte C — Praxsuite: datos, auth y despliegue](#parte-c--praxsuite-datos-auth-y-despliegue)
7. [Parte D — Orden de trabajo](#parte-d--orden-de-trabajo)
8. [Cosas a verificar antes de comprometerse](#8-cosas-a-verificar-antes-de-comprometerse)
9. [Decisiones abiertas](#9-decisiones-abiertas)
10. [Cómo encaja con el cambio a landmarks](#10-cómo-encaja-con-el-cambio-a-landmarks)

---

## 1. La idea, ampliada

La aplicación de escritorio se convierte en un **producto web público**, hosteado en Praxsuite, con tres capas:

### Capa 1 — Práctica evaluada (el corazón)

El usuario entra con su cuenta, activa la cámara y la app lo hace pasar por **todo el abecedario dactilológico**, letra por letra. Por cada letra:

- Se le muestra la letra objetivo y una referencia visual.
- Debe sostener la seña hasta completar la ventana de retención (el mismo mecanismo de los 5 segundos con la letra que pasa de rojo a verde que ya existe en PyQt5).
- Se registra **cuán bien y cuán rápido** lo logró.
- Al terminar el recorrido completo se genera una **nota** (escala 1,0–7,0) y una **sesión** queda guardada en la base de datos.

El modelo corre **100% en el navegador del usuario**. El video nunca sale del dispositivo: a la base de datos solo viajan números.

### Capa 2 — Leaderboard

En la pantalla principal, un ranking con las mejores notas. No es solo gamificación: es el mecanismo que hace que la gente repita el recorrido, que es exactamente lo que produce datos de uso reales y variados — el insumo que hoy más falta.

### Capa 3 — Contenido editorial

Textos con enlaces a:

- El **diccionario de LSCh** y recursos de Fundación LSCh / Señas Chile.
- La explicación de **cómo se hizo la investigación**: el trabajo de tesis, la comparación YOLOv5 vs YOLOv9, el benchmark de CPU, por qué se pasa a landmarks. Contado en lenguaje divulgativo.
- Contexto sobre la Ley 21.303 y la comunidad Sorda chilena.

Esta capa es la que convierte el proyecto de "una demo técnica" en algo citable y compartible. Es también la más barata de construir.

### Por qué este orden y no el cambio de modelo primero

Porque el empaquetado web **es reusable tal cual** cuando llegue el motor de landmarks. La UI, el login, las tablas, el sistema de puntaje, el leaderboard y el contenido no cambian: lo único que se reemplaza después es la caja que recibe un frame y devuelve una letra con un puntaje. Construir esa infraestructura ahora no es trabajo botado — es el andamiaje del proyecto final, y además deja algo funcionando y mostrable en semanas en vez de meses.

---

## 2. Alcance de esta etapa

**Sí entra:**

- Exportar `models/best.pt` (YOLOv9-t, 26 clases) a ONNX y validarlo a 320 px.
- Reimplementar el pre y postprocesado en JavaScript.
- App web React con login, cámara, recorrido del abecedario, puntaje y nota.
- Tablas en Praxsuite, escritura de resultados, leaderboard.
- Páginas de contenido con los enlaces y textos.
- Despliegue en un subdominio `*.praxsuite.app`.

**No entra (queda para después):**

- Reentrenar el modelo.
- MediaPipe / landmarks / modelo temporal.
- Señas con movimiento (palabras).
- Corpus LSCh propio.
- App móvil nativa.

**Explícitamente pendiente y no resuelto por esta etapa:** el modelo sigue entrenado sobre un dataset derivado de ASL. Esta etapa mejora el *despliegue*, no la *validez lingüística*. Ver advertencia 1.

---

## 3. Cuatro advertencias antes de escribir código

Estas cuatro cosas hay que decidirlas ahora, no cuando aparezcan a mitad de camino.

### 3.1 "Porcentaje de similitud" no es lo que el modelo entrega

El modelo entrega **confianza de detección**: qué tan seguro está de que lo que ve es la clase A. Eso no es "qué tan parecida es tu seña a una A correcta". Una confianza de 0,97 puede venir de una seña mal ejecutada que el modelo asocia por sesgo de fondo o de encuadre; y una seña perfecta con luz rara puede dar 0,55.

La app de escritorio ya comete este error: `save_precision()` guarda la confianza del detector y la llama "progreso del estudiante".

**Qué hacer:** no propagar el error a la base de datos. Guardar la señal cruda con el nombre que le corresponde (`ConfianzaMedia`) y **derivar** de ahí un puntaje pedagógico que combine varias cosas (§B.5). Así:

- La base de datos guarda hechos, no interpretaciones.
- Si mañana cambia la fórmula del puntaje, se recalcula sobre los datos históricos sin volver a pedirle a nadie que grabe nada.
- Cuando llegue el modelo de landmarks, se pueden comparar las dos épocas honestamente.

En la interfaz sí se le puede llamar "similitud" al usuario — es lenguaje de producto, y ahí está bien. En el esquema de datos y en cualquier cosa que se escriba académicamente, no.

### 3.2 Seis letras llevan movimiento, no dos

> **Corregido con evidencia.** Este apartado decía «J y Z». Al conectar las ilustraciones de referencia (`img/*.png` del repositorio original) resultó que **seis** traen marca de movimiento dibujada.

| Letra | Marca en la ilustración |
|---|---|
| G | flecha circular |
| H | flecha lateral → |
| J | trazo en gancho |
| S | espiral |
| X | flecha diagonal doble |
| Z | trazo en Z |

Las otras veinte no tienen ninguna marca.

**Por qué importa más de lo que parece.** El dataset *sí* tiene ejemplos de las seis — el modelo las reconoce con el mismo mAP que el resto. Pero las capturó **congeladas en un instante**. Así que la app le mostraría al usuario una ilustración que le pide moverse, mientras el modelo espera una pose quieta. El usuario haría el movimiento, el modelo no reconocería nada, y la letra sería imposible de lograr sin que nadie entienda por qué.

**Decisión:** las seis quedan deshabilitadas y se muestran solo como referencia. La nota se calcula sobre **20 letras**. Revertirlo es sacar letras de `LETRAS_DINAMICAS` en `web/src/puntaje.ts`.

**La alternativa que no tomé,** por si conviene reconsiderarla: incluirlas con la instrucción «sostén la posición inicial». Se ganan cuatro letras de práctica a cambio de enseñar media seña. Me pareció peor, pero es discutible y el cambio es de una línea.

### 3.2b El abecedario del modelo tiene 26 clases A–Z, sin Ñ

El dataset de Roboflow tiene 26 clases (A-Z), heredadas del alfabeto ASL. El alfabeto español tiene 27 letras. **La Ñ no existe en el modelo**, y tampoco hay ilustración de referencia para ella. Queda para cuando exista corpus propio.

### 3.2c Las ilustraciones sí coinciden con el dataset

Se comparó cada una de las 26 ilustraciones contra ejemplos reales del set de entrenamiento, recortados por su caja. **Las formas de mano concuerdan.** Incluidas las que parecían sospechosas a primera vista: la Q ilustra el índice apuntando al mentón y el dataset muestra exactamente eso.

Es un resultado que valía la pena verificar y no dar por hecho: si la referencia enseñara una forma y el modelo esperara otra, esa letra sería inalcanzable por diseño y el síntoma —«esta letra nunca me la reconoce»— no apuntaría a la causa.

Lo único que no concuerda es la **dimensión temporal**, que es de lo que trata §3.2.

### 3.3 El espejo de la cámara

> **Actualizado tras recuperar el dataset:** los metadatos de Roboflow confirman que el aumento de datos incluyó **volteo horizontal**. El modelo vio manos de ambas lateralidades durante el entrenamiento, así que el riesgo descrito abajo es mucho menor de lo que parecía. Sigue valiendo la pena confirmarlo con la cámara, pero ya no es un riesgo de diseño.

`getUserMedia` entrega el video sin espejar, pero **todas las apps de cámara lo muestran espejado** porque es lo natural para el usuario.

**Qué hacer:** espejar **solo la visualización** (`transform: scaleX(-1)` en el `<video>`) y darle al modelo el frame original. No porque el modelo vaya a fallar si se espeja —ya sabemos que no debería— sino porque es una variable menos entre lo que se entrena y lo que se ejecuta, y no cuesta nada mantenerla fija.

**Lo que sí quedó abierto y es más importante:** cómo llevar un frame 16:9 a una entrada cuadrada. Ver el final de §A.0.

### 3.4 El detector siempre detecta algo

No hay clase "fondo" ni "sin seña". Sin un umbral explícito, el modelo va a reportar letras cuando no haya ninguna mano en cuadro.

**Qué hacer:** umbral de confianza τ calibrado (empezar en 0,50 y ajustar con pruebas reales) y un estado explícito **"no se detecta seña"** en la UI. Esto ya estaba pendiente en la app de escritorio.

---

# Parte A — Empaquetado del modelo

## A.0 Estado: lo que ya está hecho y medido

**Export completado el 17-08-2026.** Entorno: Windows 11, Python 3.14.5, torch 2.13.0+cpu, ultralytics 8.4.121, onnx 1.22.0, onnxruntime 1.28.0. CPU: AMD Ryzen 7 5700X (8 núcleos).

| Archivo | Resolución | Tamaño | Forma de salida | Latencia mediana | FPS | GFLOPs |
|---|---:|---:|---|---:|---:|---:|
| `models/best-320.onnx` | 320 | **7,80 MB** | `[1, 30, 2100]` | **12,9 ms** | 77,5 | 1,9 |
| `models/best-640.onnx` | 640 | 7,92 MB | `[1, 30, 8400]` | 43,7 ms | 22,9 | 7,6 |

Además se generó `models/clases.json` con el orden de clases y los parámetros de pre/postprocesado que necesita el frontend.

**Lo que confirman estos números:**

- **La forma de salida es la esperada:** `4 + 26 = 30` filas, y 2100 anchors a 320 px (40²+20²+10²). El postprocesado descrito en §A.3 es correcto tal como está escrito.
- **El orden de clases es alfabético simple, A–Z.** Índice 0 = A, índice 25 = Z. Sin sorpresas de reordenamiento.
- **Bajar de 640 a 320 da 3,4× de velocidad** (12,9 vs 43,7 ms), muy cerca del 3,8× estimado. Los GFLOPs bajan exactamente 4× (7,6 → 1,9), confirmando el argumento del área.
- **El tamaño casi no cambia entre resoluciones** (7,80 vs 7,92 MB) porque los pesos son los mismos. La resolución afecta al cómputo, no al archivo.
- **7,80 MB es menos de lo estimado** (esperaba ~8,2 MB): onnxslim recortó algo. Esto deja el modelo justo por debajo del tope de 8 MB del deploy inline, lo que hace más viable la opción 2 de §A.5.

**Advertencia sobre estas latencias:** están medidas con ruido aleatorio como entrada, sobre un Ryzen 7 de 8 núcleos, en ONNX Runtime nativo. Sirven para comparar 320 contra 640 y para confirmar que el grafo funciona. **No predicen el rendimiento en el navegador**, que es WASM, monohilo en el peor caso, y en equipos bastante más modestos. La medición que importa sigue pendiente (§A.4).

### Validación de resolución — **resuelta**

El dataset se recuperó desde el workspace propio de Roboflow (`entrenamiento-lsch/senas-de-lsch`, **v5** — train 2322 / valid 223 / test 115, que coincide con lo reportado en la tesis). Validación sobre el **split de test**, 115 imágenes:

| Resolución | mAP50 | mAP50-95 | P | R | Δ mAP50 vs 640 | Clases bajo 0,99 |
|---:|---:|---:|---:|---:|---:|---|
| 640 | 0,9950 | 0,8150 | 0,9641 | 0,9834 | — | ninguna |
| 512 | 0,9950 | 0,8194 | 0,9753 | 0,9889 | 0,0000 | ninguna |
| 416 | 0,9915 | 0,8223 | 0,9743 | 0,9737 | −0,0035 | E (0,905) |
| **320** | **0,9915** | **0,8019** | **0,9542** | **0,9471** | **−0,0035** | E (0,905) |
| 256 | 0,9525 | 0,7226 | 0,8692 | 0,8757 | −0,0425 | A, E, M, O, T, U, V, **X (0,555)**, Y |

**Decisión: 320 px queda confirmado.** La caída de mAP50 es de 0,35 puntos porcentuales, muy por debajo del criterio de 2 puntos. A cambio se obtiene el 3,4× de velocidad.

**Dónde está el piso: 256 px.** Ahí el modelo se rompe — nueve clases se degradan y la X se desploma a 0,555. No bajar de 320.

**Lo que sí se pierde a 320:** el recall cae de 0,9834 a 0,9471 (3,6 puntos) y la precisión de 0,9641 a 0,9542. En la práctica eso significa que el modelo pierde la mano en más frames. Para este ejercicio no es grave —la ventana de retención acumula decenas de muestras, no una— pero es el argumento por si en pruebas reales la detección se siente inestable: **416 px cuesta poco más y recupera casi todo el recall** (0,9737), además de dar el mejor mAP50-95 de toda la tabla. Es el plan B natural.

**La letra E es la única que se degrada** (0,995 → 0,905 desde 416 px hacia abajo). Vale la pena mirarla: es una mano cerrada con los dedos doblados sobre el pulgar, o sea justo el caso donde el detalle fino de los dedos importa. Es exactamente el tipo de letra que el enfoque de landmarks debería resolver mejor.

> **Advertencia sobre la fuerza de esta evidencia.** El test tiene 115 imágenes con una instancia cada una: unas 4,4 por clase. Un AP50 por clase es prácticamente binario, y el 0,995 que aparece en casi todas es el techo de la interpolación de Ultralytics, no una medición fina. Lo que estos números soportan con confianza es: **256 degrada de forma clara y 320 no degrada de forma detectable**. No soportan afirmar que 320 sea exactamente igual de bueno que 640. Para el informe hay que decirlo así.

### Medición en navegador — **resuelta**

Medida con el banco integrado en la app (`web/`, botón «Medir latencia»: 100 inferencias con entrada sintética), Chromium sobre el mismo equipo:

| Motor | Mediana | FPS | p90 | min | max |
|---|---:|---:|---:|---:|---:|
| **WebGPU** | **16,2 ms** | **61,7** | 20,5 ms | 12,8 ms | 25,0 ms |

**WebGPU está disponible y se usa sin fallback.** El modelo de 7,8 MB carga sin problemas y ONNX Runtime Web reporta además 4 hilos WASM de respaldo (las cabeceras COOP/COEP del `vite.config.ts` funcionan en desarrollo).

Esto es **1,26× el tiempo nativo** (12,9 ms), no el 2–4× que había estimado para WASM. La estimación pesimista del plan original queda corregida: con WebGPU el navegador casi no cobra peaje.

**Lo que esto no cubre:** un equipo sin WebGPU cae a WASM, que será más lento — cuánto, hay que medirlo en un equipo así. Y las cabeceras COOP/COEP en producción dependen de lo que permita el hosting de Praxsuite (verificación #3, todavía abierta): sin ellas, WASM queda monohilo. El botón de medición quedó en la app justamente para poder repetir esto en cualquier equipo y navegador.

### Encuadre — **resuelto, y con sorpresa**

Medido con la app (`web/`, pestaña Diagnóstico), letra B, 167 muestras, umbral 0,50:

| Encuadre | Acierta | **Detecta mal** | Sin detección |
|---|---:|---:|---:|
| **Recorte central** | **86,2%** | **0%** | 13,8% |
| Stretch | 27,5% | 0% | 72,5% |
| Letterbox | 1,8% | **43,1%** | 55,1% |

**Decisión: recorte central.** Fijado en `ENCUADRE_PRODUCCION` (`web/src/inference/preprocess.ts`).

**Lo importante no es que letterbox pierda, sino cómo pierde.** En el 43% de los frames devolvió *con confianza* una letra equivocada. Recorte y stretch nunca lo hacen: o aciertan o callan. Para un ejercicio de aprendizaje **un falso positivo confiado es el peor modo de falla posible** — le enseña al usuario que hizo bien algo que hizo mal. Y letterbox era justamente lo que este plan especificaba en §A.3 antes de medirlo.

Hipótesis de por qué: el modelo se entrenó con `Stretch to 640x640` sobre imágenes que ya venían recortadas a la mano, y **nunca vio barras grises**. El relleno del letterbox es textura fuera de distribución ocupando casi la mitad del cuadro.

> **Alcance de la medición:** una sola letra (B) y un solo equipo. El margen es tan grande —86,2% contra 1,8%— que la decisión es segura, pero *no* está verificado que el recorte central funcione igual de bien en las 26. Conviene mirar la E durante las pruebas del bucle de práctica, que es la única que se degradaba a 320 px.

### Dos hallazgos del dataset que cambian decisiones del plan

Al recuperar el dataset aparecieron dos cosas en los metadatos de Roboflow que no estaban documentadas en ninguna parte:

**1. El aumento de datos incluyó volteo horizontal** (`flip: horizontal: true`). O sea que **el modelo vio manos de ambas lateralidades durante el entrenamiento**. Esto resuelve la advertencia §3.3: espejar el frame no debería romper nada. Sigue valiendo la pena verificarlo con la cámara, pero deja de ser un riesgo de diseño.

Como nota al margen: el aumento ×3 se aplicó **solo al split de entrenamiento** (774 → 2322 exacto), y valid/test quedaron sin tocar. La sospecha de contaminación por aumento que aparecía en el documento de investigación es infundada. Lo que sí sigue en pie como riesgo es que los 1.105 originales puedan tener frames casi duplicados repartidos entre splits — eso el aumento no lo causa ni lo arregla.

**2. El preprocesado del dataset fue `Stretch to 640x640`, no letterbox.** Las imágenes de entrenamiento están **deformadas**: se estiraron a cuadrado sin conservar la proporción.

Esto tiene una consecuencia incómoda que hay que ver de frente: **todo el set de test también está estirado a cuadrado**. Cuando Ultralytics hace `val()` y aplica letterbox a una imagen que ya es 640×640, el letterbox no hace nada. Es decir, **la validación de arriba no dice absolutamente nada sobre cómo se comporta el modelo con un frame 16:9 de webcam.**

Y ese es justo el caso de la app. Hay tres formas de llevar un frame 16:9 a una entrada cuadrada, y no son equivalentes:

| Forma | Qué hace | A favor / en contra |
|---|---|---|
| **Letterbox** (lo que dice §A.3) | Escala conservando proporción y rellena con gris | Conserva la forma real de la mano, pero mete barras que el modelo nunca vio en entrenamiento |
| **Stretch** | Deforma a cuadrado | Reproduce la distorsión del entrenamiento, pero deforma la mano respecto a como se ve en cámara |
| **Recorte central** | Recorta un cuadrado del centro y lo escala | Sin barras ni deformación, y el usuario tiene la mano al centro de todos modos. Pierde los bordes del cuadro |

**Esto hay que resolverlo empíricamente con la cámara, no razonando.** Mi apuesta es el recorte central —no introduce artefactos de ningún tipo y el encuadre del ejercicio ya es centrado— pero es una apuesta, no un resultado. Es lo primero que hay que medir en el Hito 1, y es más importante que la elección de resolución.

## A.1 Exportar a ONNX

Se necesita el repositorio con `models/best.pt`. Entorno Python con `ultralytics` y `onnx`.

```python
# scripts/export_onnx.py
from ultralytics import YOLO

m = YOLO("models/best.pt")

# Versión de producción — la que va al navegador
m.export(
    format="onnx",
    imgsz=320,
    opset=12,          # amplio soporte en ONNX Runtime Web
    simplify=True,     # requiere onnxsim instalado
    dynamic=False,     # forma fija: más rápido y más portable
    half=False,        # FP16 no aporta en WASM
    nms=False,         # NMS se hace en JS (ver A.3)
)

# Versión de control a 640 — para comparar métricas
m.export(format="onnx", imgsz=640, opset=12, simplify=True, dynamic=False, nms=False)
```

Salida esperada: `models/best.onnx` (~8,2 MB a 320 px según el benchmark ya medido).

**Por qué `nms=False`:** exportar con NMS embebido mete operadores `NonMaxSuppression` y `TopK` en el grafo. Funcionan en el backend WASM pero complican o bloquean WebGPU, y para este caso de uso ni siquiera hacen falta (ver A.3). Mejor mantener el grafo simple.

**Por qué `dynamic=False`:** las formas fijas permiten que ONNX Runtime preasigne buffers y optimice el grafo una sola vez. La entrada siempre va a ser 320×320.

## A.2 Validar 320 px antes de fijarlo

**Esto es un bloqueador.** No se puede asumir que 320 px mantiene la precisión: hay que medirlo contra el set de test.

```python
# scripts/validate_320.py
from ultralytics import YOLO

m = YOLO("models/best.pt")

r640 = m.val(data="data.yaml", split="test", imgsz=640)
r320 = m.val(data="data.yaml", split="test", imgsz=320)

for nombre, r in (("640", r640), ("320", r320)):
    print(nombre, "mAP50:", r.box.map50, "mAP50-95:", r.box.map, "P:", r.box.mp, "R:", r.box.mr)
```

**Criterio de decisión:** si mAP50 a 320 cae menos de ~2 puntos respecto a 640, se fija 320 (3,8× más rápido, ya medido). Si cae más, probar 416 o 512 antes de resignarse a 640.

**Reportar además la métrica por clase.** Interesa especialmente si alguna letra se degrada desproporcionadamente al bajar resolución — sería una letra que se distingue por detalle fino de dedos, información valiosa para la etapa de landmarks.

**Advertencia sobre estas métricas:** el set de test tiene 144 imágenes. Sirve para detectar una degradación grande; no sirve para afirmar que "320 es igual de bueno que 640". Es una decisión de ingeniería con evidencia débil, y así hay que reportarla.

## A.3 Lo que hay que reimplementar en JavaScript

Ultralytics hace en Python todo lo que rodea al modelo. ONNX Runtime solo ejecuta el grafo. Todo lo demás se escribe a mano — es la parte de esta etapa donde se van las horas.

### Preprocesado

```
frame del <video>  →  <canvas> 320×320
   1. letterbox: escala = min(320/w, 320/h), centrar, rellenar con gris 114
   2. leer ImageData (RGBA, 0-255)
   3. convertir a Float32Array NCHW: [1, 3, 320, 320]
   4. normalizar: valor / 255.0
   5. orden de canales RGB (el ImageData ya viene RGBA — descartar A)
```

Errores clásicos acá: usar BGR (eso es OpenCV, no el navegador), olvidar el letterbox y deformar la imagen con un resize simple, o dejar el layout NHWC.

### Postprocesado

La salida de un export Ultralytics de YOLOv9 es un tensor `[1, 4 + 26, N]`:

- `N` = número de anchors. A 320 px: 40²+20²+10² = **2100**.
- Filas 0-3: `cx, cy, w, h` **en píxeles de la entrada de 320**, no normalizados.
- Filas 4-29: puntajes por clase, ya con sigmoide aplicada. **No hay objectness** (la cabeza de v8/v9 no la usa).

```
para cada anchor i:
    score_i = max(salida[4..29, i])
    clase_i = argmax(salida[4..29, i])
tomar el i con score_i máximo global
si score_max < τ  →  estado "sin seña"
si no             →  letra = clase_i, confianza = score_max
```

**Sobre NMS:** aquí solo hay una mano en cuadro y solo interesa la letra, no el rectángulo. Basta con **quedarse con el mejor anchor global** — se salta NMS por completo.

Esto además corrige de raíz lo que hace hoy la app de escritorio. En `modelo/model.py` el caso de varias cajas sí está manejado, pero con un criterio arbitrario: se queda con `detectedClass[0]`, o sea **la primera caja que devuelve Ultralytics, no la de mayor confianza**. Quedarse con el máximo global es más simple y además correcto.

Si más adelante se quiere dibujar el recuadro alrededor de la mano, hay que desletterboxear la caja del mejor anchor:

```
x_original = (cx - pad_x) / escala
y_original = (cy - pad_y) / escala
```

Y agregar NMS solo si en algún momento se quiere detectar dos manos.

## A.4 Elegir y verificar el runtime web

`onnxruntime-web` ofrece varios *execution providers*. En orden de preferencia:

| EP | Cuándo usarlo | Riesgo |
|---|---|---|
| **`webgpu`** | Si el navegador lo soporta. Usa la GPU integrada del usuario, gratis para nosotros | Soporte todavía desigual; hay que tener fallback sí o sí |
| **`wasm` con SIMD** | Fallback universal. Es lo que se midió: ~18 ms a 320 px en 2 vCPU | Ninguno grave |
| **`wasm` multihilo** | Más rápido, pero requiere cabeceras **COOP/COEP** en el servidor | En un sitio estático servido por CDN puede no ser posible fijar esas cabeceras. **Verificar con Praxsuite antes de contar con esto** |

**Plan realista:** intentar `['webgpu', 'wasm']` y aceptar que el caso base es WASM monohilo con SIMD. Los 18 ms medidos en 2 vCPU nativos se van a convertir a algo entre 30 y 70 ms en WASM de navegador. **Aún así son 14–33 FPS de inferencia, de sobra** para un ejercicio que pide sostener la seña varios segundos.

**Antes de construir la app entera, hacer una página de prueba de una sola pantalla** que cargue el modelo, corra 100 inferencias sobre un frame fijo y muestre la latencia mediana. Diez líneas de código que evitan descubrir un problema estructural a las tres semanas.

```js
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('/models/best.onnx', {
  executionProviders: ['webgpu', 'wasm'],
  graphOptimizationLevel: 'all',
});

const input = new ort.Tensor('float32', float32Data, [1, 3, 320, 320]);
const out = await session.run({ [session.inputNames[0]]: input });
```

## A.5 Dónde vive el archivo `.onnx` — hay una restricción real

El modelo pesa ~8,2 MB. Los binarios WASM de ONNX Runtime pesan otros ~10 MB.

Esto **no es un problema de la plataforma**: Praxsuite sirve bundles estáticos de cualquier tamaño razonable. El tope de 8 MB aplica solo al deploy *inline* (el que manda el zip en base64 dentro de la llamada MCP). Para builds más grandes existe la vía de deploy key, sin ese tope.

Tres caminos:

| Opción | Cómo | Contra |
|---|---|---|
| **Deploy key** *(recomendada)* | Generar una deploy key desde la configuración de Deploy de la app en el portal y hacer `POST /api/v1/site-static-deploy/upload` con la cabecera `X-Deploy-Key`. Sin tope de 8 MB. El `.onnx` es un asset estático más | Un paso manual la primera vez para generar la key |
| **WASM desde CDN** | Apuntar `ort.env.wasm.wasmPaths` a jsDelivr y dejar solo el modelo en el bundle. Así el zip queda cerca de 8 MB y *podría* caber inline — pero los pesos FP32 comprimen poco (5-10%), así que el margen es incómodo: **medir antes de contar con ello** | Deja de funcionar offline; dependencia externa |
| **Modelo como blob de Praxsuite** | Subirlo con `upload_file` y cargarlo desde la URL prefirmada | Hay que verificar CORS y la caducidad de la URL prefirmada. **No asumir que funciona sin probarlo** |

Sea cual sea, el `.onnx` conviene servirlo con cache largo e inmutable, y versionar el nombre (`best-v1-320.onnx`) para poder invalidar limpio cuando cambie.

---

# Parte B — La aplicación web

## B.1 Arquitectura

```
Navegador del usuario
├── <video> (getUserMedia)          ← el video nunca sale de aquí
├── Web Worker
│     └── ONNX Runtime Web + best-320.onnx
│           ↑ frames cada N          ↓ {letra, confianza}
└── React UI
      └── fetch → gateway.praxsuite.com/<ws>/query   ← solo números
                        │
                        ▼
              Praxsuite DataEngine
              Intentos · Sesiones · Ranking · Contenidos
```

**El Web Worker no es opcional.** Es el equivalente exacto del `QThread` que le falta a la app de escritorio: sin él, cada inferencia congela la interfaz y la animación de la letra que cambia de color —que es el núcleo del diseño pedagógico— se ve a saltos.

Patrón: cola de **un solo frame**. Si llega un frame nuevo y el worker sigue ocupado, se descarta el anterior. El video se ve a 30 FPS aunque las detecciones lleguen a 15.

## B.2 Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Build | **Vite + React + TypeScript** | Praxsuite despliega bundles estáticos de Vite directamente |
| Inferencia | `onnxruntime-web` | Único camino real para ONNX en navegador |
| Estado | Zustand o Context | La app es chica; no hace falta más |
| Estilos | CSS plano o Tailwind | Indistinto |
| Tipografía | **OpenDyslexic incluida y seleccionable** | Portar tal cual desde la app de escritorio. Es diferenciación real, no adorno |
| Router | React Router | 4 rutas |

**Requisito de plataforma:** `getUserMedia` exige HTTPS. Los subdominios `*.praxsuite.app` ya son HTTPS, así que está cubierto.

## B.3 Pantallas

| Ruta | Contenido |
|---|---|
| `/` | Portada: qué es, botón de entrar, **leaderboard**, tarjetas hacia los contenidos |
| `/login` · `/registro` | Auth contra Praxsuite |
| `/practica` | Modo libre: elegir una letra y practicarla sin que cuente para la nota |
| `/evaluacion` | El recorrido completo del abecedario, con nota al final |
| `/progreso` | Historial personal: sesiones, notas, letras flojas |
| `/aprender` | Contenido editorial: diccionario, investigación, recursos |

Separar `/practica` de `/evaluacion` importa: si la única forma de usar la cámara es una evaluación con nota, la gente practica menos y el leaderboard se llena de intentos ansiosos. Práctica libre sin nota, evaluación cuando el usuario decide.

## B.4 El bucle de práctica

Portar el que ya existe, que está bien diseñado:

```
1. Se muestra la letra objetivo grande + imagen de referencia
2. Inferencia cada N frames (empezar con N=3 → ~10 Hz)
3. Mientras clase_detectada == objetivo y confianza >= τ:
       acumular tiempo sostenido
       la letra transiciona de rojo → verde proporcionalmente
   Si se rompe la condición:
       decaer el progreso (no resetear a cero de golpe — es frustrante)
4. Al completar la ventana de retención:
       mensaje de refuerzo aleatorio ("Muy bien", "Excelente", "Bien hecho", "Perfecto")
       calcular puntaje de la letra
       avanzar
5. Si pasan T_max segundos sin lograrlo:
       ofrecer "saltar esta letra" → se registra como no lograda, puntaje 0
```

**Detalles que hacen la diferencia:**

- **Decaimiento en vez de reset.** Si el usuario tiembla y pierde la detección medio segundo, perder los 4 segundos acumulados desmotiva. Decaer al doble de velocidad de la que sube.
- **Estado "no veo tu mano"** visualmente distinto de "veo otra letra". Son dos problemas distintos y el usuario necesita saber cuál tiene.
- **Ventana de retención configurable**, por defecto 4 s (los 5 s originales se sienten largos cuando son 24 letras seguidas).
- **Poder abandonar la evaluación** sin perder lo acumulado: guardar la sesión como incompleta.

## B.5 El sistema de puntaje

Esta es la definición que resuelve la advertencia 3.1. **Escribirla en el código como una función pura, con las constantes en un solo lugar.**

### Lo que se mide por letra

Durante la ventana de retención se muestrea a ~8 Hz. Sobre esas muestras:

| Símbolo | Definición |
|---|---|
| `τ` | Umbral de confianza (inicial 0,50) |
| `estabilidad` | fracción de muestras de la ventana con clase correcta **y** confianza ≥ τ |
| `conf_media` | media de la confianza en esas muestras válidas |
| `t_logro` | segundos desde que apareció la letra hasta completar la ventana |
| `T_min` | duración de la ventana de retención (4 s) |
| `T_max` | tiempo máximo antes de ofrecer saltar (30 s) |

### La fórmula

```
conf_norm   = clamp((conf_media - τ) / (1 - τ), 0, 1)
bonus_tiempo = clamp((T_max - t_logro) / (T_max - T_min), 0, 1)

puntaje_letra = 100 × (0,50·estabilidad + 0,35·conf_norm + 0,15·bonus_tiempo)
```

**Por qué así:**

- **`estabilidad` pesa más que la confianza** porque es la señal más honesta de las tres: mide si el usuario mantuvo la seña, no cuán seguro estaba el modelo.
- **`conf_norm` se normaliza sobre τ**, no sobre 0. Una confianza de 0,50 con τ=0,50 vale 0, no 50. Sin esto, el simple hecho de superar apenas el umbral ya regalaría medio puntaje.
- **`bonus_tiempo` pesa poco (15%)**. Premia fluidez sin castigar a quien recién aprende, y sin convertir el ejercicio en una carrera — que sería pedagógicamente malo.

### La nota

```
letras_evaluadas = 24   (26 menos J y Z, ver advertencia 3.2)
promedio = Σ puntaje_letra / letras_evaluadas

nota = 1,0 + 6,0 × (promedio / 100)          →  escala 1,0 – 7,0
```

Alternativa con **exigencia al 60%** (convención escolar chilena: 60% del puntaje = 4,0):

```
si promedio < 60:  nota = 1,0 + 3,0 × (promedio / 60)
si promedio ≥ 60:  nota = 4,0 + 3,0 × ((promedio - 60) / 40)
```

Recomiendo la segunda: es la que la gente entiende sin explicación, y hace que un 4,0 signifique algo.

### Qué se guarda

**Se guardan los cuatro insumos crudos, no solo el puntaje.** `ConfianzaMedia`, `Estabilidad`, `SegundosHastaLogro` y `Umbral` van a la base de datos junto con `Puntaje`. Si la fórmula cambia, se recalcula todo el histórico. Si no se guardan, no se puede.

También se guardan `ModeloVersion` y `ResolucionEntrada`: cuando llegue el motor de landmarks, esas dos columnas son lo que permite comparar épocas sin adivinar.

---

# Parte C — Praxsuite: datos, auth y despliegue

## C.1 Datos concretos del workspace

Verificados directamente contra el workspace:

| Dato | Valor |
|---|---|
| Workspace ID | `e0efff61-b451-46de-8dcf-e2fa8634d20a` |
| Gateway de consultas | `https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/query` |
| Base de endpoints | `https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/endpoint/<endpoint_id>` |
| Apps existentes | Solo `Portfolio` → `https://mirkowo.praxsuite.app` |
| Roles existentes | Solo `owner` |
| Tablas existentes | 12, todas del portafolio — ninguna reutilizable |

La app nueva es un **app aparte**, con subdominio propio (ej. `lsch` → `https://lsch.praxsuite.app`). No tocar el portafolio.

> **Ojo:** la URL de portal que reporta el gateway es `http://localhost:3000/...`, o sea la del entorno de desarrollo. Para sacar la deploy key hay que entrar al portal real que uses, no a esa dirección.

## C.1b Lo que ya existe — creado y verificado

**Arquitectura confirmada leyendo el Portfolio desplegado**, que ya resuelve este problema en el mismo workspace. No hubo que inventar nada:

```
Lectura   -> POST /query        con pk_live_ (mitad publica, solo lectura)
Auth      -> POST /auth/login   con la misma pk_live_ como credencial de workspace
             POST /auth/register
Escritura -> POST a un Endpoint sync SIN credencial
             La Automation detras valida el JWT y escribe con la identidad verificada
```

**La regla que hace segura la escritura:** el `UsuarioId` sale del token, nunca del payload. Un cliente no puede escribir a nombre de otro aunque manipule el cuerpo de la petición. Esto es el «Camino 2» de §C.5 — y resulta que ya era el patrón establecido acá, así que la decisión estaba tomada de antes.

Dos detalles que solo se ven leyendo el código del Portfolio y que están portados:

1. **La forma de la respuesta de `/auth` no está garantizada entre versiones del gateway** (`accessToken` vs `access_token` vs `token`). Se normaliza en un solo lugar.
2. **El id de usuario se lee del claim `sub` del JWT, no del cuerpo de la respuesta**, porque `sub` es lo que el servidor resuelve como `endUserId` al validar. Usar el del cuerpo haría que cliente y servidor creyeran identidades distintas.

### Creado en el workspace

| Recurso | Id |
|---|---|
| `LSCh_Perfiles` | `bd780485-1bfa-4806-a596-7a982d9fa25e` |
| `LSCh_Sesiones` | `2a96f474-a695-4b11-bbfa-44748facc7f7` |
| `LSCh_Intentos` | `679512be-a7e6-4977-b90f-d9d03610c4ab` |
| `LSCh_Ranking` | `e087b5ea-b7ed-46fa-a358-7c78bc74c5b0` |
| `LSCh_Contenidos` | `166d1e91-cd84-4284-951f-a5eabd3e0c56` |
| Rol `estudiante` | `85eb25aa-8afa-4a08-8c83-682a4de3971c` |
| Credencial «LSCh Web publico» | `769765a8-5b29-4d24-8970-2d6ae4319d13` |

La credencial está **acotada a lectura sobre Ranking y Contenidos**, que es lo único público. Verificado por prueba directa: con esa clave, leer `Comentarios` del Portfolio o `LSCh_Intentos` devuelve `No access to table`. La mitad `sk_live_` no está en el repositorio ni se usa en ninguna parte.

`UsuarioId` es **ShortText**, no una columna de tipo User — siguiendo la convención que ya usa `Comentarios` en el Portfolio. Y tal como el rol `owner` de allá, `estudiante` **no tiene acceso directo a ninguna tabla**: es una etiqueta que la Automation verifica desde el JWT.

### Escritura: cómo quedó, y por qué

La decisión de §C.5 se resolvió con un mecanismo que no estaba en el plan original y que es mejor que las dos opciones que planteaba:

**`default_value_template = '{{claim:sub}}'` sobre una columna de tipo User.** El gateway estampa esa columna desde el token verificado del llamador y **rechaza cualquier intento del cliente de fijarla**. Combinado con `row_filter='__SELF__'` en el scope de tabla, la propiedad se impone tanto en lecturas como en escrituras.

Es decir: **la escritura directa desde el cliente ya es segura en identidad, sin Automation de por medio.** Quedó así:

| Qué | Quién escribe | Qué lo protege |
|---|---|---|
| `LSCh_Sesiones`, `LSCh_Intentos` | El cliente, con su JWT | El gateway estampa `Usuario` desde el claim `sub`; el cliente no puede fijarla |
| `LSCh_Ranking` | Solo la Automation | El cliente no tiene acceso de escritura a la tabla |

Esto obligó a agregar una columna `Usuario` de tipo **User** a Sesiones e Intentos: `UsuarioId` (ShortText) no sirve como ancla de `__SELF__`. La convención del Portfolio se mantiene donde aplica, pero acá hacía falta el tipo específico.

**Trampa a tener presente:** en cuanto una tabla tiene un solo scope de columna, un `select *` devuelve **únicamente** las columnas con `can_read=true` — el resto desaparece sin avisar. Por eso están scopeadas todas las columnas que la app necesita leer, no solo las nuevas.

### La Automation del ranking

`LSCh_Ranking` es una tabla **derivada**: no la escribe nadie más que la Automation.

```
Endpoint sync  ->  Validar JWT  ->  Sesiones del usuario  ->  Perfil  ->
                   Ranking actual  ->  Calcular  ->  ¿existe?  ->  Actualizar / Insertar  ->  Respuesta
```

| Recurso | Id |
|---|---|
| Automation «LSCh — recalcular ranking» | `2aeda9e8-19bb-453e-bd2e-b18d5482c1dc` |
| Endpoint sync | `77c6b447-23a7-4cb3-b3b0-3c9a681396ee` |

**La propiedad que importa: el endpoint no acepta datos, solo el token.** Recalcula leyendo las sesiones desde la base. No hay payload que falsificar.

Dos cosas que se descubrieron construyéndola:

1. **El trigger `SystemEvent` no dispara con escrituras vía MCP.** Se intentó primero con `row.created` sobre `LSCh_Sesiones` y no se registró ninguna ejecución. Por eso el diseño pasó a Endpoint sync, que además es determinista y devuelve el resultado en la misma llamada.
2. **Estos endpoints responden HTTP 200 aunque falle un paso interno**, con `{ error }` en el cuerpo. Verificar el status no basta — el cliente revisa el cuerpo. (Ya estaba documentado en el `api.js` del Portfolio.)

Verificado: sin token y con token basura, la Automation rechaza.

> **Límite honesto de todo esto.** La inferencia corre en el cliente, así que alguien decidido puede escribir una sesión con notas inventadas usando su propio token. **Ningún servidor puede verificar lo que vio una cámara ajena** — ni con Automation ni sin ella. Lo que sí queda garantizado es la identidad: nadie puntúa a nombre de otro, y el ranking no es escribible directamente. Para una app de aprendizaje eso es la proporción correcta; si algún día el ranking tuviera algo en juego, habría que repensar el problema entero, no esta capa.

### Tamaño real del bundle — verificación #9 cerrada

| Archivo | Tamaño |
|---|---:|
| `ort-wasm-simd-threaded.jsep.wasm` | 25,6 MB |
| `best-320.onnx` | 7,8 MB |
| JS de la app + worker | 0,6 MB |
| **Total `dist/`** | **34,0 MB** |

**El deploy inline (tope 8 MB) queda descartado sin ambigüedad.** Hay que usar la deploy key. Y el binario WASM pesa 3× más que el modelo, así que si en algún momento urge bajar el peso de la primera carga, el lugar donde mirar es el runtime, no el modelo — por ejemplo sirviendo una variante sin soporte de hilos, o desde CDN.

### Lo que falta del lado de Praxsuite

- [x] ~~Automation + Endpoint sync para escribir intentos y sesiones~~ — innecesaria: la escritura directa es segura con el estampado del gateway
- [x] La Automation que recalcula `LSCh_Ranking` al cerrar una sesión
- [ ] **Verificar el circuito completo con una cuenta real** — el estampado de `{{claim:sub}}` y el filtro `__SELF__` están configurados pero no probados con un JWT de usuario
- [ ] Cargar `LSCh_Contenidos` con los enlaces y textos.
- [x] ~~Decidir cómo lee un usuario su propio historial~~ — filtro por fila `__SELF__` sobre el rol `estudiante`

## C.2 Modelo de datos

Cinco tablas nuevas, todas con prefijo `LSCh_` para no mezclarse con las del portafolio.

### `LSCh_Perfiles` — clave: `Email`

| Columna | Tipo | Notas |
|---|---|---|
| `NombreVisible` | ShortText | Lo que aparece en el ranking |
| `ApareceEnRanking` | Bool | **Opt-in explícito**, por defecto falso |
| `FechaRegistro` | DateTime | |
| `Usuario` | User | Referencia al EndUser de Praxsuite |

### `LSCh_Sesiones` — clave: `SesionId`

| Columna | Tipo | Notas |
|---|---|---|
| `Email` | Email | |
| `Inicio` / `Fin` | DateTime | |
| `LetrasEvaluadas` | Integer | |
| `LetrasLogradas` | Integer | |
| `PuntajePromedio` | Decimal | 0–100 |
| `Nota` | Decimal | 1,0–7,0 |
| `Completa` | Bool | Falso si se abandonó |
| `ModeloVersion` | ShortText | ej. `yolov9t-320-v1` |

### `LSCh_Intentos` — clave: `IntentoId`

| Columna | Tipo | Notas |
|---|---|---|
| `SesionId` | ShortText | |
| `Email` | Email | |
| `Letra` | ShortText | |
| `Logrado` | Bool | |
| `ConfianzaMedia` | Decimal | **señal cruda del modelo** |
| `Estabilidad` | Decimal | 0–1 |
| `SegundosHastaLogro` | Decimal | |
| `Umbral` | Decimal | el τ usado |
| `Puntaje` | Decimal | derivado, 0–100 |
| `FpsMedio` | Decimal | diagnóstico de rendimiento real |
| `Dispositivo` | ShortText | user agent resumido |
| `FechaHora` | DateTime | |

`FpsMedio` y `Dispositivo` parecen ruido pero no lo son: son los que van a decir si el modelo anda bien en los equipos que la gente tiene de verdad. Es el dato que hoy no existe.

### `LSCh_Ranking` — clave: `Email`

| Columna | Tipo |
|---|---|
| `NombreVisible` | ShortText |
| `MejorNota` | Decimal |
| `MejorPuntaje` | Decimal |
| `SesionesCompletas` | Integer |
| `ActualizadoEn` | DateTime |

Tabla derivada. Existe por la razón de §C.5.

### `LSCh_Contenidos` — clave: `Titulo`

| Columna | Tipo |
|---|---|
| `Tipo` | Status (`Diccionario` / `Investigación` / `Recurso` / `Institución`) |
| `Resumen` | LongText |
| `Url` | ShortText |
| `Orden` | Integer |
| `Publicado` | Bool |

## C.3 Autenticación

Praxsuite trae usuarios finales (EndUsers) con registro, login y JWT:

- **Registro:** `auth_register` (email, contraseña ≥ 8, nombre opcional). Envía correo de confirmación si el workspace lo exige — **verificar cómo está configurado** antes de diseñar el flujo de onboarding.
- **Login:** `auth_login` → devuelve access token, refresh token y perfil.
- **Uso:** `Authorization: Bearer <jwt>` en las llamadas al gateway.
- Existe además `auth_forgot_password` / `auth_reset_password` / `auth_resend_confirmation`.

Hay que crear un rol nuevo — `estudiante` — y darle acceso a tablas con `set_role_table_access`. Sin eso, cualquier escritura desde el JWT devuelve `403 SCOPE_VIOLATION`.

**Nunca poner una API key `sk_live_` en el bundle del navegador.** Un bundle estático es código público. La única credencial que puede vivir en el cliente es el JWT del propio usuario.

## C.4 y C.5 — Escritura de resultados y el problema del leaderboard

Aquí hay una decisión de arquitectura con consecuencias de privacidad. **Es el punto más delicado de la Parte C.**

El control de acceso de Praxsuite que está documentado en las herramientas es **a nivel de tabla**: un rol tiene `read`, `write` o `readwrite` sobre una tabla completa. No aparece documentado un filtrado por fila según el usuario del JWT.

Si eso es así, entonces darle a `estudiante` acceso de lectura a `LSCh_Intentos` significa que **cualquier usuario logueado puede leer los intentos de todos los demás** vía PraxQL — no desde la UI, pero sí desde la consola del navegador. Nombres, correos y desempeño de todo el mundo.

**Dos caminos:**

### Camino 1 — Escritura directa desde el cliente (rápido)

El cliente escribe a `LSCh_Intentos` y `LSCh_Sesiones` con su JWT. Simple, sin backend.

Mitigaciones necesarias:
- `estudiante` obtiene **`write`, no `readwrite`**, sobre `Intentos` y `Sesiones` (escribir sin poder leer).
- El historial personal de `/progreso` se resuelve leyendo de una tabla derivada por usuario, o se acepta que el resumen viva en `LSCh_Sesiones` con lectura y se asume el riesgo.
- **No guardar el email como identificador visible** si se puede evitar: usar un id opaco y mantener el mapeo en `LSCh_Perfiles`, que no se expone.

### Camino 2 — Escritura mediada por endpoint (correcto)

Se crea un **endpoint Sync** (`create_endpoint`) enlazado a una automatización que recibe el resultado, valida, escribe las filas y actualiza `LSCh_Ranking`. El rol `estudiante` **no tiene acceso de escritura a ninguna tabla**.

- El cliente solo conoce la URL del endpoint.
- La lógica de puntaje se puede validar del lado servidor (evita que alguien mande `nota: 7,0` a mano).
- Firma HMAC opcional en el endpoint.

Cuesta más trabajo. Es lo que corresponde si la app va a ser pública con usuarios reales.

**Recomendación:** Camino 1 para el prototipo interno, **Camino 2 antes de abrirlo a cualquiera que no seas tú**. Y en cualquiera de los dos casos, el leaderboard lee de `LSCh_Ranking` — nunca de `LSCh_Intentos` — porque esa tabla contiene solo lo que el usuario aceptó publicar.

**El opt-in del ranking no es negociable.** `ApareceEnRanking` por defecto en falso, y quien no lo active no aparece. Una nota baja en un ejercicio de accesibilidad es exactamente el tipo de dato que nadie quiere ver publicado con su nombre.

## C.6 Despliegue

```
1. create_app  →  nombre "LSCh", subdominio "lsch"
                  ⇒ https://lsch.praxsuite.app
2. npm run build  →  dist/
3. Deploy:
   - Si dist/ ≤ 8 MB:  deploy_app_bundle (zip en base64)
   - Si no (será el caso): deploy key + POST /api/v1/site-static-deploy/upload
                            con cabecera X-Deploy-Key
```

**Advertencia sobre `deploy_app_bundle`: es un reemplazo total, no una fusión.** Cualquier archivo que esté en el sitio y no venga en el zip se borra, incluidos los que alguien haya editado a mano desde el explorador de archivos. Nunca desplegar un build parcial.

Además: es una **SPA con rutas**, así que hay que verificar que el hosting haga fallback a `index.html` en rutas desconocidas. Si no lo hace, usar hash routing (`/#/evaluacion`). Verificar temprano, es de esas cosas que solo se descubren al recargar la página en una subruta.

## C.7 Contenido editorial

Dos opciones para la capa 3:

| Opción | Cuándo conviene |
|---|---|
| **Tabla `LSCh_Contenidos` + render en React** | Enlaces y textos cortos. Editable sin redesplegar. Es lo que recomiendo para partir |
| **Módulo Docs de Praxsuite** (`create_doc_space`, `create_doc`, `publish_doc`) | Artículos largos con formato, versionado y exportación a PDF. Vale la pena para el texto de "cómo se hizo la investigación" |

Contenido inicial sugerido:

- **Diccionario y recursos:** Fundación LSCh, Señas Chile, el dataset de Roboflow con su licencia CC BY 4.0 (hay que citarlo, es obligación de la licencia).
- **Investigación:** el informe de tesis, la comparación YOLOv5 vs YOLOv9, el benchmark de CPU que demostró que la GPU no hacía falta, y por qué el próximo paso son los landmarks. Este último texto es el más interesante de todos y el que más gente va a leer.
- **Contexto:** Ley 21.303, quiénes son los actores de la comunidad Sorda chilena.
- **Honestidad metodológica:** una nota visible de que el modelo está entrenado sobre un dataset derivado de ASL y qué significa eso. Ponerla tú antes de que la ponga otro.

---

# Parte D — Orden de trabajo

### Hito 0 — Viabilidad (2–3 días) · **puerta de decisión**

- [x] Clonar el repo, entorno Python, confirmar que `models/best.pt` carga
- [x] Exportar a ONNX 320 y 640 → `scripts/export_onnx.py`
- [x] Confirmar forma de salida, orden de clases y latencia nativa → `scripts/verificar_onnx.py`
- [x] **Recuperar el dataset** → Roboflow `entrenamiento-lsch/senas-de-lsch` v5
- [x] `val()` en cinco resoluciones sobre el set de test → `scripts/validar_resoluciones.py`. **320 px confirmado**
- [x] Banco de latencia en navegador → botón «Medir latencia» en `web/`. **16,2 ms / 61,7 FPS con WebGPU**
- [ ] Repetir la medición en Firefox y en un equipo sin WebGPU
- [ ] Medir el peso real de `dist/` con ORT incluido
- [ ] Probar en un notebook sin GPU y en un teléfono

> **No seguir hasta que esto dé números aceptables.** Si a 320 px la latencia en navegador supera ~150 ms o el mAP se cae, hay que replantear la resolución o saltar directamente a landmarks.

### Hito 1 — El motor en el navegador (~1 semana)

- [ ] Proyecto Vite + React + TS
- [x] `getUserMedia`, `<video>`, canvas, manejo de permisos denegados
- [x] **Comparar letterbox vs stretch vs recorte central con la cámara real** → gana recorte central
- [x] Preprocesado con el encuadre ganador
- [x] Web Worker con cola de un frame → `web/src/inference/useMotor.ts`
- [x] Postprocesado y estado "sin seña"
- [ ] Pantalla de depuración: letra detectada, confianza, FPS, latencia
- [ ] **Calibrar τ con manos reales, no con el set de test**
- [x] Resolver el asunto del espejo → el entrenamiento usó volteo horizontal

### Hito 2 — El bucle de práctica (~1 semana)

- [x] Componente de retención con la letra que cambia de color → `web/src/vistas/Practica.tsx`
- [x] Decaimiento, mensajes de refuerzo y referencias visuales por letra (`img/` → `web/public/img/letras/`, 696 KB)
- [x] Función pura de puntaje, con tests unitarios → `web/src/puntaje.ts`, 11 tests
- [x] Recorrido completo del abecedario con las 20 evaluadas → `web/src/vistas/Evaluacion.tsx`
- [x] Cálculo de nota y pantalla de resultado
- [ ] OpenDyslexic y selector de tipografía

### Hito 3 — Praxsuite (~1 semana)

- [ ] `create_app` con subdominio `lsch`
- [x] Crear las cinco tablas con sus columnas
- [x] Rol `estudiante` + credencial pública acotada
- [x] Login y registro → `web/src/praxsuite/` · [ ] recuperación de contraseña y refresh
- [ ] Persistencia de intentos y sesiones (camino 1 o 2 según §C.5)
- [ ] `/progreso` con el historial personal
- [ ] Deploy key configurada y primer despliegue real

### Hito 4 — Leaderboard y contenido (~4–5 días)

- [ ] Automatización que actualiza `LSCh_Ranking` al cerrar una sesión
- [ ] Opt-in en el perfil, con texto claro de qué se publica
- [ ] Leaderboard en la portada
- [ ] `LSCh_Contenidos` cargada y renderizada
- [ ] Textos escritos: diccionario, investigación, nota metodológica

### Hito 5 — Pulido (~3–4 días)

- [ ] Responsive: la evaluación tiene que funcionar en teléfono
- [ ] Estados de error: sin cámara, sin permiso, navegador viejo, modelo que no carga
- [ ] Pantalla de carga decente — son ~18 MB la primera vez
- [ ] PWA con caché del modelo (`Cache Storage`, no `localStorage`)
- [ ] Probar con 3–5 personas que no hayan visto la app

**Total estimado: 4 a 5 semanas** de trabajo real, asumiendo que el Hito 0 pasa limpio.

---

## 8. Cosas a verificar antes de comprometerse

Ninguna de estas está confirmada. Cada una puede cambiar el plan.

| # | Qué verificar | Si falla |
|---|---|---|
| 1 | ~~¿Se sostiene el mAP a 320 px?~~ **Resuelto: sí** (§A.0) | — |
| 1b | ~~¿Qué encuadre usar?~~ **Resuelto: recorte central** (§A.0) | — |
| 2 | ~~¿Latencia en navegador bajo 150 ms?~~ **Resuelto: 16,2 ms con WebGPU** (§A.0) | — |
| 2b | ¿Cuánto cuesta en un equipo SIN WebGPU (WASM puro)? | Bajar la frecuencia de inferencia |
| 3 | ¿Praxsuite permite cabeceras COOP/COEP en el sitio estático? | Sin WASM multihilo. Menos grave de lo previsto: con WebGPU disponible el camino rápido no depende de esto |
| 4 | ~~¿Filtra por fila según el JWT?~~ **Resuelto en la práctica:** el patrón del workspace es escribir vía Automation, que deriva la identidad del token (§C.1b) | — |
| 5 | ¿El hosting hace fallback a `index.html` en rutas de SPA? | Hash routing |
| 6 | ¿Qué política de confirmación por correo tiene el workspace? | Cambia el flujo de registro |
| 7 | ¿La URL prefirmada de un blob de Praxsuite sirve para cargar el `.onnx` (CORS, caducidad)? | Usar la deploy key |
| 8 | ~~¿El modelo funciona con el frame espejado?~~ **Casi resuelto:** el entrenamiento usó volteo horizontal (§3.3) | Confirmar con cámara |
| 9 | ~~¿Cuánto pesa `dist/`?~~ **Resuelto: 34,0 MB** — deploy key obligatoria (§C.1b) | — |

## 9. Decisiones abiertas

| Pregunta | Opciones | Mi recomendación |
|---|---|---|
| ¿Qué hacer con J y Z? | Evaluarlas igual / mostrarlas sin nota / omitirlas | Mostrarlas sin nota (§3.2, opción B) |
| ¿Escritura directa o mediada por endpoint? | Camino 1 / Camino 2 | Camino 1 para el prototipo, Camino 2 antes de abrirlo |
| ¿Escala de nota lineal o con 60% de exigencia? | — | Exigencia al 60% |
| ¿Leaderboard por mejor nota o por constancia? | Mejor nota / sesiones completadas / mixto | Mejor nota, y una segunda columna de sesiones — premiar solo el pico incentiva reintentar hasta que salga por suerte |
| ¿Cuenta obligatoria para practicar? | Sí / no, solo para evaluar | Solo para evaluar. Barrera de entrada mínima |
| ¿Contenido en tabla o en Docs? | — | Tabla ahora, Docs para los textos largos |

---

## 10. Cómo encaja con el cambio a landmarks

Cuando llegue el momento del cambio de modelo, esto es lo que se conserva y lo que se cambia:

**Se conserva entero:**

- Login, tablas, rol, endpoint, despliegue
- Toda la UI: bucle de retención, evaluación, progreso, leaderboard, contenidos
- La función de puntaje y la escala de nota
- El Web Worker y el patrón de cola de un frame

**Se reemplaza solo esto:**

```
Worker: [preprocesado → ONNX YOLOv9 → decodificar cajas]
   ⟶    [MediaPipe Hand Landmarker → normalizar → MLP/Transformer ONNX]
```

Ambos módulos exponen la misma interfaz: entra un frame, sale `{letra, confianza}`. Si desde el principio esa frontera se define como una interfaz TypeScript explícita, el cambio es de días, no de semanas.

**Y lo que se gana en el camino:** cuando exista el motor de landmarks, la app ya tendrá usuarios reales generando datos reales. Las columnas `ModeloVersion`, `FpsMedio` y `Dispositivo` permiten comparar las dos épocas sobre los mismos usuarios — que es un experimento bastante más defendible que comparar mAP sobre 223 imágenes de validación.

Además, tres cosas que hoy no se pueden hacer y que esta etapa habilita:

1. **Medir la tasa real de fracaso.** Cuántas veces un usuario abandona una letra porque el modelo no la reconoce. Ese número, desglosado por letra, dice exactamente dónde falla el modelo actual con gente real — mucho más informativo que el mAP.
2. **Reclutar.** Una app pública funcionando es el argumento para conseguir voluntarios y para acercarse a Fundación LSCh con algo en la mano.
3. **La vía dinámica queda con un hueco visible.** J y Z marcadas como "próximamente" son el mejor argumento posible para justificar la etapa de landmarks: el problema queda a la vista en el producto, no solo en el informe.
