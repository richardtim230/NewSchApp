let stream = null;

export async function startCamera(videoElement) {

    stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: 640,
            height: 480
        },
        audio: false
    });

    videoElement.srcObject = stream;

    await videoElement.play();

    return stream;
}

export function stopCamera() {

    if (!stream) return;

    stream.getTracks().forEach(track => track.stop());

    stream = null;
}

export function getCameraStream() {
    return stream;
}
