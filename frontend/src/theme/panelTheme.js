import { createTheme } from "@mui/material/styles";

export function createPanelTheme(theme) {
  return createTheme(theme, {
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            paddingInline: 16,
            borderRadius: 10,
            fontWeight: 600,
            transition: "background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease",
            "&:focus-visible": {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          },
          sizeSmall: {
            minHeight: 40,
            paddingInline: 12,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 44,
            minHeight: 44,
            "&:focus-visible": {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 48,
            borderRadius: 10,
            transition: "background-color 140ms ease, color 140ms ease",
            "&:focus-visible": {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: -3,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 10,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            borderColor: theme.palette.divider,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: {
            borderRadius: 16,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            whiteSpace: "nowrap",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 48,
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
    },
  });
}
