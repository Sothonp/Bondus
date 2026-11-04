import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./Landing.jsx";

/* The landing hero's picture: a Bon Om Touk (Water Festival) dragon-boat race, as a lively looping video. The blue owl, in a krama,
   leads the crew; Angkor Wat rises at sunrise behind the river and the riverbank crowd cheers.

   It is a real video (public/hero/hero-festival.mp4, 3.2 s loop, about 400 KB, no sound, plain H.264 so every phone plays it),
   made by animating the BONDUS illustration (not AI-generated footage): the crew rows (oars sweep, bodies lean into each pull,
   the boat bobs and spray flies where the blades bite), the riverbank crowds bounce and wave, the flags flutter, the sun pulses
   and light glints drift across the river. The picture's edges fade into white, so it sits directly on the page's white
   background with no frame or box.

   Stillness. People who ask their device for less motion, who have Data Saver on, or when the video can't load or play get the
   poster (hero-festival-poster.webp / .jpg, one frame of the same picture) instead. The poster is also what shows while the video
   loads, and on an iPhone in Low Power Mode, which won't autoplay video. The video also pauses while it is scrolled out of view
   to save battery.

   The speech bubble above the owl is passed in as `children` (Welcome builds it from MascotSpeechBubble) and is positioned over
   the owl's head by .eai-fh-bubblepos. Styles are the .eai-fh rules in festivalStyles.js. */

export const VIDEO = { w: 1280, h: 934, mp4: "/hero/hero-festival.mp4", posterWebp: "/hero/hero-festival-poster.webp", posterJpg: "/hero/hero-festival-poster.jpg" };

// Where the owl's head is (the bubble sits above it), as a share of the picture.
export const OWL_ANCHOR = { x: 43.5, y: 44.5 };

export default function FestivalScene({ alt, children }) {
  const reduce = usePrefersReducedMotion();
  const [saveData] = useState(() => typeof navigator !== "undefined" && !!navigator.connection?.saveData);
  const [failed, setFailed] = useState(false);
  const still = reduce || saveData || failed;
  const videoRef = useRef(null);

  // Play while on screen, pause when scrolled away (and on a hidden tab, which browsers do themselves).
  useEffect(() => {
    const v = videoRef.current;
    if (still || !v) return undefined;
    v.muted = true;
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (typeof IntersectionObserver !== "function") { play(); return undefined; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) play(); else v.pause(); }, { threshold: 0.1 });
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  return (
    <div className="eai-fh-stage">
      <div className="eai-fh-scene" role="img" aria-label={alt}>
        <picture>
          <source type="image/webp" srcSet={VIDEO.posterWebp} />
          <img className="eai-fh-poster" src={VIDEO.posterJpg} alt="" width={VIDEO.w} height={VIDEO.h} decoding="async" fetchPriority="high" />
        </picture>
        {!still && (
          <video className="eai-fh-video" src={VIDEO.mp4} poster={VIDEO.posterJpg} ref={videoRef} autoPlay loop muted playsInline preload="auto"
            disablePictureInPicture tabIndex={-1} aria-hidden="true" onError={() => setFailed(true)} />
        )}
      </div>
      <div className="eai-fh-bubblepos" style={{ left: `${OWL_ANCHOR.x}%`, top: `${OWL_ANCHOR.y}%` }}>{children}</div>
    </div>
  );
}
