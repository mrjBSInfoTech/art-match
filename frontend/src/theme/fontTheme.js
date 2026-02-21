// src/theme/fontTheme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: '"Arial", "Helvetica", "sans-serif"',
    fontWeightLight: 300,   // thin
    fontWeightRegular: 400, // normal
    fontWeightMedium: 500,  // semi-bold
    fontWeightBold: 700,    // bold

    // Optional: customize specific variants (like h1, h2, body1, etc.)
    h1: {
      fontWeight: 700, // bold
      fontSize: "2.5rem",
    },
    h2: {
      fontWeight: 600,
      fontSize: "2rem",
    },
    body1: {
      fontWeight: 400, // normal
    },
    body2: {
      fontWeight: 300, // thin
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Arial", "Helvetica", "sans-serif"',
          fontWeight: 400, // default for plain text
        },
      },
    },
  },
});

export default theme;
