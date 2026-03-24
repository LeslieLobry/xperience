"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "./ImageViewer.css";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_DELAY = 280;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ImageViewer({ src, alt = "image", onClose }) {
  const overlayRef = useRef(null);
  const imgRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const startTranslateRef = useRef({ x: 0, y: 0 });

  const lastTapRef = useRef(0);
  const pointersRef = useRef(new Map());
  const pinchStartDistanceRef = useRef(null);
  const pinchStartScaleRef = useRef(1);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.add("image-viewer-open");
    return () => {
      document.body.classList.remove("image-viewer-open");
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const getDistance = (p1, p2) => {
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleWheel = (e) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.2 : 0.2;

    setScale((prev) => {
      const next = clamp(Number((prev + delta).toFixed(2)), MIN_SCALE, MAX_SCALE);
      if (next === 1) {
        setTranslate({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();

    if (scale > 1) {
      resetView();
      return;
    }

    setScale(2);
    setTranslate({ x: 0, y: 0 });
  };

  const handlePointerDown = (e) => {
    if (!imgRef.current) return;

    imgRef.current.setPointerCapture?.(e.pointerId);

    pointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    if (pointersRef.current.size === 1) {
      const now = Date.now();

      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        handleDoubleClick(e);
      }

      lastTapRef.current = now;

      if (scale > 1) {
        setDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startTranslateRef.current = { ...translate };
      }
    }

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchStartDistanceRef.current = getDistance(pts[0], pts[1]);
      pinchStartScaleRef.current = scale;
      setDragging(false);
    }
  };

  const handlePointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const currentDistance = getDistance(pts[0], pts[1]);
      const startDistance = pinchStartDistanceRef.current;

      if (!startDistance) return;

      const ratio = currentDistance / startDistance;
      const nextScale = clamp(
        Number((pinchStartScaleRef.current * ratio).toFixed(2)),
        MIN_SCALE,
        MAX_SCALE
      );

      setScale(nextScale);

      if (nextScale === 1) {
        setTranslate({ x: 0, y: 0 });
      }
      return;
    }

    if (dragging && scale > 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      setTranslate({
        x: startTranslateRef.current.x + dx,
        y: startTranslateRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
    }

    if (pointersRef.current.size === 0) {
      setDragging(false);

      if (scale <= 1) {
        setTranslate({ x: 0, y: 0 });
      }
    }
  };

  const handlePointerCancel = (e) => {
    pointersRef.current.delete(e.pointerId);
    setDragging(false);

    if (pointersRef.current.size === 0 && scale <= 1) {
      setTranslate({ x: 0, y: 0 });
    }
  };

  if (!mounted) return null;

  const content = (
    <div
      ref={overlayRef}
      className="image-viewer-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <button
        type="button"
        className="image-viewer-close"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
        }}
        aria-label="Fermer"
      >
        ✕
      </button>

      <button
        type="button"
        className="image-viewer-action image-viewer-zoomout"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setScale((prev) => {
            const next = clamp(Number((prev - 0.25).toFixed(2)), MIN_SCALE, MAX_SCALE);
            if (next === 1) setTranslate({ x: 0, y: 0 });
            return next;
          });
        }}
        aria-label="Zoom arrière"
      >
        −
      </button>

      <button
        type="button"
        className="image-viewer-action image-viewer-zoomin"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setScale((prev) =>
            clamp(Number((prev + 0.25).toFixed(2)), MIN_SCALE, MAX_SCALE)
          );
        }}
        aria-label="Zoom avant"
      >
        +
      </button>

      <div className="image-viewer-stage">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`image-viewer-img ${dragging ? "dragging" : ""}`}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}