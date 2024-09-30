# LSCh-Recognition
![Yolov9 Model Test](img/test_1.gif)

<details>
<summary>Español:</summary>

Este es un proyecto enfocado en el desarrollo de una aplicación y una base de datos para el reconocimiento de gestos de manos a través de la cámara utilizando bibliotecas de YOLO.

Desde su creación, he logrado crear una aplicación en Python que utiliza tu cámara para buscar signos de LSCh (Lengua de Señas Chilena).

Esta es una interfaz simple de PyQt para la evaluación del modelo entrenado en yolov9 para la LSCh.
Contiene dos módulos principales, las actividades y el progreso.
El módulo de actividades solo contiene una actividad disponible que es "Abecedario".

Hay dos fuentes que puedes usar, Arial y OpenDyslexic, esta última siendo una fuente hecha por y para personas con dislexia.

<details>
<summary>Enlace oficial a Opendyslexic</summary>
https://opendyslexic.org/about
</details>

El modelo principal está preparado para trabajar mejor con la GPU, por lo que es recomendado instalar torch para tu versión específica de CUDA. (NVIDIA)

<details>
<summary>Obtener tu versión de CUDA</summary>
En cmd:

```sh
nvcc --version
```
</details>

Para correr la aplicación:

```sh
pip install -r requirements.txt
```

```sh
python main.py #|| Correr el archivo main.py
```
</details>

<details>
<summary>English</summary>

This project focuses on developing an app and database for hand gesture recognition via a camera using YOLO libraries.

Since it's creation, I've managed to create a python app that uses your camera to search for LSCh signs (Lengua de Señas Chilena).

This is a simple PyQt interface for the evaluation of the model trained in yolov9 for the LSCh.
It contains two main modules, the activities and the progress.
The activities module only contains one activity available wich is "Abecedario".

There are two fonts you can use, Arial and OpenDyslexic, this last one being a font made by and for people with dyslexia.

<details>
<summary>Official link to Opendyslexic</summary>
https://opendyslexic.org/about
</details>

The main model is made so it runs better on GPU, so it's recommended to install torch for your specific CUDA version.(NVIDIA)

<details>
<summary>Get your CUDA version</summary>

```sh
nvcc --version
```
</details>

<details>
<summary>Torch official page</summary>
https://pytorch.org/get-started/locally/
</details>

To run the app:

```sh
pip install -r requirements.txt
```

```sh
python main.py #|| Run the main.py file
```
</details>

