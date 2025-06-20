import { parentPort } from "worker_threads";

let prevTime = performance.now();

function tick() {
    const currentTime = performance.now();
    const deltaTime = currentTime - prevTime;
    prevTime = currentTime;

    // Post the delta time back to the main thread
    parentPort.postMessage(deltaTime);

    setTimeout(tick, 1000 / 60); // ~60 FPS
}

tick();