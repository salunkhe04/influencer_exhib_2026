"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import styles from "./LiveStream.module.css";
import { useSearchParams } from "next/navigation";
import { FaPlay, FaPause } from "react-icons/fa";
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

  const videoUrl =
    searchParams.get("video") ??
    "https://cdn.evhomes.tech/hls/sakshi_invite/master.m3u8";

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ── HLS init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
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
      // liveSync: 3,
      liveSyncDurationCount: 3,
      // maxManifestRetries: 10,
      // manifestLoadingMaxRetries: 5,
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

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlayThrough);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
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
  // iOS: only <video>.webkitEnterFullscreen exists. It takes over the screen
  // with the native player so safe-area is handled automatically.
  const enterFullscreenIOS = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await (video as any).webkitEnterFullscreen();
    } catch {
      /* denied */
    }
  };

  // Android / desktop: fullscreen the CONTAINER (not <video>) so that our
  // overlay controls and safe-area CSS both render inside fullscreen.
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

  const goFullscreen = () => {
    // iOS detection: video has webkitEnterFullscreen but document doesn't have
    // the standard requestFullscreen at all
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

      // first press: go fullscreen then play.
      // if already fullscreen (e.g. resumed after pause) just play.
      const alreadyFullscreen =
        !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;

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

  // ── Render ───────────────────────────────────────────────────────────────
  const showButton =
    !isPlaying || (!isTouchDevice && isHovered) || showControls;

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

      <div className={styles.bottomGradient} />
    </main>
  );
}