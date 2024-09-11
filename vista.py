from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.image import Image
from kivy.uix.widget import Widget
from kivy.clock import Clock
from kivy.graphics.texture import Texture
from kivy.graphics import Rectangle, Color
from kivy.properties import StringProperty
from kivy.uix.dropdown import DropDown
from kivy.uix.popup import Popup
from threading import Thread
import cv2 as cv

class Vista(BoxLayout):

    def __init__(self,controlador,**kwargs):
        super().__init__(**kwargs)
        self.controlador = controlador
        self.orientation = "vertical"
        self.padding = 20

        #iniciar camara
        self.cap = cv.VideoCapture(0)

        #intanciar cosas
        self.helpButton = Button
        self. popUp = None
        self.principal(instance=None)

    def principal(self,instance):

        self.clear_widgets()

        self.layout = BoxLayout

        self.label = Label(text="Binvenido a la aplicación de lengua de señas",
                           font_size='24sp',
                           bold = True,
                           halign='center',
                           valign='middle',)
        self.add_widget(self.label)

        #Botón actividades
        self.botonActividades = Button(text="Actividades",
                                       size_hint=(0.5,0.2),
                                       color=(1,1,1,1),
                                       pos_hint={"center_x":0.5})
        self.botonActividades.bind(on_press=self.selectorPractica)
        self.add_widget(self.botonActividades)

    def selectorPractica(self,instance):

        if self.cap is not None:
            self.cap.release()
            Clock.unschedule(self.updateFrame)
        self.layout = BoxLayout
        self.clear_widgets()
        #Botón para volver atrás.
        self.botonVolver = Button(text="Volver",
                                  size_hint=(0.5,0.2),
                                  color=(1,1,1,1),
                                  width=10,
                                  height=10,
                                  pos_hint={"center_x":0.1})
        self.botonVolver.bind(on_press=self.principal)
        self.add_widget(self.botonVolver)

        #Botón abecedario
        self.botonActividad1 = Button(text="Abecedario",
                                      size_hint=(0.5,0.2),
                                       color=(1,1,1,1),
                                       pos_hint={"center_x":0.5})
        self.botonActividad1.bind(on_press=self.abecedario)
        self.add_widget(self.botonActividad1)
        
    def abecedario(self,instance):

        #Borrar los widgets que habian antes
        self.clear_widgets()

        #cambiar a gridlayout
        self.layout = GridLayout(cols=3,rows=3, spacing=10)
        self.add_widget(self.layout)

        #variables


        self.botonVolver = Button(text="Volver",
                                  size_hint=(0.5,0.2),
                                  color=(1,1,1,1),
                                  width=10,
                                  height=10,
                                  pos_hint={"center_x":0.1})
        self.botonVolver.bind(on_press=self.selectorPractica)
        self.layout.add_widget(self.botonVolver) #(1,0)

        self.label = Label(text="Abecedario",
                           size_hint=(1,0.1),
                           height=10
                           )
        self.layout.add_widget(self.label) #(1,1)

        #Crear dropdown para seleccionar letra
        self.selectorLetras = DropDown()
        for i in ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]:
            selector = Button(text=i,size_hint_y=None, height=44)
            selector.bind(on_release=lambda selector: self.selectorLetras.select(selector.text))
            self.selectorLetras.add_widget(selector) 

        self.botonSelectorLetras = Button(text="Seleccionar Letra",size_hint=(0.5,0.2),height=10)
        #acciones con la dropdown
        self.botonSelectorLetras.bind(on_release=self.selectorLetras.open)
        self.selectorLetras.bind(on_select=lambda instance, x: setattr(self.botonSelectorLetras, 'text', x))
        self.selectorLetras.bind(on_select=lambda instance, x: self.updateImage(x))
        #boton dropdown
        self.layout.add_widget(self.botonSelectorLetras)#(1,2)

        #espacio vacio
        self.layout.add_widget(Widget(width=10)) #(2,0)

        self.image = Image(size_hint=(1,1))
        self.layout.add_widget(self.image) #(2,1)

        #iniciar el reloj
        Clock.schedule_interval(self.updateFrame, 1.0/60.0)

        #imagen de la letra seleccionada
        self.selectedLetterImage = Image()
        self.layout.add_widget(self.selectedLetterImage) #(2,2)

        #espacio vacio
        self.layout.add_widget(Widget(width=10)) #(2,0)

        #texto de retroalimentación
        self.classText = Label(text="Clase detectada: ",
                               valign='bottom',
                               size_hint=(1,0.1))
        self.layout.add_widget(self.classText) #(3,0)     

        fps = self.cap.get(cv.CAP_PROP_FPS)
        print("FPS de la cámara:", fps)  

    def updateFrame(self,dt):
        frameTexture, detectedClass, detectedAccuracy= self.controlador.updateFrame()
        if frameTexture:
            self.image.texture = frameTexture
            if detectedClass:
                self.classText.text = f"Clase detectada: {detectedClass} con {detectedAccuracy} de confianza"

    def updateImage(self,letter):
        self.selectedLetterImage.source = f"img/{letter}.png"
        self.selectedLetterImage.reload()