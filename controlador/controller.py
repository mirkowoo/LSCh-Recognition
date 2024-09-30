from modelo.model import Model
from PyQt5.QtWidgets import QStackedWidget
from vista.homeScreen import HomeScreen
from vista.activitesView import ActivitiesView
from vista.progressView import ProgressView
from vista.abcDetectionView import AbcDetectionView
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QFontDatabase, QFont


class Controller:
    def __init__(self):
        self.model = Model()
        self.pages = QStackedWidget()
        self.loadPages()
        self.pages.setCurrentIndex(0)

    def loadPages(self):
        self.pages.addWidget(HomeScreen(self))
        self.pages.addWidget(ActivitiesView(self))
        self.pages.addWidget(ProgressView(self))
        self.pages.addWidget(AbcDetectionView(self))

    def changeFont(self, font_name):
        if font_name == "OpenDyslexic":
            font_path = r"fonts\OpenDyslexic-Regular.otf"
            font_id = QFontDatabase.addApplicationFont(font_path)
            if font_id != -1:
                font_family = QFontDatabase.applicationFontFamilies(font_id)[0]
                custom_font = QFont(font_family, 14)
                QApplication.instance().setFont(custom_font)
                print(f"Fuente {font_name} cargada correctamente.")
            else:
                print(f"Error al cargar la fuente {font_name} desde {font_path}")
        else:
            QApplication.instance().setFont(QFont(font_name, 14))
            print(f"Fuente {font_name} cargada correctamente.")

    def updateCamera(self, cameraIndex):
        return self.model.updateCamera(cameraIndex)

    def getPrecision(self,letter):
        return self.model.get_precision(letter)
    
    def deleteData(self):
        return self.model.deleteData()

    def showPage(self, index):
        self.pages.setCurrentIndex(index)

    def updateFrame(self):
        return self.model.updateFrame()