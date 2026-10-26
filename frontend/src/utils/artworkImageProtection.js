import { useEffect, useState } from "react";

export const preventArtworkImageActions = (event) => {
  event.preventDefault();
};

export const artworkImageProtectionProps = {
  draggable: false,
  onContextMenu: preventArtworkImageActions,
  onDragStart: preventArtworkImageActions,
};

export const artworkImageProtectionSx = {
  userSelect: "none",
  WebkitUserDrag: "none",
  WebkitTouchCallout: "none",
};

/*
 * Gentle tab-blur protection.
 *
 * When the tab is backgrounded the image is softly blurred rather than hidden,
 * and it is restored the instant the tab regains focus. A soft blur avoids the
 * hostile feel of blanking the page, which also fires for dev tools, password
 * managers and every popup.
 *
 * Opt out per component with `hideWhenBlurred={false}`.
 */
export const useArtworkBlurOnAway = ({ enabled = true, blurPx = 20 } = {}) => {
  const [isAway, setIsAway] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsAway(false);
      return undefined;
    }

    const update = () => setIsAway(document.visibilityState === "hidden");
    const onBlur = () => setIsAway(true);
    const onFocus = () => setIsAway(false);

    document.addEventListener("visibilitychange", update);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    update();

    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);

  return {
    isAway,
    blurSx: { filter: isAway ? `blur(${blurPx}px)` : "none" },
  };
};
