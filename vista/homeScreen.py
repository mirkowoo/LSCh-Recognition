from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QComboBox, QApplication, QHBoxLayout
from PyQt5.QtCore import Qt, QPropertyAnimation, QRect
from PyQt5.QtGui import QFontDatabase, QFont

class HomeScreen(QWidget):
    def __init__(self, controller):
        self.controlador = controller
        super().__init__()

        # Load the fonts
        font_id = QFontDatabase.addApplicationFont("fonts/OpenDyslexic-Regular.otf")
        if font_id == -1:
            print("Error al cargar la fuente")
        else:
            self.font_family = QFontDatabase.applicationFontFamilies(font_id)[0]

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
            font-size: 20px;
            color: #2D3142;
        }}
        QComboBox {{
            font-size: 18px;
            background-color: #D8D5DB;
            color: #2D3142;
        }}
        """

        self.setStyleSheet(self.stylesheet)

        

        self.viewHomeScreen()

    def viewHomeScreen(self):

        
        
        self.setWindowTitle("Home Page")

        self.setGeometry(100, 100, 600, 400)

        # Title label
        self.titulo = QLabel("Detector de LSCh", self)

        # Buttons
        self.activitiesButton = QPushButton("Explorar Actividades")
        self.progressButton = QPushButton("Ver Progreso")

        # Font selector combo box
        self.fontSelector = QComboBox(self)
        self.fontSelector.addItems(["Arial", "OpenDyslexic"])

        # Label for developer signature
        self.mirkowooLabel = QLabel("mirkowoo", self)

        # Button size adjustments
        self.activitiesButton.setMinimumSize(200, 50)
        self.activitiesButton.setMaximumSize(400, 100)

        self.progressButton.setMinimumSize(200, 50)
        self.progressButton.setMaximumSize(400, 100)

        # Connect buttons to functions
        self.activitiesButton.clicked.connect(lambda: self.controlador.showPage(1))
        self.progressButton.clicked.connect(lambda: self.controlador.showPage(2))

        # Connect font selector to the updateFont method
        self.fontSelector.currentIndexChanged.connect(lambda: self.controlador.changeFont(self.fontSelector.currentText()))

        # Layout for the home screen
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignCenter)

        # Add widgets to the layout
        layout.addWidget(self.titulo)
        layout.addWidget(self.activitiesButton)
        layout.addWidget(self.progressButton)
        layout.addWidget(self.fontSelector)
        layout.addWidget(self.mirkowooLabel)

        self.setLayout(layout)

        self.controlador.changeFont(self.fontSelector.currentText())