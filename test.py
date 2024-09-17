# app.py
import streamlit as st
import cv2
import torch
import numpy as np
from PIL import Image
from ultralytics import YOLO

# Cargar el modelo YOLO
model = YOLO(r'models\best.pt')

# Configurar Streamlit
st.title("Detección de señas de la LSCh")
st.text("Utilizando YOLO y Streamlit")

# Capturar video de la cámara
video_capture = cv2.VideoCapture(0)

# Función para procesar cada frame
def process_frame(frame):
    # Convertir el frame a RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    # Convertir el frame a un objeto PIL
    img = Image.fromarray(frame_rgb)
    # Realizar la detección con el modelo YOLO
    results = model(img)
    # Dibujar las detecciones en el frame
    for *box, conf, cls in results.xyxy[0]:
        cv2.rectangle(frame, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (0, 255, 0), 2)
        cv2.putText(frame, f'{model.names[int(cls)]} {conf:.2f}', (int(box[0]), int(box[1]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
    return frame

# Mostrar el video en Streamlit
stframe = st.empty()
while True:
    ret, frame = video_capture.read()
    if not ret:
        break
    frame = process_frame(frame)
    stframe.image(frame, channels="BGR")

# Liberar la captura de video
video_capture.release()