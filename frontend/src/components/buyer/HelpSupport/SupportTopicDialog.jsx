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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";

const DialogTransition = React.forwardRef(function DialogTransition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={400}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export function SupportDialogTitle({
  id,
  icon: Icon,
  title,
  subtitle,
  onClose,
  closeLabel = "Close dialog",
}) {
  const theme = useTheme();

  return (
    <DialogTitle
      id={id}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2.5,
        py: 1.75,
        color: theme.palette.text.primary,
        fontSize: { xs: "1.1rem", sm: "1.25rem" },
        fontWeight: 700,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      {Icon && <Icon sx={{ color: theme.palette.error.main, fontSize: 22 }} />}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Button
        aria-label={closeLabel}
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
  );
}

export default function SupportTopicDialog({
  open,
  handleClose,
  titleId,
  icon,
  title,
  subtitle,
  items,
  primaryAction,
  secondaryAction,
}) {
  const theme = useTheme();
  const navigate = useNavigate();

  const navigateAndClose = (targetPath) => {
    handleClose();
    navigate(targetPath);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={DialogTransition}
      scroll="paper"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 720px)",
          maxWidth: "720px",
          maxHeight: "calc(100% - 32px)",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      aria-labelledby={titleId}
    >
      <SupportDialogTitle
        id={titleId}
        icon={icon}
        title={title}
        subtitle={subtitle}
        onClose={handleClose}
        closeLabel={`Close ${title}`}
      />
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          {items.map((item) => (
            <Box
              key={item.heading}
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                {item.heading}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {item.body}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.75, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        {secondaryAction && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => navigateAndClose(secondaryAction.path)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            {secondaryAction.label}
          </Button>
        )}
        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleClose}
            color="inherit"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Close
          </Button>
          {primaryAction && (
            <Button
              variant="contained"
              color="error"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigateAndClose(primaryAction.path)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, color: "#fff" }}
            >
              {primaryAction.label}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
