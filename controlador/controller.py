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
        self.homeScreen = HomeScreen(self)
        self.activitiesView = ActivitiesView(self)
        self.progressView = ProgressView(self)
        self.abcDetectionView = AbcDetectionView(self)
        self.loadPages()
        self.pages.setCurrentIndex(0)

    def loadPages(self):
        self.pages.addWidget(self.homeScreen)
        self.pages.addWidget(self.activitiesView)
        self.pages.addWidget(self.progressView)
        self.pages.addWidget(self.abcDetectionView)

    def changeFont(self, font_name):
        if font_name == "OpenDyslexic":
            font_path = r"fonts\OpenDyslexic-Regular.otf"
            font_id = QFontDatabase.addApplicationFont(font_path)
            if font_id != -1:
                font_family = QFontDatabase.applicationFontFamilies(font_id)[0]
                custom_font = QFont(font_family, 14)
                QApplication.instance().setFont(custom_font)
                self.updateStylesheet(font_family)
                print(f"Fuente {font_name} cargada correctamente.")
            else:
                print(f"Error al cargar la fuente {font_name} desde {font_path}")
        else:
            custom_font = QFont(font_name, 14)
            QApplication.instance().setFont(custom_font)
            self.updateStylesheet(font_name)
            print(f"Fuente {font_name} cargada correctamente.")

    def updateStylesheet(self, font_family):
        commonStyles = f"""
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

        homeScreenStyles = commonStyles + f""" 
            QLabel {{
                font-size: 20px; /* Un poco más grande para títulos */
            }}
        """

        activitiesViewStyles = commonStyles + f"""
            QLabel {{
                font-size: 18px;
            }}
        """

        progressViewStyles = commonStyles + f"""
            QLabel {{
                font-size: 18px;
            }}
            QPushButton#deleteButton{{
                background-color: #FF6B6B;
                color: white;
            }}
            QPushButton#deleteButton:hover{{
                background-color: #FF4C4C;
            }}

        """

        abcDetectionViewStyles = commonStyles + f"""
            QLabel {{
                font-size: 18px;
            }}
            #bigLetterLabel{{
                font-size: 120px;
            }}
            #feedbackLabel{{
                font-size: 80px;
                font-weight: bold;
            }}
        """

        self.applyStylesheet(self.pages.widget(0), homeScreenStyles)
        self.applyStylesheet(self.pages.widget(1), activitiesViewStyles)
        self.applyStylesheet(self.pages.widget(2), progressViewStyles)
        self.applyStylesheet(self.pages.widget(3), abcDetectionViewStyles)


    def applyStylesheet(self, page, stylesheet):
        if page:
            page.setStyleSheet(stylesheet)

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