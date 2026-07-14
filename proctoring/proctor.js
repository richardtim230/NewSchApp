import { loadModels } from "./loader.js";
import { startCamera } from "./camera.js";
import { detectFace } from "./detector.js";
import { addEvent } from "./monitor.js";

export async function initializeProctor(videoElement) {

    try {

        await loadModels();

        await startCamera(videoElement);

        addEvent(
            "SYSTEM",
            "Camera started."
        );

        const detection = await detectFace(videoElement);

        if (!detection) {

            addEvent(
                "ERROR",
                "No face detected."
            );

            return false;
        }

        addEvent(
            "SUCCESS",
            "Face detected."
        );

        return detection;

    } catch (error) {

        console.error(error);

        addEvent(
            "ERROR",
            error.message
        );

        return false;
    }
}
