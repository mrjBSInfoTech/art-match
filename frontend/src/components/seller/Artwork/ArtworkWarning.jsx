import React from "react";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ArtworkWarning({
  open,
  handleClose,
  navigate,
  reason,
  missingFields = [],
  profileError,
}) {
  const theme = useTheme();
  const isIncomplete = reason === "incomplete";
  const isLoading = reason === "loading";
  const isProfileError = reason === "profile-error";

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

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
        <WarningIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {isIncomplete
          ? "Complete Your Account Information"
          : isLoading
            ? "Checking Account Information"
            : isProfileError
              ? "Unable to Check Account Information"
              : "Account Verification Required"}
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

      <DialogContent>
        {isIncomplete ? (
          <>
            <Typography>
              Complete the following information in Settings before adding new
              artwork:
            </Typography>
            <ul>
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </>
        ) : isLoading ? (
          <Typography>
            Your account information is still loading. Please try again in a
            moment.
          </Typography>
        ) : isProfileError ? (
          <Alert severity="error">
            {profileError || "Your account information could not be checked."}{" "}
            Open Settings to review your information, then try again.
          </Alert>
        ) : (
          <Typography>
            Your seller account is waiting for admin verification. You can add
            artwork after your account has been verified.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {(isIncomplete || isProfileError) && (
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleClose();
              navigate("/seller/settings");
            }}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Complete Profile in Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkWarning;
