import cv2 as cv
import torch
from kivy.clock import Clock
from kivy.graphics.texture import Texture
from ultralytics import YOLO
from threading import Thread

import numpy as np
import sqlite3

class Modelo:
    def __init__(self):
        self.counter = 0
        self.cap = cv.VideoCapture(0)
        #cargar modelo yolo
        # Cargar el modelo y especificar el dispositivo
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO("best.pt").to(device)
        print(device)

        #base de datos sqlite
        self.conn = sqlite3.connect('progreso.db')
        self.cursor = self.conn.cursor()
        self.create_table()
    
    def create_table(self):
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS predicciones
                            (letra TEXT PRIMARY KEY, precision REAL)''')
        self.conn.commit()

    def save_precision(self,letra,precision):

        currentPrecision = self.get_precision(letra)

        if currentPrecision is None or precision > currentPrecision:
            self.cursor.execute('''INSERT OR REPLACE INTO predicciones(letra, precision)
                            VALUES (?,?)''', (letra, precision))
            self.conn.commit()
        
    def get_precision(self,letra):
        self.cursor.execute('''SELECT precision FROM predicciones WHERE letra = ?''', (letra,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def preprocess(self, frame):
        frame = cv.resize(frame,(640,640))
        frame = frame.astype(np.float32)
        frame = np.transpose(frame, (2, 0, 1))
        frame = np.expand_dims(frame, axis=0)
        frame /= 255.0
        return frame

    def updateFrame(self):
        ret, frame = self.cap.read()
        detectedAccuracy = 0
        if ret:
            # Realiza predicción y obtén las anotaciones (cuadros delimitadores)
            results = self.model.predict(frame, imgsz=640, conf=0.5)

            # Anotar el frame con las detecciones
            annotated_frame = results[0].plot()  # Esto dibuja los cuadros en el frame

            detectedClass = [self.model.names[int(cls)] for cls in results[0].boxes.cls]
            if (len(detectedClass) > 0):
                if(len(detectedClass) > 1):
                    detectedClass = [detectedClass[0]]
                    detectedAccuracy = float(results[0][0].boxes.conf[0] * 100)
                    print("Clase detectada: ", detectedClass)
                else:
                    detectedAccuracy = float(results[0].boxes.conf * 100)
                    print("Precisión: ", detectedAccuracy)
                #guardar precisiones
                self.save_precision(detectedClass[0], detectedAccuracy)
            

            # Invierte el frame anotado
            buf1 = cv.flip(annotated_frame, 0)  # Invierte la imagen verticalmente

            # Convierte el frame en un buffer de bytes para Kivy
            buf = buf1.tobytes()
            image_texture = Texture.create(size=(annotated_frame.shape[1], annotated_frame.shape[0]), colorfmt='bgr')
            image_texture.blit_buffer(buf, colorfmt='bgr', bufferfmt='ubyte')

            # Devuelve la textura con las anotaciones
            return image_texture,detectedClass,detectedAccuracy
        return None