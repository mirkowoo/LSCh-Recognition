from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QTableWidget,QTableWidgetItem
from PyQt5.QtCore import Qt

class ProgressView(QWidget):
    def __init__(self,controller):
        super().__init__()
        self.controlador = controller
        self.letters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y"]
        self.viewPreviewView()   

    def mostrarProgresoAbc(self):
        for i,letter in enumerate(self.letters):
            self.table.setItem(i,0,QTableWidgetItem(letter))
            self.table.setItem(i,1,QTableWidgetItem(str(f"{self.controlador.getPrecision(letter):.2f} %")))
            
    def viewPreviewView(self):

        self.setWindowTitle("Progreso")
        
        #widgets de la pantalla de progreso
        self.backButton = QPushButton("Volver")
        self.title = QLabel("Progreso")
        self.deleteButton = QPushButton("Borrar Progreso")

        #crear tabla
        self.table = QTableWidget()
        self.table.setRowCount(25)
        self.table.setColumnCount(2)
        self.table.setHorizontalHeaderLabels(["Letra","Mejor Precisión"])
        self.mostrarProgresoAbc()

        #conectar botones a funciones
        self.backButton.clicked.connect(lambda: self.controlador.showPage(0))
        self.deleteButton.clicked.connect(lambda: [self.controlador.deleteData(),self.mostrarProgresoAbc()])

        #layout de la pantalla de progreso
        layout = QVBoxLayout()
        
        #añadir botones al layout
        layout.addWidget(self.backButton)
        layout.addWidget(self.title)
        layout.addWidget(self.table)
        layout.addWidget(self.deleteButton)

        self.setLayout(layout)
    
    def showEvent(self,event):
        self.mostrarProgresoAbc()
        super().showEvent(event)