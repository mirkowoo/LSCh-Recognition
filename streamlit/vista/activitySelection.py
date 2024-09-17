import streamlit as st
from vista.detection  import mostrarPaginaDetection

def mostrarPaginaActivitySelection():

    #limpiar la página anterior
    st.empty()

    st.title("Selección de Actividad")
    st.write("Selecciona la actividad que deseas realizar.")


    col1, col2 , col3= st.columns(3)

    with col2:
        st.button("Abecedario",on_click=mostrarPaginaDetection)
        st.button("Comunicación Básica")
        st.button("Volver")
