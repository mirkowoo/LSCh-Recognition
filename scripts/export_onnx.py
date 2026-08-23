"""
Exporta models/best.pt (YOLOv9-t, 26 clases) a ONNX para correr en el navegador.

Genera:
  models/best-320.onnx   -> el de produccion
  models/best-640.onnx   -> control, para comparar metricas
  models/clases.json     -> orden de clases + metadatos que necesita el frontend

Uso:
  .venv/Scripts/python.exe scripts/export_onnx.py
"""

import json
import shutil
from pathlib import Path

from ultralytics import YOLO

RAIZ = Path(__file__).resolve().parent.parent
PESOS = RAIZ / "models" / "best.pt"
SALIDA = RAIZ / "models"

# opset 12: soporte amplio en ONNX Runtime Web.
# dynamic=False: formas fijas -> ORT preasigna buffers y optimiza una sola vez.
# nms=False: la NMS se resuelve en JS (con una sola mano basta el mejor anchor).
OPSET = 12
RESOLUCIONES = [320, 640]


def exportar(resolucion: int) -> Path:
    modelo = YOLO(str(PESOS))
    ruta = Path(
        modelo.export(
            format="onnx",
            imgsz=resolucion,
            opset=OPSET,
            simplify=True,
            dynamic=False,
            half=False,
            nms=False,
        )
    )
    destino = SALIDA / f"best-{resolucion}.onnx"
    if ruta.resolve() != destino.resolve():
        shutil.move(str(ruta), str(destino))
    return destino


def main() -> None:
    if not PESOS.exists():
        raise SystemExit(f"No existe {PESOS}")

    modelo = YOLO(str(PESOS))
    nombres = modelo.names  # dict {indice: nombre}
    clases = [nombres[i] for i in sorted(nombres)]

    print(f"Clases ({len(clases)}): {clases}\n")

    generados = {}
    for resolucion in RESOLUCIONES:
        destino = exportar(resolucion)
        mb = destino.stat().st_size / 1024 / 1024
        generados[resolucion] = destino
        print(f"  {destino.name}  {mb:.2f} MB")

    # Lo que el frontend necesita para decodificar la salida sin adivinar nada.
    meta = {
        "clases": clases,
        "numClases": len(clases),
        "opset": OPSET,
        "modelos": {
            str(r): {
                "archivo": generados[r].name,
                "resolucion": r,
                "mb": round(generados[r].stat().st_size / 1024 / 1024, 2),
            }
            for r in RESOLUCIONES
        },
        "preprocesado": {
            "letterbox": True,
            "colorPad": 114,
            "orden": "RGB",
            "layout": "NCHW",
            "escala": "dividir por 255",
        },
        "postprocesado": {
            "formaSalida": "[1, 4 + numClases, anchors]",
            "filas0a3": "cx, cy, w, h en pixeles de la entrada (no normalizados)",
            "filasRestantes": "puntajes por clase, sigmoide ya aplicada, sin objectness",
            "objectness": False,
        },
    }
    (SALIDA / "clases.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\n  clases.json escrito en {SALIDA / 'clases.json'}")


if __name__ == "__main__":
    main()
