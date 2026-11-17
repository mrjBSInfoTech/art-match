import { useEffect, useState } from "react";
import { Avatar, Box } from "@mui/material";
import {
  DEFAULT_PROFILE_IMAGE_URL,
  resolveProfileImageUrl,
} from "../../utils/profileImage.js";

/**
 * Renders a user/artist avatar that falls back cleanly to backend/uploads/profile.jpg
 * via a native <img> onError handler instead of MUI Avatar's initial-letter fallback.
 */
export default function ProfileAvatar({
  image,
  role = "seller",
  src,
  alt = "Profile",
  sx,
  ...props
}) {
  const primarySrc = src || resolveProfileImageUrl(image, role);
  const [resolvedSrc, setResolvedSrc] = useState(primarySrc);

  useEffect(() => {
    setResolvedSrc(primarySrc);
  }, [primarySrc]);

  const handleFallback = () => {
    if (resolvedSrc !== DEFAULT_PROFILE_IMAGE_URL) {
      setResolvedSrc(DEFAULT_PROFILE_IMAGE_URL);
    }
  };

  return (
    <Avatar {...props} alt={alt} sx={sx}>
      <Box
        component="img"
        src={resolvedSrc}
        alt={alt}
        onError={handleFallback}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Avatar>
  );
}
