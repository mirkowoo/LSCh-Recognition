import streamlit as st
from controlador.controlador import Controlador
from PIL import Image
import cv2 as cv

def mostrarPaginaDetection():
    
    def listCameras():
        index = 0
        arr = []
        while True:
            cap = cv.VideoCapture(index)
            if not cap.read()[0]:
                break
            else:
                arr.append(index)
            cap.release()
            index += 1
        return arr
    
    st.markdown("""
        <script src="controlador/cameraPermission.js"></script>
        <button onclick="requestCameraPermission()">Solicitar permiso para la cámara</button>
        <p id="camera-status"></p>
    """, unsafe_allow_html=True)

    cameras = listCameras()

    if not cameras:
        st.error("No se encontraron cámaras disponibles.")
    else:
        cameraIndex = st.selectbox("Selecciona la cámara",cameras)

        controlador = Controlador(cameraIndex)

    letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

    st.title("Detección en tiempo real")

    col1,col2,col3 = st.columns([1,2,1])
    
    with col2:
        stframe = st.empty()

        left,center,right = st.columns([1,2,1])
        with left:
            st.button("⟵",key="goLeft")
        with center:
            textClass = st.empty()
            textAccuracy = st.empty()
            textLastClass = ''
            textLastAccuracy = 0
            textBestAccuracy = st.empty()
            st.button("Modo automático",key="goAuto")
        with right:
            st.button("⟶",key="goRight")

    while True:
        frame, detectedClass, detectedAccuracy = controlador.updateFrameC()

        if frame is not None:

            #mostrar imagen con anotaciones
            stframe.image(frame,channels="RGB",use_column_width=False,width=720)

            #Mostrar la clase y la precisión detectadas
            if detectedClass is not None:
                textClass.text("Clase detectada: {}".format(detectedClass))
                textAccuracy.text("Precisión: {:.2f}%".format(detectedAccuracy))

                textLastClass = detectedClass
                textLastAccuracy = detectedAccuracy
            else:
                textClass.text("Última clase detectada: {}".format(textLastClass))
                textAccuracy.text("Última precisión: {:.2f}%".format(textLastAccuracy))
            if(len(detectedClass) > 0):
                print("Detected class: ", detectedClass)
                textBestAccuracy.text("Mejor precisión: {:.2f}%".format(controlador.get_precision(detectedClass[0])))
            else:
                textBestAccuracy.text("No hay mejor precisión.")

