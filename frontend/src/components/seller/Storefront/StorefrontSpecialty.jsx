import React from "react";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

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

export default function StorefrontSpecialty({
  open,
  onClose,
  specialtyOptions,
  draftSpecialties,
  customSpecialty,
  saving,
  onToggleSpecialty,
  onCustomSpecialtyChange,
  onAddSpecialty,
  onSave,
}) {
  const theme = useTheme();

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
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
          <PaletteOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
          Edit specialties
          <Button
            type="button"
            aria-label="Close specialties dialog"
            onClick={onClose}
            disabled={saving}
            sx={{
              minWidth: 40,
              width: 40,
              height: 40,
              ml: "auto",
              p: 0,
              color: theme.palette.text.secondary,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select up to 3 listed specialties, or add your own.
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            {specialtyOptions.map((specialty) => {
              const isSelected = draftSpecialties.includes(specialty);
              return (
                <Chip
                  key={specialty}
                  label={specialty}
                  clickable
                  color={isSelected ? "error" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  disabled={saving || (!isSelected && draftSpecialties.length >= 3)}
                  onClick={() => onToggleSpecialty(specialty)}
                />
              );
            })}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Custom specialty"
              value={customSpecialty}
              onChange={(event) => onCustomSpecialtyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddSpecialty();
                }
              }}
              disabled={saving || draftSpecialties.length >= 3}
            />
            <Button
              type="button"
              variant="outlined"
              color="error"
              onClick={onAddSpecialty}
              disabled={
                saving ||
                !customSpecialty.trim() ||
                draftSpecialties.length >= 3
              }
              sx={{ minHeight: 40 }}
            >
              Add
            </Button>
          </Stack>
          {!!draftSpecialties.length && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 2 }}
            >
              {draftSpecialties.map((specialty) => (
                <Chip
                  key={specialty}
                  label={specialty}
                  color="error"
                  onDelete={() => onToggleSpecialty(specialty)}
                  disabled={saving}
                />
              ))}
            </Stack>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1.5 }}
          >
            {3 - draftSpecialties.length} specialty slots remaining.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button type="button" color="text.secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            type="submit"
            disabled={saving}
            sx={{
              minHeight: 44,
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {saving && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}