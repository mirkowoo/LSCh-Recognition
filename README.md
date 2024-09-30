# LSCh-Recognition

English:

This is a project focused in the developing of an app and a database for a hand gesture recognition via camera using Yolo libs 

Since it's creation, I've managed to create a python app that uses your camera to search for LSCh signs (Lengua de Señas Chilena).

This is a simple PyQt interface for the evaluation of the model trained in yolov9 for the LSCh.
It contains two main modules, the activities and the progress.
The activities module only contains one activity available wich is "Abecedario".

If you wanna use GPU (might run better), you need to install torch for your CUDA version

***To get your CUDA version***
In cdm:
    nvcc --version

Torch official page:
    https://pytorch.org/get-started/locally/

pip install -r requirements.txt

<details>
<summary>Español:</summary>

Este es un proyecto enfocado en el desarrollo de una aplicación y una base de datos para el reconocimiento de gestos de manos a través de la cámara utilizando bibliotecas de YOLO.

Desde su creación, he logrado crear una aplicación en Python que utiliza tu cámara para buscar signos de LSCh (Lengua de Señas Chilena).

Esta es una interfaz simple de PyQt para la evaluación del modelo entrenado en yolov9 para la LSCh.
Contiene dos módulos principales, las actividades y el progreso.
El módulo de actividades solo contiene una actividad disponible que es "Abecedario".

Si deseas usar GPU (es recomendable), necesitas instalar torch para tu versión de CUDA. (Solo funciona con NVIDIA)

***Para obtener tu versión de CUDA***
En cmd:
    nvcc --version

Página oficial de Torch:
    https://pytorch.org/get-started/locally/

pip install -r requirements.txt
</details>