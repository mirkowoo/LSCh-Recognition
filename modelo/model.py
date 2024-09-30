from ultralytics import YOLO
import cv2 as cv
import torch
import numpy as np
import sqlite3

class Model:
    def __init__(self,cameraIndex=0):
        self.counter = 0
        self.cap = cv.VideoCapture(cameraIndex)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(r"models\best.pt").to(device)
        print(device)
        self.conn = sqlite3.connect("progreso.db")
        self.cursor = self.conn.cursor()
        self.create_table()

    def create_table(self):
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS predicciones
                            (letra TEXT PRIMARY KEY, precision REAL)''')
        self.conn.commit()

    def save_precision(self, letra, precision):
        currentPrecision = self.get_precision(letra)

        if currentPrecision is None or precision > currentPrecision:
            self.cursor.execute('''INSERT OR REPLACE INTO predicciones(letra, precision)
                            VALUES (?,?)''', (letra, precision))
            self.conn.commit()

    def deleteData(self):
        self.cursor.execute('''DELETE FROM predicciones''')
        self.conn.commit()

    def get_precision(self,letra):
        self.cursor.execute('''SELECT precision FROM predicciones WHERE letra = ?''', (letra,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def preprocess(self,frame):
        frame = cv.resize(frame,(640,640))
        frame = frame.astype(np.float32)
        frame = np.transpose(frame, (2,0,1))
        frame = np.expand_dims(frame,axis=0)
        frame /= 255.0
        return frame

    def getFrame(self):
        ret,frame = self.cap.read()
        if ret:
            return frame
        return None

    def updateCamera(self,cameraIndex):
        self.cameraIndex = cameraIndex
        if self.cap:
            self.cap.release()
        self.cap = cv.VideoCapture(cameraIndex)

    def updateFrame(self):
        ret,frame = self.cap.read()
        detectedAccuracy = 0
        detectedClass = None

        if ret:
            results = self.model.predict(frame,imgsz=640,conf=0.4)
            annotated_frame = results[0].plot()

            detectedClass = [self.model.names[int(cls)] for cls in results[0].boxes.cls]
            if len(detectedClass) > 0:
                if len(detectedClass) > 1:
                    detectedClass = [detectedClass[0]]
                    detectedAccuracy = float(results[0][0].boxes.conf[0] * 100)
                else:
                    detectedAccuracy = float(results[0].boxes.conf * 100)

                print(f"Clase:{detectedClass}")
                self.save_precision(detectedClass[0],detectedAccuracy)

            annotated_frame = cv.cvtColor(annotated_frame,cv.COLOR_BGR2RGB)
            return annotated_frame, detectedClass, detectedAccuracy
        return None, None, None