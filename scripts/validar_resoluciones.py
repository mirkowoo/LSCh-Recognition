"""
Compara el mAP del modelo a distintas resoluciones sobre el split de test.
Responde la pregunta que decide la etapa: se puede bajar a 320 px?

Uso:
  .venv/Scripts/python.exe scripts/validar_resoluciones.py
"""
import json
from pathlib import Path

from ultralytics import YOLO

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / ".rf" / "dataset" / "data.yaml"
PESOS = RAIZ / "models" / "best.pt"
RESOLUCIONES = [640, 512, 416, 320, 256]

resultados = {}
for res in RESOLUCIONES:
    modelo = YOLO(str(PESOS))
    r = modelo.val(data=str(DATA), split="test", imgsz=res,
                   verbose=False, plots=False, save_json=False,
                   project=str(RAIZ / "runs"), name=f"val{res}", exist_ok=True)
    porclase = {modelo.names[int(c)]: round(float(v), 4)
                for c, v in zip(r.box.ap_class_index, r.box.ap50)}
    resultados[res] = {
        "mAP50": round(float(r.box.map50), 4),
        "mAP50_95": round(float(r.box.map), 4),
        "P": round(float(r.box.mp), 4),
        "R": round(float(r.box.mr), 4),
        "ap50_por_clase": porclase,
    }
    print(f"\n=== {res}px  mAP50={r.box.map50:.4f}  mAP50-95={r.box.map:.4f} "
          f"P={r.box.mp:.4f} R={r.box.mr:.4f}")

(RAIZ / "models" / "validacion_resoluciones.json").write_text(
    json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")

print("\n\n### RESUMEN (split de test, 115 imagenes) ###")
print(f"{'res':>6} | {'mAP50':>8} | {'mAP50-95':>9} | {'P':>7} | {'R':>7} | {'d mAP50 vs 640':>15}")
base = resultados[640]["mAP50"]
for res in RESOLUCIONES:
    d = resultados[res]
    print(f"{res:>6} | {d['mAP50']:>8.4f} | {d['mAP50_95']:>9.4f} | "
          f"{d['P']:>7.4f} | {d['R']:>7.4f} | {d['mAP50'] - base:>+15.4f}")

print("\n### Clases que mas se degradan de 640 a 320 ###")
a, b = resultados[640]["ap50_por_clase"], resultados[320]["ap50_por_clase"]
deltas = sorted(((b.get(k, 0) - v, k, v, b.get(k, 0)) for k, v in a.items()))
for d, letra, v640, v320 in deltas[:8]:
    print(f"  {letra}: {v640:.3f} -> {v320:.3f}   ({d:+.3f})")
