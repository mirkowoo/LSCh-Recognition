import cv2 as cv
from PyQt5.QtWidgets import QApplication,QWidget,QLabel,QPushButton,QVBoxLayout,QGridLayout,QRadioButton,QComboBox, QGraphicsOpacityEffect
from PyQt5.QtGui import QPixmap,QImage,QFont
from PyQt5.QtCore import QTimer, Qt, QPropertyAnimation
import time
import random
import itertools

class AbcDetectionView(QWidget):
    def __init__(self,controller):
        super().__init__()
        self.controlador = controller
        self.arrayPos = 0 
        self.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']  # Initialize letters
        #self.startTimer()
        self.cap = None
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.updateImageData)
        self.lastDetectedClass = ""
        self.lastDetectedAccuracy = 0
        self.automaticMode = False
        self.letterPoints = 0


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
        #bigLetterLabel{{
                font-size: 100px;
            }}
        #feedbackLabel{{
            font-size: 120px;
            font-weight: bold;
        }}
        """

        self.setStyleSheet(self.stylesheet)

        self.viewAbcDetectionScreen()

    def viewAbcDetectionScreen(self):

        #Configuracioens de la interfaz
        self.setWindowTitle("Detección en tiempo real")
        self.showMaximized()
        #self.setGeometry(100,100,800,600)

        # Crear widgets
        self.listedCameras = QComboBox(self)
        self.cameraImage = QLabel(self)
        self.buttonLeft = QPushButton("⟵", self)
        self.buttonRight = QPushButton("⟶", self)
        self.detectedClassLabel = QLabel("Clase detectada: ", self)
        self.detectedAccuracyLabel = QLabel("Precisión: ", self)
        self.selectedLetter = QLabel(f"Letra seleccionada: {self.letters[self.arrayPos]}", self)
        self.lastDetectionLabel = QLabel("Última detección: ", self)
        self.bestDetectionLabel = QLabel("Mejor detección: ", self)
        self.selectedLetterImage = QLabel(self)
        self.selectedLetterImage.setPixmap(QPixmap(f"img/{self.letters[self.arrayPos]}.png"))
        #self.selectedFps = QComboBox(self)
        self.selectLetterComboBox = QComboBox(self)
        self.currentFpsLabel = QLabel("FPS: ", self)
        self.backButton = QPushButton("Volver", self)
        self.automaticModeButton = QRadioButton("Modo automático", self)
        
        self.correctDetectionTimeLabel = QLabel("Tiempo de detección: 0.00s")
        self.correctDetectionTimeLabel.setAlignment(Qt.AlignCenter)

        self.feedbackLabel = QLabel(self)
        self.feedbackLabel.setAlignment(Qt.AlignCenter)
        self.feedbackLabel.setObjectName("feedbackLabel")
        self.feedbackOpacityEffect = QGraphicsOpacityEffect()
        self.feedbackLabel.setGraphicsEffect(self.feedbackOpacityEffect)
        self.feedbackLabel.maximumHeight = 50

        self.bigLetterLabel = QLabel(self)
        self.bigLetterLabel.setText(self.letters[self.arrayPos])
        self.bigLetterLabel.setFont(QFont('OpenDyslexic', 100,QFont.Bold))
        self.bigLetterLabel.setAlignment(Qt.AlignCenter)
        self.bigLetterLabel.setObjectName("bigLetterLabel")
        

        #conectar señales 
        self.buttonLeft.clicked.connect(lambda: self.moveArray("left"))
        self.buttonRight.clicked.connect(lambda: self.moveArray("right"))
        self.backButton.clicked.connect(lambda: self.controlador.showPage(1))
        self.listedCameras.currentIndexChanged.connect(lambda: [self.updateCamera(self.listedCameras.currentIndex())])
        #self.selectedFps.currentIndexChanged.connect(lambda: [self.updateTimer()])
        self.selectLetterComboBox.currentIndexChanged.connect(lambda: [self.setArrayPos(self.selectLetterComboBox.currentIndex()),self.updateSelectedImage()])
        self.automaticModeButton.clicked.connect(lambda: self.changeMode())
        #self.activatecameraButton.clicked.connect(lambda: self.activateCamera(self.listedCameras.currentIndex()))

        #Configuraciones de los widgets
        self.detectCameras()
        #self.selectedFps.addItems(["15","30","60","120","240","ilimitado"])
        self.selectLetterComboBox.addItems(self.letters)

        #ajustes visuales
        #self.backButton.setMaximumWidth(100)

        self.buttonLeft.setMinimumSize(200,50)
        
        self.buttonRight.setMinimumSize(200,50)

        self.space = QWidget()
                             

        #layout para la cámara y retroalimentación
        self.cameraLayout = QVBoxLayout()
        self.cameraLayout.addWidget(self.space)
        self.cameraLayout.addWidget(self.cameraImage)
        self.cameraLayout.addWidget(self.feedbackLabel)

        

        self.bigLetterLayout = QVBoxLayout()
        self.bigLetterLayout.addWidget(self.space)
        self.bigLetterLayout.addWidget(self.bigLetterLabel)
        self.bigLetterLayout.addWidget(self.correctDetectionTimeLabel)

        #layout para los textos de respuesta
        self.textLayout = QVBoxLayout()
        self.textLayout.setSpacing(5)
        self.textLayout.addWidget(self.automaticModeButton)
        self.textLayout.addWidget(self.detectedClassLabel)
        self.textLayout.addWidget(self.detectedAccuracyLabel)
        self.textLayout.addWidget(self.selectedLetter)
        self.textLayout.addWidget(self.lastDetectionLabel)
        self.textLayout.addWidget(self.bestDetectionLabel)

        self.detectedAccuracyLabel.setFixedWidth(300)
        self.detectedClassLabel.setFixedWidth(300)
        #self.feedbackLabel.setFixedHeight(100)

        #crear layout principal
        layout = QGridLayout()
        
        #agregar widgts
        #layout.addWidget(self.label,0,0,1,1)
        layout.addWidget(self.backButton,0,0,1,1)
        layout.addWidget(self.listedCameras,0,1,1,1)
        #layout.addWidget(self.selectedFps,0,2,1,1)
        layout.addWidget(self.selectLetterComboBox,0,2,1,1)
        #layout.addWidget(self.currentFpsLabel,0,2,1,1)
        #layout.addWidget(self.activatecameraButton,0,3,1,1)
        #layout.addWidget(self.cameraImage,1,1,1,1)
        layout.addLayout(self.cameraLayout,1,1,1,1)
        layout.addWidget(self.selectedLetterImage,1,2,1,1)
        layout.addLayout(self.bigLetterLayout,1,0,1,1)
        #layout.addWidget(self.bigLetterLabel,1,0,1,1)
        layout.setAlignment(self.selectedLetterImage, Qt.AlignCenter)
        layout.addWidget(self.buttonLeft,2,0,1,1)
        layout.addWidget(self.buttonRight,2,2,1,1)
        layout.addLayout(self.textLayout,2,1,1,1)
        #layout.addWidget(self.detectedClassLabel,3,1,1,1)
        #layout.addWidget(self.detectedAccuracyLabel,4,1,1,1)
        #layout.addWidget(self.selectedLetter,5,1,1,1)

        # Añadir layout a la ventana
        self.setLayout(layout)

        self.last_time = time.time()

        self.colors = itertools.cycle(['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'])
        self.change_feedback_color()

    def change_feedback_color(self):
        next_color = next(self.colors)
        self.feedbackLabel.setStyleSheet(f"color: {next_color}")
        QTimer.singleShot(500,self.change_feedback_color)

    def setArrayPos(self, index):
        self.arrayPos = index

    def changeMode(self):
        if self.automaticMode:
            self.automaticMode = False
        else:
            self.automaticMode = True

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

    def updateLabel(self, counter):
        self.label.setText(f"Contador: {counter}")

    #Correr updateframe cada 10ms
    def startTimer(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.updateImageData)
        self.timer.start(66)
    
    def updateTimer(self):
        if self.timer.isActive():
            self.timer.stop()
        # fpstext = self.selectedFps.currentText()
        self.timer.start(int(1000/int(float(30))))
        # if self.selectedFps.currentText() == "ilimitado":
        #     self.timer.start(0)
        # else:
        #     self.timer.start(int(1000/int(float(fpstext))))

    def startCamera(self):
        self.cap = cv.VideoCapture(0)
        self.controlador.updateCamera(0)
        self.startTimer()

    def stopCamera(self):
        self.timer.stop()
        if self.cap:
            self.cap.release()
            self.cap = None

    def updateImageData(self):
        frame, detectedClass, detectedAccuracy = self.controlador.updateFrame()
        if frame is not None:
            height, width, channel = frame.shape
            bytesPerLine = 3 * width
            qImg = QImage(frame.data, width, height, bytesPerLine, QImage.Format_RGB888)
            self.cameraImage.setPixmap(QPixmap.fromImage(qImg))
            # Actualizar etiquetas de clase detectada y precisión
            self.detectedClassLabel.setText(f"Clase detectada: {detectedClass}")
            self.detectedAccuracyLabel.setText(f"Precisión: {detectedAccuracy:.2f}%")
            # Actualizar la mejor detección
            if self.controlador.getPrecision(self.letters[self.arrayPos]) is not None:
                self.bestDetectionLabel.setText(f"Mejor detección de {self.letters[self.arrayPos]}: {self.controlador.getPrecision(self.letters[self.arrayPos]):.2f} %")
            # Inicializar el temporizador y el contador si no existen
            if not hasattr(self, 'correctDetectionTime'):
                self.correctDetectionTime = 0
            if not hasattr(self, 'lastDetectionTime'):
                self.lastDetectionTime = time.time()

            currentTime = time.time()
            if detectedClass == [self.letters[self.arrayPos]]:
                self.correctDetectionTime += currentTime - self.lastDetectionTime
                self.lastDetectionTime = currentTime
                self.correctDetectionTimeLabel.setText(f"Tiempo de detección: {self.correctDetectionTime:.2f}s")
                # Cambiar el color progresivamente
                progress = min(self.correctDetectionTime / 5.0, 1.0)
                greenValue = int(255 * progress)
                redValue = 255 - greenValue
                self.bigLetterLabel.setStyleSheet(f"color: rgb({redValue}, {greenValue}, 0)")
                # Cambiar de letra automáticamente si se activa el modo automático y se ha detectado correctamente durante 5 segundos
                if self.correctDetectionTime >= 5.0:
                    feedback_options = ["Muy bien", "Excelente", "Bien hecho", "Perfecto"]
                    feedback = random.choice(feedback_options)
                    self.feedbackLabel.setText(feedback)
                    self.startFeedbackFadeOut()
                    if self.automaticMode:
                        self.moveArray("right")
                    self.correctDetectionTime = 0  # Reiniciar el contador
            else:
                self.correctDetectionTime = 0
                self.lastDetectionTime = currentTime  # Reiniciar el tiempo de detección
                self.bigLetterLabel.setStyleSheet("color: red")
                self.correctDetectionTimeLabel.setText(f"Tiempo de detección: 0.00s")

            self.bigLetterLabel.setText(self.letters[self.arrayPos])
            # Guardar y mostrar la última detección
            if detectedClass != []:
                self.lastDetectedClass = detectedClass  # Actualizar la última clase detectada
                self.lastDetectedAccuracy = detectedAccuracy  # Actualizar la última precisión detectada
                self.lastDetectionLabel.setText(f"Última detección: {self.lastDetectedClass} con {self.lastDetectedAccuracy:.2f}% de precisión")
            else:
                # Si no hay detección nueva, mostrar la última detectada
                self.lastDetectionLabel.setText(f"Última detección: {self.lastDetectedClass} con {self.lastDetectedAccuracy:.2f}% de precisión")


    def startFeedbackFadeOut(self):
        self.feedbackAnimation = QPropertyAnimation(self.feedbackOpacityEffect, b"opacity")
        self.feedbackAnimation.setDuration(2000)  # Duración de la animación en milisegundos
        self.feedbackAnimation.setStartValue(1)
        self.feedbackAnimation.setEndValue(0)

        # Usar QTimer para retrasar el inicio de la animación
        QTimer.singleShot(0, self.feedbackAnimation.start)

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
    
    def updateCamera(self,index):
        print(index)
        self.controlador.updateCamera(index)

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