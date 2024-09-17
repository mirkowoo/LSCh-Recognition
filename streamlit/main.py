import streamlit as st
from vista.home import mostrarPaginaPrincipal
from vista.detection import mostrarPaginaDetection
from vista.progress import mostrarPaginaProgress

st.set_page_config(page_title="LSCh detection", page_icon="👋", layout="wide")
st.markdown("""
    <style>
    .stApp {
        background-color: #333333;
        color: white;
    }
    </style>
""", unsafe_allow_html=True)
def main():


    

    #Inicialización de la variable de estado
    if "page" not in st.session_state:
        st.session_state.page = "Home"

    st.sidebar.title("Menú")

    #Botones de la Sidebar
    if st.sidebar.button("Home"):
        st.session_state.page = "Home"
    if st.sidebar.button("Actividades"):
        st.session_state.page = "Activity Selection"
    if st.sidebar.button("Progreso"):
        st.session_state.page = "Progreso"
    
    #Mostrar la página correspondiente
    if st.session_state.page == "Home":
        mostrarPaginaPrincipal()
    elif st.session_state.page == "Activity Selection":
        mostrarPaginaDetection()
    elif st.session_state.page == "Progreso":
        mostrarPaginaProgress()

if __name__ == "__main__":
    main()