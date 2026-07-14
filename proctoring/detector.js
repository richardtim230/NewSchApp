import * as faceapi from "face-api.js";

export async function detectFace(video) {

    return await faceapi
        .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
}

export async function detectAllFaces(video) {

    return await faceapi
        .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptors();
}
