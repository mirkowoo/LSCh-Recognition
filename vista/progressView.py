from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QTableWidget, QTableWidgetItem
from PyQt5.QtCore import Qt

class ProgressView(QWidget):
    def __init__(self, controller):
        super().__init__()
        self.controlador = controller
        self.letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"]

        # Define individual styles for this screen
        self.stylesheet = """
        QPushButton {
            background-color: #83ADFF;
            color: #2D3142;
            font-size: 18px;
            border-radius: 8px;
            padding: 10px;
        }
        QPushButton:hover {
            background-color: #B0D7FF;
        }
        QPushButton#confirmButton {
            background-color: #FF6B6B;
            color: white;
        }
        QPushButton#confirmButton:hover {
            background-color: #FF4C4C;
        }
        QLabel {
            font-size: 18px;
            color: #2D3142;
        }
        QComboBox {
            font-size: 18px;
            background-color: #D8D5DB;
            color: #2D3142;
        }
        """

        self.setStyleSheet(self.stylesheet)
        self.viewPreviewView()

    def mostrarProgresoAbc(self):
        for i, letter in enumerate(self.letters):
            self.table.setItem(i, 0, QTableWidgetItem(letter))
            if self.controlador.getPrecision(letter) is None:
                self.table.setItem(i, 1, QTableWidgetItem("0%"))
            else:
                self.table.setItem(i, 1, QTableWidgetItem(f"{self.controlador.getPrecision(letter):.2f} %"))

    def viewPreviewView(self):
        self.setWindowTitle("Progreso")

        # widgets de la pantalla de progreso
        self.backButton = QPushButton("Volver")
        self.title = QLabel("Progreso")
        self.deleteButton = QPushButton("Borrar Progreso")
        self.confirmButton = QPushButton("Confirmar Borrado")
        self.confirmButton.setObjectName("confirmButton")
        self.confirmButton.setVisible(False)

        # crear tabla
        self.table = QTableWidget()
        self.table.setRowCount(25)
        self.table.setColumnCount(2)
        self.table.setHorizontalHeaderLabels(["Letra", "Mejor Precisión"])
        self.mostrarProgresoAbc()

        # conectar botones a funciones
        self.backButton.clicked.connect(lambda: self.controlador.showPage(0))
        self.deleteButton.clicked.connect(self.showConfirmButton)
        self.confirmButton.clicked.connect(self.confirmDelete)

        # layout de la pantalla de progreso
        layout = QVBoxLayout()

        # añadir botones al layout
        layout.addWidget(self.backButton)
        layout.addWidget(self.title)
        layout.addWidget(self.table)
        layout.addWidget(self.deleteButton)
        layout.addWidget(self.confirmButton)

        self.setLayout(layout)

    def showConfirmButton(self):
        self.deleteButton.setVisible(False)
        self.confirmButton.setVisible(True)

    def confirmDelete(self):
        self.controlador.deleteData()
        self.mostrarProgresoAbc()
        self.confirmButton.setVisible(False)
        self.deleteButton.setVisible(True)

    def resetButtons(self):
        self.confirmButton.setVisible(False)
        self.deleteButton.setVisible(True)

    def showEvent(self, event):
        self.mostrarProgresoAbc()
        self.resetButtons()
        super().showEvent(event)