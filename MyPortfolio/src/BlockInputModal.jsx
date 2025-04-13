import { useEffect } from "react";

export default function BlockInputModal({ shouldBlockInput }) {
  return (
    <div
      className={`fixed w-screen h-screen ${
        shouldBlockInput ? "block z-[9999]" : "hidden"
      }`}
    />
  );
}
