"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import React from "react";

import styles from "./LiveStream.module.css";
import { useSearchParams } from "next/navigation";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import Hls from "hls.js";

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
  const containerRef = useRef<HTMLElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const userStartedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoUrl = searchParams.get("video");

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ── HLS init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!videoUrl) return;
    if (!video) return;

    setIsLoading(true);
    setIsPlaying(false);
    userStartedRef.current = false;

    // iOS Safari: native HLS, no hls.js needed
    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        video.load();
      }
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const hls = new Hls({
      maxBufferLength: 30,
      maxBufferHole: 0.5,
      enableWorker: true,
      lowLatencyMode: true,
      liveSyncDurationCount: 3,
    });

    hls.attachMedia(video);

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(videoUrl);
    });

    hls.on(Hls.Events.ERROR, (_event: string, data: { fatal?: boolean }) => {
      if (data.fatal) {
        hls.destroy();
        hlsRef.current = null;
        setIsLoading(false);
      }
    });

    hlsRef.current = hls;

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl]);

  // ── Video element events ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => setIsLoading(false);
    const onLoadedData = () => setIsLoading(false);

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      if (isTouchDevice) {
        setTimeout(() => setShowControls(false), 2000);
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const onWaiting = () => {
      if (userStartedRef.current) setIsLoading(true);
    };

    const onCanPlayThrough = () => {
      setIsLoading(false);
      if (userStartedRef.current && video.paused) {
        video.play();
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlayThrough);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [isTouchDevice]);

  // ── Stall watchdog ───────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let stallTimeout: ReturnType<typeof setTimeout> | null = null;

    const onWaiting = () => {
      if (!userStartedRef.current) return;
      stallTimeout = setTimeout(() => {
        if (!video || video.paused) return;
        if (video.buffered.length > 0) {
          video.currentTime = video.buffered.end(video.buffered.length - 1);
        }
      }, 5000);
    };

    const onPlaying = () => {
      if (stallTimeout) {
        clearTimeout(stallTimeout);
        stallTimeout = null;
      }
    };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      if (stallTimeout) clearTimeout(stallTimeout);
    };
  }, []);

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const enterFullscreenIOS = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await (video as any).webkitEnterFullscreen();
    } catch {
      /* denied */
    }
  };

  const enterFullscreenContainer = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen({ navigationUI: "hide" });
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        await (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        await (container as any).msRequestFullscreen();
      }
    } catch {
      /* denied — plays inline */
    }
  };

  // ── Fullscreen state tracking ──────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const goFullscreen = () => {
    const isIOS =
      typeof (videoRef.current as any)?.webkitEnterFullscreen === "function" &&
      typeof document.documentElement.requestFullscreen !== "function";

    if (isIOS) {
      enterFullscreenIOS();
    } else {
      enterFullscreenContainer();
    }
  };

  // ── Controls ─────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      userStartedRef.current = true;

      const alreadyFullscreen =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement;

      if (!alreadyFullscreen) {
        goFullscreen();
      }

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const showButton =
    !isPlaying || (!isTouchDevice && isHovered) || showControls;
  if (!videoUrl) return <p>"invalid url"</p>;
  return (
    <main
      ref={containerRef}
      className={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleInteraction}
    >
      <video
        ref={videoRef}
        className={styles.backgroundVideo}
        loop
        playsInline
        onClick={togglePlay}
      />

      {/* Spinner */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Play / Pause */}
      {showButton && !isLoading && (
        <button className={styles.centerControl} onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      )}

      {/* Custom Controls Bar */}
      {(showControls || !isPlaying || !isTouchDevice) && (
        <div className={styles.controlsBar}>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className={styles.progressSlider}
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                duration ? (currentTime / duration) * 100 : 0
              }%, rgba(255,255,255,0.3) ${
                duration ? (currentTime / duration) * 100 : 0
              }%, rgba(255,255,255,0.3) 100%)`,
            }}
          />
          <div className={styles.controls}>
            <button
              className={styles.controlBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
            </button>

            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              className={styles.controlBtn}
              onClick={goFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
            </button>
          </div>
        </div>
      )}

      <div className={styles.bottomGradient} />
    </main>
  );
}
