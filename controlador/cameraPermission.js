async function requestCameraPermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById("camera-status").innerText = "Permiso concedido";
    } catch (err) {
        document.getElementById("camera-status").innerText = "Permiso denegado";
    }
}