import { forwardRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Slide from "@mui/material/Slide";
import CloseIcon from "@mui/icons-material/Close";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ReportFormatDialog({ open, onClose, onSelectFormat }) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 440px)",
          maxWidth: "440px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 26px 60px rgba(2, 6, 23, 0.5)"
              : "0 24px 54px rgba(15, 23, 42, 0.12)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <DownloadRoundedIcon
          sx={{ color: theme.palette.error.main, fontSize: 20 }}
        />
        Export report
        <Button
          aria-label="Close export dialog"
          onClick={onClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent
        sx={{ p: 2.5, backgroundColor: theme.palette.background.paper }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            mt: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor:
              theme.palette.mode === "dark"
                ? alpha(theme.palette.error.main, 0.08)
                : alpha(theme.palette.error.main, 0.05),
          }}
        >
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Select format
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              color: theme.palette.text.primary,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Choose the file type you want to export for this report.
          </Typography>
        </Box>

        <Stack spacing={1.5} sx={{ pt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => onSelectFormat("csv")}
            sx={{
              justifyContent: "flex-start",
              p: 1.5,
              borderRadius: 2,
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              textTransform: "none",
              fontWeight: 700,
              minHeight: 62,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.primary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                }}
              >
                <ArticleOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ textAlign: "left", flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Download CSV
                </Typography>
                <Typography
                  sx={{ fontSize: 11, color: theme.palette.text.secondary }}
                >
                  Spreadsheet format for quick filtering
                </Typography>
              </Box>
            </Box>
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => onSelectFormat("pdf")}
            sx={{
              justifyContent: "flex-start",
              p: 1.5,
              borderRadius: 2,
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              textTransform: "none",
              fontWeight: 700,
              minHeight: 62,
              "&:hover": {
                borderColor: theme.palette.error.main,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.error.main, 0.1)
                    : alpha(theme.palette.error.main, 0.05),
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.error.main, 0.12),
                  color: theme.palette.error.main,
                }}
              >
                <PictureAsPdfOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ textAlign: "left", flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Download PDF
                </Typography>
                <Typography
                  sx={{ fontSize: 11, color: theme.palette.text.secondary }}
                >
                  Printable report for sharing and archiving
                </Typography>
              </Box>
            </Box>
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button onClick={onClose} color="text.secondary">
        </Button>
      </DialogActions>
    </Dialog>
  );
}
