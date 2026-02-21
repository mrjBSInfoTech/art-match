// theme/modalTheme.js

// Common modal base style
const baseStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: '8px',
  boxShadow: 24,
  p: 4,
};

// Different modal size variants
export const modalStyles = {
  small: {
    ...baseStyle,
    width: 300,
  },
  medium: {
    ...baseStyle,
    width: 400,
  },
  large: {
    ...baseStyle,
    width: 600,
  },
  full: {
    ...baseStyle,
    width: '90%',
    height: '90%',
  },
};
