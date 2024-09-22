from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton
from PyQt5.QtCore import Qt

class HomeScreen(QWidget):
    def __init__(self,controller):
        self.controlador = controller
        super().__init__()
        self.viewHomeScreen()

    def viewHomeScreen(self):
        self.setWindowTitle("Home Page")

        #botones de la pantalla principal
        self.activitiesButton = QPushButton("Explorar Actividades",)
        self.progressButton = QPushButton("Ver Progreso")

        #Ajustes visuales de los botones
        self.activitiesButton.setMinimumSize(200,50)
        self.activitiesButton.setMaximumSize(400,100)

        self.progressButton.setMinimumSize(200,50)
        self.progressButton.setMaximumSize(400,100)

        #conectar botones a funciones
        self.activitiesButton.clicked.connect(lambda: self.controlador.showPage(1))
        self.progressButton.clicked.connect(lambda: self.controlador.showPage(2))

        #layout de la pantalla principal
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignCenter)
        
        #añadir botones al layout
        layout.addWidget(self.activitiesButton)
        layout.addWidget(self.progressButton)

        self.setLayout(layout)