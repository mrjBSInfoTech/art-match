import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  artworkImageProtectionProps,
  artworkImageProtectionSx,
} from "../../../utils/artworkImageProtection";

const API_BASE_URL = "http://localhost:5000";

export default function WatermarkedArtworkImage({
  image,
  alt = "Artwork",
  sx,
  ...imageProps
}) {
  const imageRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!image) {
      setShouldLoad(false);
      setSrc("");
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
  }, [image]);

  useEffect(() => {
    if (!image || !shouldLoad) return undefined;

    const artworkPath = `${API_BASE_URL}/uploads/seller/uploadArtwork/`;
    let filename = image;
    if (/^https?:\/\//i.test(image)) {
      if (!image.startsWith(artworkPath)) {
        setSrc(image);
        return undefined;
      }
      filename = decodeURIComponent(image.slice(artworkPath.length));
    }

    const controller = new AbortController();
    let objectUrl;
    const token = localStorage.getItem("buyer_token");

    fetch(
      `${artworkPath}${encodeURIComponent(filename)}`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load artwork image (${response.status}).`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Unable to load watermarked artwork:", error);
          setSrc("");
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, shouldLoad]);

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
        visibility: src ? "visible" : "hidden",
      }}
    />
  );
}
