import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QLabel, QPushButton, QVBoxLayout, QWidget   
from modelo.model import Model
from controlador.controller import Controller

if __name__ == "__main__":
    app = QApplication(sys.argv)

    model = Model()
    controller = Controller()  

    controller.pages.setWindowTitle("Aplicación ABC")
    controller.pages.showMaximized()

    sys.exit(app.exec_())