import streamlit as st
from controlador.controlador import Controlador
from PIL import Image

def mostrarInterfaz(modelo):
    st.title("LSCh detection")

    controlador = Controlador()

    stframe = st.empty()
    textClass = st.empty()
    textAccuracy = st.empty()
    textBestAccuracy = st.empty()

    while True:
        frame, detectedClass, detectedAccuracy = modelo.updateFrameC()

        if frame is not None:

            #mostrar imagen con anotaciones
            stframe.image(frame,channels="RGB",use_column_width=True)

            #Mostrar la clase y la precisión detectadas
            textClass.text("Clase detectada: {}".format(detectedClass))
            textAccuracy.text("Precisión: {:.2f}%".format(detectedAccuracy))
            if(len(detectedClass) > 0):
                print("Detected class: ", detectedClass)
                textBestAccuracy.text("Mejor precisión: {:.2f}%".format(controlador.get_precision(detectedClass[0])*100))
            else:
                textBestAccuracy.text("No hay mejor precisión.")

        else:
            textClass.write("No se detectaron señas.")
            textAccuracy.text("")
    