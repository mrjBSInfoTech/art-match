import { forwardRef } from "react";
import { Button, Dialog, DialogTitle, Slide } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Match ArtworkForm's compact header, slide transition, divided body and footer.
export default function MessageDialog({
  open, onClose, title, titleId, icon, busy = false, children,
  width = 470, fullScreen = false, keepMounted = true,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted={keepMounted}
      fullScreen={fullScreen}
      maxWidth={false}
      aria-labelledby={titleId}
      PaperProps={{ sx: {
        width: `min(100% - 24px, ${width}px)`, maxWidth: `${width}px`,
        borderRadius: 3, overflow: "hidden", bgcolor: "background.paper",
        ...(fullScreen && { width: "100%", maxWidth: "100%", borderRadius: 0 }),
        "& .MuiDialogActions-root": { px: 3, py: 2 },
        "& .MuiDialogActions-root .MuiButton-contained": {
          borderRadius: 1.5, px: 2.5, textTransform: "none", fontWeight: 700, color: "#fff",
        },
      } }}
    >
      <DialogTitle id={titleId} sx={{
        display: "flex", alignItems: "center", gap: 0.75, px: 2.5, py: 1.75,
        color: "text.primary", fontSize: 16, fontWeight: 700,
        borderBottom: "1px solid", borderColor: "divider",
      }}>
        {icon}
        {title}
        <Button aria-label={`Close ${title}`} onClick={onClose} disabled={busy} sx={{
          minWidth: 28, width: 28, height: 28, ml: "auto", p: 0, color: "text.secondary",
        }}><CloseIcon sx={{ fontSize: 18 }} /></Button>
      </DialogTitle>
      {children}
    </Dialog>
  );
}
