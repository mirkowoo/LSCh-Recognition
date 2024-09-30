from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton,QComboBox, QApplication
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFontDatabase, QFont

class HomeScreen(QWidget):
    def __init__(self,controller):
        self.controlador = controller
        super().__init__()

        font_id = QFontDatabase.addApplicationFont("fonts/OpenDyslexic-Regular.otf")
        if font_id == -1:
            print("Error al cargar la fuente")
        else:
            self.font_family = QFontDatabase.applicationFontFamilies(font_id)[0]

        self.viewHomeScreen()

    def viewHomeScreen(self):
        self.setWindowTitle("Home Page")

        #botones de la pantalla principal
        self.activitiesButton = QPushButton("Explorar Actividades",)
        self.progressButton = QPushButton("Ver Progreso")
        self.fontSelector = QComboBox(self)

        #Ajustes visuales de los botones
        self.activitiesButton.setMinimumSize(200,50)
        self.activitiesButton.setMaximumSize(400,100)

        self.progressButton.setMinimumSize(200,50)
        self.progressButton.setMaximumSize(400,100)


        #conectar botones a funciones
        self.activitiesButton.clicked.connect(lambda: self.controlador.showPage(1))
        self.progressButton.clicked.connect(lambda: self.controlador.showPage(2))
        self.fontSelector.currentIndexChanged.connect(lambda: [self.controlador.changeFont(self.fontSelector.currentText())])

        #configuracion widgets
        self.fontSelector.addItems(["Arial","OpenDyslexic"])

        #layout de la pantalla principal
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignCenter)
        
        #añadir botones al layout
        layout.addWidget(self.activitiesButton)
        layout.addWidget(self.progressButton)
        layout.addWidget(self.fontSelector)

        self.setLayout(layout)