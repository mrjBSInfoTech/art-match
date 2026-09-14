import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Stack,
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
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
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
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
        <GetAppIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Export Data
        <Button
          aria-label="Close customer information"
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

      <DialogContent dividers sx={{ pt: 3 }}>
        <Stack spacing={2} mt={1}>
          <Button
            variant="contained"
            onClick={onExportExcel}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "#22C55E",
              color: "#fff",
            }}
          >
            <InsertDriveFileIcon /> Export to Excel
          </Button>

          <Button
            variant="contained"
            onClick={onExportCSV}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "#2245c5",
              color: "#fff",
            }}
          >
            <ArticleIcon /> Export to CSV
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="text.secondary" >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Export;
