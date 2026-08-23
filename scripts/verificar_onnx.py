"""
Verifica el ONNX exportado y mide latencia en CPU.

Implementa el pre y postprocesado exactamente como habra que reescribirlo en
JavaScript, para tener una referencia contra la cual comparar el port.

Uso:
  .venv/Scripts/python.exe scripts/verificar_onnx.py
  .venv/Scripts/python.exe scripts/verificar_onnx.py --imagen ruta/a/foto.jpg
"""

import argparse
import json
import statistics
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

RAIZ = Path(__file__).resolve().parent.parent
MODELOS = RAIZ / "models"

UMBRAL = 0.50  # tau inicial; calibrar despues con manos reales
COLOR_PAD = 114


def letterbox(imagen: np.ndarray, lado: int):
    """Redimensiona conservando proporcion y rellena con gris. Igual que en JS."""
    alto, ancho = imagen.shape[:2]
    escala = min(lado / ancho, lado / alto)
    nuevo_ancho, nuevo_alto = int(round(ancho * escala)), int(round(alto * escala))

    import cv2

    redimensionada = cv2.resize(imagen, (nuevo_ancho, nuevo_alto), interpolation=cv2.INTER_LINEAR)
    lienzo = np.full((lado, lado, 3), COLOR_PAD, dtype=np.uint8)
    pad_x = (lado - nuevo_ancho) // 2
    pad_y = (lado - nuevo_alto) // 2
    lienzo[pad_y : pad_y + nuevo_alto, pad_x : pad_x + nuevo_ancho] = redimensionada
    return lienzo, escala, pad_x, pad_y


def preprocesar(imagen_bgr: np.ndarray, lado: int):
    lienzo, escala, pad_x, pad_y = letterbox(imagen_bgr, lado)
    rgb = lienzo[:, :, ::-1]  # BGR (OpenCV) -> RGB. En el navegador ya llega RGB.
    tensor = rgb.astype(np.float32) / 255.0
    tensor = np.transpose(tensor, (2, 0, 1))[None]  # NCHW
    return np.ascontiguousarray(tensor), escala, pad_x, pad_y


def decodificar(salida: np.ndarray, clases: list[str], umbral: float):
    """salida: [1, 4+nc, anchors]. Se queda con el mejor anchor global."""
    pred = salida[0]  # [4+nc, anchors]
    puntajes = pred[4:]  # [nc, anchors]
    mejor_por_anchor = puntajes.max(axis=0)
    i = int(mejor_por_anchor.argmax())
    score = float(mejor_por_anchor[i])
    if score < umbral:
        return None, score, None
    clase = int(puntajes[:, i].argmax())
    caja = pred[:4, i]  # cx, cy, w, h en pixeles de la entrada
    return clases[clase], score, caja


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelo", default="best-320.onnx")
    ap.add_argument("--imagen", default=None)
    ap.add_argument("--repeticiones", type=int, default=100)
    args = ap.parse_args()

    ruta = MODELOS / args.modelo
    if not ruta.exists():
        raise SystemExit(f"No existe {ruta}. Corre primero scripts/export_onnx.py")

    meta_path = MODELOS / "clases.json"
    clases = json.loads(meta_path.read_text(encoding="utf-8"))["clases"] if meta_path.exists() else []

    sesion = ort.InferenceSession(str(ruta), providers=["CPUExecutionProvider"])
    entrada = sesion.get_inputs()[0]
    salida_info = sesion.get_outputs()[0]
    lado = entrada.shape[2]

    print(f"modelo   : {ruta.name}  ({ruta.stat().st_size / 1024 / 1024:.2f} MB)")
    print(f"entrada  : {entrada.name} {entrada.shape} {entrada.type}")
    print(f"salida   : {salida_info.name} {salida_info.shape}")
    print(f"clases   : {len(clases)} -> {clases}\n")

    if args.imagen:
        import cv2

        img = cv2.imread(args.imagen)
        if img is None:
            raise SystemExit(f"No pude leer {args.imagen}")
        tensor, escala, pad_x, pad_y = preprocesar(img, lado)
    else:
        print("Sin --imagen: se usa ruido aleatorio (mide latencia, no precision).\n")
        tensor = np.random.rand(1, 3, lado, lado).astype(np.float32)

    salida = sesion.run(None, {entrada.name: tensor})[0]
    print(f"forma de salida real: {salida.shape}")
    esperado = 4 + len(clases) if clases else "4+nc"
    print(f"esperado: [1, {esperado}, anchors]  (anchors a {lado}px = "
          f"{(lado//8)**2 + (lado//16)**2 + (lado//32)**2})\n")

    if args.imagen and clases:
        letra, score, caja = decodificar(salida, clases, UMBRAL)
        if letra is None:
            print(f"sin sena (mejor score {score:.3f} < umbral {UMBRAL})")
        else:
            print(f"letra: {letra}   confianza: {score:.3f}   caja(cx,cy,w,h)={caja.round(1)}")

    # Latencia
    for _ in range(10):  # calentamiento
        sesion.run(None, {entrada.name: tensor})

    tiempos = []
    for _ in range(args.repeticiones):
        t0 = time.perf_counter()
        sesion.run(None, {entrada.name: tensor})
        tiempos.append((time.perf_counter() - t0) * 1000)

    mediana = statistics.median(tiempos)
    print(f"\nlatencia mediana: {mediana:.1f} ms  ({1000 / mediana:.1f} FPS)")
    print(f"  p90: {sorted(tiempos)[int(len(tiempos) * 0.9)]:.1f} ms   "
          f"min: {min(tiempos):.1f} ms   max: {max(tiempos):.1f} ms")
    print("\nOjo: esto es CPU nativa. En WASM del navegador esperar entre 2x y 4x mas.")


if __name__ == "__main__":
    main()
