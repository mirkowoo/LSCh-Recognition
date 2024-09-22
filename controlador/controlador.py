from modelo.modelo import Modelo


class Controlador:

    def __init__(self,cameraIndex):
        self.modelo = Modelo(cameraIndex)

    def getPrecision(self, letra):
        return self.modelo.getPrecision(letra)

    def updateFrameC(self):
        return self.modelo.updateFrame()
    
    def iniciarAplicacion(self):
        from vista.home import mostrarPaginaPrincipal
        mostrarPaginaPrincipal(self)