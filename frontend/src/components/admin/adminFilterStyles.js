/**
 * Shared MUI `sx` helpers matching the filter input styling in `pages/admin/Admin.jsx`.
 */

export const adminSearchInputSx = (theme, extraSx = {}) => ({
  "& .MuiOutlinedInput-root": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
    borderRadius: 1.5,
    "& fieldset": { borderColor: theme.palette.divider },
    "&:hover fieldset": { borderColor: theme.palette.text.secondary },
  },
  "& .MuiInputLabel-root": {
    color: theme.palette.text.secondary,
  },
  "& .MuiInputBase-input::placeholder": {
    color: theme.palette.text.secondary,
    opacity: 1,
  },
  ...extraSx,
});

export const adminSelectInputSx = (theme, extraSx = {}) => ({
  fontSize: 12,
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.default,
  borderRadius: 1.5,
  ".MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.text.secondary,
  },
  ...extraSx,
});

