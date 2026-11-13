import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SendIcon from "@mui/icons-material/Send";

export function ChatAttachmentPreview({ file, previewUrl, onRemove }) {
  if (!previewUrl) return null;

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        pt: 1.25,
        pb: 0.75,
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      <Box sx={{ position: "relative", display: "inline-block" }}>
        {file?.type?.startsWith("video/") ? (
          <video
            src={previewUrl}
            controls
            style={{
              width: 76,
              height: 76,
              borderRadius: 10,
              objectFit: "cover",
              display: "block",
              background: "#000",
            }}
          />
        ) : !file?.type || file.type.startsWith("image/") ? (
          <Box
            component="img"
            src={previewUrl}
            alt="Attachment preview"
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Chip
            icon={<InsertDriveFileOutlinedIcon />}
            label={file?.name || "Attachment"}
            variant="outlined"
            sx={{ maxWidth: 240, pr: 1 }}
          />
        )}
        <IconButton
          size="small"
          aria-label="Remove attachment"
          onClick={onRemove}
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            bgcolor: "error.main",
            color: "#fff",
            "&:hover": { bgcolor: "error.dark" },
            p: 0.35,
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  sending = false,
  canSend = false,
  hasAttachment = false,
  fileInputRef,
  accept = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv",
  onFileChange,
  helperText = "",
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 2 },
        py: { xs: 1.25, sm: 1.5 },
        borderTop: hasAttachment ? "none" : "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        bgcolor: "background.paper",
      }}
    >
      {helperText && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: 12.5 }}>
          {helperText}
        </Typography>
      )}
      <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} alignItems="flex-end">
        {onFileChange && (
          <>
            <input
              type="file"
              accept={accept}
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            <IconButton
              aria-label="Attach image or file"
              onClick={() => fileInputRef?.current?.click()}
              disabled={disabled || sending}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                color: "text.secondary",
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                  color: "error.main",
                },
              }}
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </>
        )}

        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={value}
          disabled={disabled || sending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.common.white, 0.03)
                  : alpha(theme.palette.common.black, 0.02),
            },
          }}
        />

        <IconButton
          aria-label="Send message"
          onClick={onSend}
          disabled={!canSend || disabled || sending}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            bgcolor: "error.main",
            color: "#fff",
            "&:hover": { bgcolor: "error.dark" },
            "&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
          }}
        >
          {sending ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <SendIcon fontSize="small" />
          )}
        </IconButton>
      </Stack>
    </Box>
  );
}

