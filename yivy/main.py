from kivy.app import App
from vista import Vista
from modelo import Modelo
from controlador import Controlador

class MyApp(App):
    def build(self):
        modelo = Modelo()
        controlador = Controlador(modelo)

        vista = Vista(controlador)
        return vista

if __name__ == '__main__':
    MyApp().run()
