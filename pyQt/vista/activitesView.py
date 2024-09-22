from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton
from PyQt5.QtCore import Qt

class ActivitiesView(QWidget):
    def __init__(self,controller):
        super().__init__()
        self.controlador = controller
        self.viewActivitiesView()
    
    def viewActivitiesView(self):

        self.setWindowTitle("Actividades")

        #widgets de la pantalla de actividades
        self.backButton = QPushButton("Volver")
        self.title = QLabel("Selecciona una actividad")
        self.abcDetectionButton = QPushButton("Detección ABC")

        #conectar botones a funciones
        self.abcDetectionButton.clicked.connect(lambda: self.controlador.showPage(3))
        self.backButton.clicked.connect(lambda: self.controlador.showPage(0))

        #layout de la pantalla de actividades
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignCenter)

        #añadir botones al layout
        layout.addWidget(self.backButton)
        layout.addWidget(self.title)
        layout.addWidget(self.abcDetectionButton)

        self.setLayout(layout)