import { useEffect, useState } from "react";

interface Props {
  videoId: string;
  start: number;
  end: number;
  /** Bump to reload the clip from `start`. */
  replayKey: number;
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

/** Embedded YouTube player that starts and stops at the sentence boundaries. */
export function YouTubeClip({ videoId, start, end, replayKey }: Props) {
  const online = useOnline();
  const s = Math.max(0, Math.floor(start));
  const e = Math.max(s + 1, Math.ceil(end));
  const params = new URLSearchParams({
    start: String(s),
    end: String(e),
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
    controls: "1",
  });
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;

  if (!online) {
    return (
      <div className="clip clip--offline" role="status">
        <span>Offline: the clip needs a connection.</span>
        <span className="muted">Cards, translations and notes still work.</span>
      </div>
    );
  }
  return (
    <div className="clip">
      <iframe
        key={replayKey}
        src={src}
        title="Video clip"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
