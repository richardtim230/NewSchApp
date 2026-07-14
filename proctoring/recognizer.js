import * as faceapi from "face-api.js";

export function descriptorDistance(a, b) {

    return faceapi.euclideanDistance(a, b);
}

export function isSamePerson(stored, current) {

    const distance = descriptorDistance(stored, current);

    return {
        distance,
        match: distance < 0.5
    };
}
