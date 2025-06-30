"use client";
import { useEffect, useRef } from "react";

export default function TestDrag() {
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseDown = (e) => {
      console.log("✅ MOUSEDOWN");
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      console.log("✋ MOUSEMOVE");
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
    };

    const onMouseUp = () => {
      console.log("🖐️ MOUSEUP");
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div
      ref={boxRef}
      style={{
        position: "absolute",
        width: "200px",
        height: "150px",
        backgroundColor: "red",
        top: "100px",
        left: "100px",
        zIndex: 9999,
        cursor: "grab",
      }}
    >
      Drag moi
    </div>
  );
}
