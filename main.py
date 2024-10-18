import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QLabel, QPushButton, QVBoxLayout, QWidget   
from PyQt5.QtGui import QFont, QFontDatabase
from modelo.model import Model
from controlador.controller import Controller

if __name__ == "__main__":
    
    app = QApplication(sys.argv)
    #cambiar el color de fondo de la aplicación
    app.setStyleSheet("background-color: #EAE8FF;")
    model = Model(cameraIndex=0)
    controller = Controller()  

    controller.pages.setWindowTitle("Aplicación ABC")
    controller.pages.showMaximized()

    sys.exit(app.exec_())