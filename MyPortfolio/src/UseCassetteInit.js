import { useEffect } from "react";

export default function useCassetteInit(cassetteInPlayIndex, cassetteContentParentElement, webSocketRef) {
   useEffect(() => {

    let cleanup = () => {};

    switch(cassetteInPlayIndex)
    {
        case 0:
            cleanup = IntroCassetteInit(cassetteContentParentElement, webSocketRef);
            break;

        default:
            return;
    }

    return () => {
        cleanup();
    }
   }, [cassetteInPlayIndex]);
}

/** @param {HTMLElement} cassetteContentParentElement */
function IntroCassetteInit(cassetteContentParentElement, webSocketRef)
{
    /** @type {WebSocket} */
    const ws = webSocketRef.current;

    let cleanup;

    if(ws)
    {
        const buttonLeft = document.getElementById("button-left");
        const buttonRight = document.getElementById("button-right");
        const buttonUp = document.getElementById("button-up");
        const buttonDown = document.getElementById("button-down");

        cleanup = () => {

        };
    }

    return cleanup;
}
