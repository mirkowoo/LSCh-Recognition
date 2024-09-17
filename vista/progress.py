import streamlit as st
from controlador.controlador import Controlador
   

def mostrarPaginaProgress():


    controlador = Controlador()

    letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

    st.title("Progreso")
    st.write("Esta es la página de progreso.")

    st.divider()

    suma = 0

    st.write("Mejores precisiones:")
    st.write("""
            | Letra | Precisión |
            |-------|-----------|
             """)
    for letter in letters:
        precision = controlador.get_precision(letter)
        if precision is not None:
            suma += precision
            st.write("| {}  | {:.2f}%   |".format(letter,precision))
        else:
            st.write("{}: 0%.".format(letter))
    
    st.divider()

    st.write("Promedio de precisión: {:.2f}%".format(suma/len(letters)))
    