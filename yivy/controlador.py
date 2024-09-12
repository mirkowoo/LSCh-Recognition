from ultralytics import YOLO

class Controlador:
    def __init__(self, modelo):
        self.modelo = modelo
        
    def detectar(self,frame):
        resultados = self.modelo(frame)
        return resultados[0]

    def updateFrame(self):
        return self.modelo.updateFrame()
