import { Box, Button, Chip, IconButton, Paper, Typography } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

const isVideoSource = (url, mediaType) =>
  mediaType?.startsWith("video/") ||
  /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(url || "");

const isImageSource = (url, mediaType) =>
  !isVideoSource(url, mediaType) &&
  (!mediaType ||
    mediaType.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|$)/i.test(url || ""));

export default function ChatMessageBubble({
  isMine,
  text,
  image,
  mediaType,
  fileName,
  time,
  senderName,
  issueType,
  footerLabel = "",
  attachmentError,
  canRecover,
  recoveryUnavailable,
  recoveryLabel = "Recover messages",
  onRecover,
  onViewMedia,
  customAttachment = null,
}) {
  const hasMedia = Boolean(image);
  const isVideo = isVideoSource(image, mediaType);
  const isImage = !customAttachment && isImageSource(image, mediaType);

  return (
    <Box
      sx={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        maxWidth: { xs: "88%", sm: "74%", lg: "68%" },
        minWidth: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: hasMedia ? 1 : 1.5,
          px: hasMedia ? 1 : 2,
          borderRadius: 2.5,
          borderBottomRightRadius: isMine ? 4 : 20,
          borderBottomLeftRadius: isMine ? 20 : 4,
          bgcolor: isMine ? "error.main" : "background.paper",
          color: isMine ? "#fff" : "text.primary",
          border: isMine ? "none" : "1px solid",
          borderColor: "divider",
          boxShadow: isMine
            ? "0 2px 8px rgba(211, 47, 47, 0.18)"
            : "0 1px 3px rgba(15, 23, 42, 0.05)",
        }}
      >
        {!isMine && senderName && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              display: "block",
              mb: 0.4,
              px: hasMedia ? 0.5 : 0,
            }}
          >
            {senderName}
          </Typography>
        )}

        {issueType && (
          <Chip
            size="small"
            label={issueType}
            sx={{
              height: 20,
              fontSize: 10.5,
              mb: 0.75,
              fontWeight: 700,
              backgroundColor: isMine
                ? "rgba(255,255,255,0.22)"
                : "action.selected",
              color: isMine ? "#fff" : "text.primary",
            }}
          />
        )}

        {customAttachment}

        {hasMedia &&
          !customAttachment &&
          (isVideo ? (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxHeight: 260,
                borderRadius: 2,
                overflow: "hidden",
                mb: text ? 1 : 0,
              }}
            >
              <video
                src={image}
                controls
                onClick={(event) => event.stopPropagation()}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "cover",
                  background: "#000",
                }}
              />
              {onViewMedia && (
                <IconButton
                  aria-label="Enlarge video"
                  onClick={() =>
                    onViewMedia({
                      src: image,
                      type: "video",
                      alt: fileName || "Message video",
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
              )}
            </Box>
          ) : isImage ? (
            <Box
              component="img"
              src={image}
              alt={fileName || "Attachment"}
              onClick={() =>
                onViewMedia?.({
                  src: image,
                  type: "image",
                  alt: fileName || "Message attachment",
                })
              }
              sx={{
                width: "100%",
                maxHeight: 260,
                objectFit: "cover",
                borderRadius: 2,
                mb: text ? 1 : 0,
                display: "block",
                cursor: onViewMedia ? "zoom-in" : "default",
              }}
            />
          ) : (
            <Button
              component="a"
              href={image}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={<InsertDriveFileOutlinedIcon />}
              sx={{
                textTransform: "none",
                mb: text ? 1 : 0,
                borderColor: isMine ? "rgba(255,255,255,0.5)" : "divider",
                color: isMine ? "#fff" : "text.primary",
                justifyContent: "flex-start",
                maxWidth: "100%",
              }}
            >
              <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                {fileName || "View attachment"}
              </Typography>
            </Button>
          ))}

        {text && (
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.45,
              whiteSpace: "pre-line",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              px: hasMedia ? 0.75 : 0,
            }}
          >
            {text}
          </Typography>
        )}

        {attachmentError && (
          <Typography
            variant="caption"
            color={isMine ? "inherit" : "error"}
            sx={{ display: "block", mt: 0.5, opacity: isMine ? 0.9 : 1 }}
          >
            {attachmentError}
          </Typography>
        )}

        {canRecover && (
          <Button
            size="small"
            color={isMine ? "inherit" : "error"}
            onClick={onRecover}
            sx={{ mt: 0.5, px: 0.5, textTransform: "none", fontWeight: 600 }}
          >
            {recoveryLabel}
          </Button>
        )}

        {recoveryUnavailable && (
          <Typography
            variant="caption"
            color={isMine ? "inherit" : "text.secondary"}
            sx={{ display: "block", mt: 0.5, opacity: isMine ? 0.85 : 1 }}
          >
            No recovery backup is saved for this account.
          </Typography>
        )}
      </Paper>

      {(footerLabel || time) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.5,
            px: 0.5,
            textAlign: isMine ? "right" : "left",
            fontSize: "0.7rem",
          }}
        >
          {footerLabel}
          {time}
        </Typography>
      )}
    </Box>
  );
}

