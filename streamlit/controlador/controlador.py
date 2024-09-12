from modelo.modelo import Modelo


class Controlador:

    def __init__(self):
        self.modelo = Modelo()

    def get_precision(self, letra):
        return self.modelo.get_precision(letra)

    def updateFrameC(self):
        return self.modelo.updateFrame()
    
    def iniciarAplicacion(self):
        from vista.vista import mostrarInterfaz
        mostrarInterfaz(self)