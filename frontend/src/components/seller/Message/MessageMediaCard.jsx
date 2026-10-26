import { Box, IconButton } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

export default function MessageMediaCard({ media, onViewMedia }) {
  const isVideo = media.mediaType?.startsWith("video/") || /\.(mp4|mov|webm|ogg|m4v)$/i.test(media.image);
  return isVideo ? (
    <Box sx={{ position: "relative" }}>
      <Box
        component="video"
        src={media.image}
        controls
        onClick={(event) => event.stopPropagation()}
        sx={{ width: "100%", aspectRatio: "1", bgcolor: "black" }}
      />
      <IconButton
        aria-label="Enlarge video"
        onClick={() =>
          onViewMedia({
            src: media.image,
            type: "video",
            alt: "Shared video",
          })
        }
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          color: "#fff",
          bgcolor: "rgba(0, 0, 0, 0.6)",
          "&:hover": { bgcolor: "rgba(0, 0, 0, 0.8)" },
        }}
      >
        <OpenInFullIcon fontSize="small" />
      </IconButton>
    </Box>
  ) : (
    <Box

      component="img"
      src={media.image}
      alt="Shared in this conversation"
      onClick={() =>
        onViewMedia({
          src: media.image,
          type: "image",
          alt: "Shared image",
        })
      }
      sx={{
        width: "100%",
        aspectRatio: "1",
        objectFit: "cover",
        cursor: "zoom-in",
      }}
    />
  );
}
