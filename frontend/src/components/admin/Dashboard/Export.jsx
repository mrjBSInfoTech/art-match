import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Export({ open, handleClose, onExportExcel, onExportCSV }) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <GetAppIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        Export data
        <Button
          aria-label="Close export dialog"
          onClick={handleClose}
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

      <DialogContent sx={{ p: 2.5, backgroundColor: theme.palette.background.paper }}>
        <Box
          sx={{
            p: 1.5,
            mt: 2,
            borderRadius: 2,
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
            Choose the file type you want to export from the dashboard.
          </Typography>
        </Box>

        <Stack spacing={1.5} sx={{ pt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onExportExcel}
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
                borderColor: theme.palette.success.main,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.success.main, 0.1)
                    : alpha(theme.palette.success.main, 0.05),
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1.25 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.12),
                  color: theme.palette.success.main,
                }}
              >
                <InsertDriveFileOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ textAlign: "left", flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Export to Excel</Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                  Download a spreadsheet version of the dashboard data
                </Typography>
              </Box>
            </Box>
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={onExportCSV}
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
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1.25 }}>
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
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Export to CSV</Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                  Download a clean CSV file for reporting and imports
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
        <Button
          onClick={handleClose} color="text.secondary"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Export;
