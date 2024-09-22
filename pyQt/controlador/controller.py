from modelo.model import Model
from PyQt5.QtWidgets import QStackedWidget
from vista.homeScreen import HomeScreen
from vista.activitesView import ActivitiesView
from vista.progressView import ProgressView
from vista.abcDetectionView import AbcDetectionView

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

    

    def getPrecision(self,letter):
        return self.model.get_precision(letter)
    
    def deleteData(self):
        return self.model.deleteData()

    def showPage(self, index):
        self.pages.setCurrentIndex(index)

    def incrementCounter(self):
        return self.model.incrementCounter()
    
    def decrementCounter(self):
        return self.model.decreaseCounter()

    def updateFrame(self):
        return self.model.updateFrame()