from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QGridLayout, QRadioButton, QComboBox
from PyQt5.QtCore import Qt, QSize
from PyQt5.QtGui import QFont

class ActivitiesView(QWidget):
    def __init__(self,controller):
        super().__init__()
        self.controlador = controller

        # Define individual styles for this screen
        self.stylesheet = f"""
        QPushButton {{
            background-color: #83ADFF;
            color: #2D3142;
            font-size: 18px;
            border-radius: 8px;
            padding: 10px;
        }}
        QPushButton:hover {{
            background-color: #B0D7FF;
        }}
        QLabel {{
            font-size: 18px;
            color: #2D3142;
        }}
        QComboBox {{
            font-size: 18px;
            background-color: #D8D5DB;
            color: #2D3142;
        }}
        """

        self.setStyleSheet(self.stylesheet)

        self.viewActivitiesView()
    
    def viewActivitiesView(self):

        self.setWindowTitle("Actividades")

        #widgets de la pantalla de actividades
        self.backButton = QPushButton("Volver")
        self.title = QLabel("Selecciona una actividad")
        self.abcDetectionButton = QPushButton("Detección ABC")
        #self.comunicacionBasicaButton = QPushButton("Comunicación Básica")

        #conectar botones a funciones
        self.abcDetectionButton.clicked.connect(lambda: self.controlador.showPage(3))
        self.backButton.clicked.connect(lambda: self.controlador.showPage(0))

        #layout de la pantalla de actividades
        layout = QGridLayout()
        layout.setAlignment(Qt.AlignCenter)

        #añadir botones al layout
        layout.addWidget(self.backButton,0,0,1,1)
        layout.addWidget(self.title,0,1,1,1)
        layout.addWidget(self.abcDetectionButton,1,1,1,1)
        #layout.addWidget(self.comunicacionBasicaButton,2,1,1,1)

        #arreglos visuales
        #self.title.setFont(QFont(24))
        self.abcDetectionButton.setMinimumSize(200,50)
        self.abcDetectionButton.setMaximumSize(400,100)
        #self.comunicacionBasicaButton.setMinimumSize(200,50)
        #self.comunicacionBasicaButton.setMaximumSize(400,100)
        #self.comunicacionBasicaButton.setEnabled(False)

        self.setLayout(layout)