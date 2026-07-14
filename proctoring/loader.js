import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadModels() {
    if (modelsLoaded) return;

    const MODEL_URL = "/models";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    modelsLoaded = true;

    console.log("✅ Face models loaded.");
}

export function areModelsLoaded() {
    return modelsLoaded;
}
