"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import styles from "./LiveStream.module.css";
import { useSearchParams } from "next/navigation";
import { FaPlay, FaPause } from "react-icons/fa";

export default function LiveStreamWrapper() {
  return (
    <Suspense fallback={<p>loading</p>}>
      <LiveStream />
    </Suspense>
  );
}
export function LiveStream() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoUrl = searchParams.get("video");

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (isTouchDevice) {
        setTimeout(() => setShowControls(false), 2000);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    video.play().catch(() => setIsPlaying(false));

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // If first time play → go fullscreen
    if (video.paused) {
      enterFullscreen();
      video.play();
    } else {
      video.pause();
    }
  };

  const handleInteraction = () => {
    if (isTouchDevice) {
      setShowControls(true);
      if (isPlaying) {
        setTimeout(() => setShowControls(false), 2000);
      }
    }
  };
  const enterFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitEnterFullscreen) {
      // iOS Safari
      (video as any).webkitEnterFullscreen();
    }
  };

  const showButton =
    !isPlaying || (!isTouchDevice && isHovered) || showControls;

  return (
    <main
      className={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleInteraction}
    >
      <video
        ref={videoRef}
        className={styles.backgroundVideo}
        src={videoUrl!}
        loop
        playsInline
        onClick={togglePlay}
      />

      {showButton && (
        <button className={styles.centerControl} onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      )}

      <div className={styles.bottomGradient} />
    </main>
  );
}
