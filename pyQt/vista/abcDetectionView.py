import cv2 as cv
from PyQt5.QtWidgets import QApplication,QWidget,QLabel,QPushButton,QVBoxLayout,QGridLayout,QRadioButton,QComboBox
from PyQt5.QtGui import QPixmap,QImage
from PyQt5.QtCore import QTimer, Qt

class AbcDetectionView(QWidget):
    def __init__(self,controller):
        super().__init__()
        self.controlador = controller
        self.arrayPos = 0 
        self.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']  # Initialize letters
        
        self.startTimer()
        self.timer.timeout.connect(self.updateImageData)
        self.cap = None
        self.viewAbcDetectionScreen()

    def viewAbcDetectionScreen(self):

        #Configuracioens de la interfaz
        self.setWindowTitle("Detección en tiempo real")
        self.showMaximized()
        #self.setGeometry(100,100,800,600)

        # Crear widgets
        self.label = QLabel("Contador : 0", self)
        self.incrementarButton = QPushButton("Incrementar", self)
        self.decrementarButton = QPushButton("Decrementar", self)
        self.activatecameraButton = QPushButton("Activar cámara", self)
        self.listedCameras = QComboBox(self)
        self.cameraImage = QLabel(self)
        self.buttonLeft = QPushButton("Left", self)
        self.buttonRight = QPushButton("Right", self)
        self.detectedClassLabel = QLabel("Clase detectada: ", self)
        self.detectedAccuracyLabel = QLabel("Precisión: ", self)
        self.selectedLetter = QLabel(f"Letra seleccionada: {self.letters[self.arrayPos]}", self)
        self.selectedLetterImage = QLabel(self)
        self.selectedLetterImage.setPixmap(QPixmap(f"img/{self.letters[self.arrayPos]}.png"))
        self.backButton = QPushButton("Volver", self)

        #conectar señales 
        self.incrementarButton.clicked.connect(self.incrementCounter)
        self.decrementarButton.clicked.connect(self.decrementCounter)
        self.buttonLeft.clicked.connect(lambda: self.moveArray("left"))
        self.buttonRight.clicked.connect(lambda: self.moveArray("right"))
        self.backButton.clicked.connect(lambda: self.controlador.showPage(1))
        self.listedCameras.currentIndexChanged.connect(lambda: self.activateCamera(self.listedCameras.currentIndex()))
        #self.activatecameraButton.clicked.connect(lambda: self.activateCamera(self.listedCameras.currentIndex()))

        self.detectCameras()

        #crear layout
        layout = QGridLayout()

        #agregar widgts
        #layout.addWidget(self.label,0,0,1,1)
        #layout.addWidget(self.incrementarButton,1,0,1,1)
        #layout.addWidget(self.decrementarButton,2,0,1,1)
        layout.addWidget(self.backButton,0,0,1,1)
        layout.addWidget(QWidget(),0,2,1,1)
        layout.addWidget(self.listedCameras,0,1,1,1)
        #layout.addWidget(self.activatecameraButton,0,3,1,1)
        layout.addWidget(self.cameraImage,1,1,1,1)
        layout.addWidget(self.selectedLetterImage,1,2,1,1)
        layout.setAlignment(self.selectedLetterImage, Qt.AlignCenter)
        layout.addWidget(self.buttonLeft,2,0,1,1)
        layout.addWidget(self.buttonRight,2,2,1,1)
        layout.addWidget(self.detectedClassLabel,3,1,1,1)
        layout.addWidget(self.detectedAccuracyLabel,4,1,1,1)
        layout.addWidget(self.selectedLetter,5,1,1,1)

        self.setLayout(layout)
    # Verificar si el array de las letras da la vuelta
    def checkArrayPos(self):
        if self.arrayPos < 0:
            self.arrayPos = 25
        elif self.arrayPos > 25:
            self.arrayPos = 0

    def updateSelectedImage(self):
        self.selectedLetterImage.setPixmap(QPixmap(f"img/{self.letters[self.arrayPos]}.png"))

    def moveArray(self, direction):
        if direction == "left":
            self.arrayPos -= 1
        elif direction == "right":
            self.arrayPos += 1
        self.checkArrayPos()
        self.updateSelectedImage()
        self.selectedLetter.setText(f"Letra seleccionada: {self.letters[self.arrayPos]}")


    def incrementCounter(self):
        newCounter = self.controlador.incrementCounter()
        self.updateLabel(newCounter)
        

    def decrementCounter(self):
        newCounter = self.controlador.decrementCounter()
        self.updateLabel(newCounter)

    def updateLabel(self, counter):
        self.label.setText(f"Contador: {counter}")
    #Correr updateframe cada 1ms
    def startTimer(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.updateImageData)
        self.timer.start(1)
    
    def startCamera(self):
        self.cap = cv.VideoCapture(1)

    def stopCamera(self):
        self.timer.stop()
        if self.cap:
            self.cap.release()
            self.cap = None

    def updateImageData(self):
        frame,detectedClass, detectedAccuracy = self.controlador.updateFrame()
        if frame is not None:
            height, width, channel = frame.shape
            bytesPerLine = 3 * width
            qImg = QImage(frame.data, width, height, bytesPerLine, QImage.Format_RGB888)
            self.cameraImage.setPixmap(QPixmap.fromImage(qImg))
            self.detectedClassLabel.setText(f"Clase detectada: {detectedClass}")
            self.detectedAccuracyLabel.setText(f"Precisión: {detectedAccuracy:.2f}%")

    # Obtener una lista de las cámaras disponibles
    def detectCameras(self):
            index = 0
            arr = []
            while True:
                cap = cv.VideoCapture(index)
                if not cap.read()[0]:
                    break
                else:
                    arr.append(f"Camera {index}")
                    self.listedCameras.addItem(f"Camera {index}")
                cap.release()
                index += 1
            if not arr:
                self.listedCameras.addItem("No se encontraron cámaras")
    
    def activateCamera(self, index):
        if self.cap:
            self.cap.release()  
        self.cap = cv.VideoCapture(index)
        if not self.cap.isOpened():
            print(f"Error: No se pudo abrir la cámara {index}")


    def showEvent(self, event):
        self.startCamera()
        super().showEvent(event)
        
    def hideEvent(self, event):
        self.stopCamera()
        super().hideEvent(event)