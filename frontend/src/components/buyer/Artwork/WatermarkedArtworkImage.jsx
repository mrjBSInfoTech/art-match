import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  artworkImageProtectionProps,
  artworkImageProtectionSx,
  useArtworkBlurOnAway,
} from "../../../utils/artworkImageProtection";
import { loadArtworkImage } from "../../../utils/artworkImageLoader.js";

const API_BASE_URL = "http://localhost:5000";

const getArtworkFilename = (image) => {
  let pathname;
  try {
    pathname = new URL(image, API_BASE_URL).pathname;
  } catch (error) {
    throw new Error("Invalid artwork image URL.", { cause: error });
  }

  const segments = pathname.split("/").filter(Boolean);
  const artworkPathIndex = segments.lastIndexOf("uploadArtwork");
  const filename =
    artworkPathIndex >= 0
      ? segments[artworkPathIndex + 1]
      : segments[segments.length - 1];
  if (!filename) throw new Error("Artwork image filename is missing.");

  try {
    return decodeURIComponent(filename);
  } catch (error) {
    throw new Error("Artwork image filename is invalid.", { cause: error });
  }
};

export default function WatermarkedArtworkImage({
  image,
  alt = "Artwork",
  sx,
  useBuyerIdentity = true,
  fallbackSrc = "",
  // "web" (1600 px) for detail views, "thumb" (400 px) for grids.
  variant = "web",
  hideWhenBlurred = false,
  ...imageProps
}) {
  const imageRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [src, setSrc] = useState("");
  const { blurSx } = useArtworkBlurOnAway({ enabled: hideWhenBlurred });

  useEffect(() => {
    if (!image) {
      setShouldLoad(false);
      setSrc(fallbackSrc);
      return undefined;
    }

    setShouldLoad(false);
    setSrc("");
    if (!window.IntersectionObserver) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (imageRef.current) observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [image, fallbackSrc]);

  useEffect(() => {
    if (!image || !shouldLoad) return undefined;

    let filename;
    try {
      filename = getArtworkFilename(image);
    } catch (error) {
      console.error("Unable to load watermarked artwork:", error);
      setSrc(fallbackSrc);
      return undefined;
    }

    let active = true;
    let objectUrl;
    const token = useBuyerIdentity ? localStorage.getItem("buyer_token") : null;

    loadArtworkImage({ filename, variant, token })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          console.error("Unable to load watermarked artwork:", error);
          setSrc(fallbackSrc || "");
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, shouldLoad, useBuyerIdentity, fallbackSrc, variant]);

  if (!image) return null;

  return (
    <Box
      ref={imageRef}
      component="img"
      {...artworkImageProtectionProps}
      {...imageProps}
      src={src || undefined}
      alt={alt}
      loading="lazy"
      sx={{
        ...artworkImageProtectionSx,
        ...sx,
        ...blurSx,
        transition: "filter 120ms ease-out",
        visibility: src ? "visible" : "hidden",
      }}
    />
  );
}
