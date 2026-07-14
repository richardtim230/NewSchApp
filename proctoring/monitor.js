const logs = [];

export function addEvent(type, message) {

    logs.push({
        type,
        message,
        time: new Date()
    });

    console.log(type, message);
}

export function getLogs() {

    return logs;
}

export function clearLogs() {

    logs.length = 0;
}
