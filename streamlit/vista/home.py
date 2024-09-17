import streamlit as st
from vista.detection import mostrarPaginaDetection
from vista.progress import mostrarPaginaProgress
from vista.activitySelection import mostrarPaginaActivitySelection

def mostrarPaginaPrincipal():

    if "page" not in st.session_state:
        st.session_state.page = "Home"


    st.title("LSCh detection")
    st.write("Bienvenido a LSCh detection, la aplicación que te permite detectar señas de Lengua de Señas Chilena en tiempo real.")
    st.write("Para comenzar, selecciona la página que deseas visitar en el menú de la izquierda.")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Actividades",key="menuActivity"):
            st.session_state.page = "Activity Selector"

    with col2:
        if st.button("Progreso",key="menuProgress"):
            st.session_state.page = "Progreso"
    
    if st.session_state.page == "Activity Selector":
        st.empty()
        mostrarPaginaActivitySelection()
    elif st.session_state.page == "Progreso":
        st.empty()
        mostrarPaginaProgress()