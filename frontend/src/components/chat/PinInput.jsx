import { useRef } from "react";
import { Box } from "@mui/material";

const PIN_LENGTH = 6;

export default function PinInput({
  value = "",
  onChange,
  onComplete,
  autoFocus = false,
  disabled = false,
  error = false,
  firstInputRef,
  ariaLabel = "PIN",
}) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: PIN_LENGTH }, (_, index) => value[index] || "");

  const focusInput = (index) => {
    const input = inputsRef.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const update = (nextValue, focusIndex) => {
    const clean = nextValue.replace(/\D/g, "").slice(0, PIN_LENGTH);
    onChange?.(clean);
    if (focusIndex !== undefined) focusInput(focusIndex);
    if (clean.length === PIN_LENGTH && clean !== value) onComplete?.(clean);
  };

  const handleChange = (index, event) => {
    const typed = event.target.value.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Pasted or autofilled several digits into one box.
      const next = (value.slice(0, index) + typed).slice(0, PIN_LENGTH);
      update(next, next.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    update(chars.join("").slice(0, Math.max(value.length, index + 1)), index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        update(value.slice(0, index) + value.slice(index + 1), index);
      } else if (index > 0) {
        update(value.slice(0, index - 1) + value.slice(index), index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const next = pasted.slice(0, PIN_LENGTH);
    update(next, next.length);
  };

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{ display: "flex", gap: 1, justifyContent: "center" }}
    >
      {digits.map((digit, index) => (
        <Box
          key={index}
          component="input"
          ref={(element) => {
            inputsRef.current[index] = element;
            if (index === 0 && firstInputRef) firstInputRef.current = element;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`${ariaLabel} digit ${index + 1}`}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          maxLength={PIN_LENGTH}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => {
            // Always type into the first empty box so digits stay in order.
            if (index > value.length) {
              focusInput(value.length);
              return;
            }
            event.target.select();
          }}
          sx={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            borderRadius: 1.5,
            border: "1.5px solid",
            borderColor: error ? "error.main" : digit ? "primary.main" : "divider",
            bgcolor: "background.paper",
            color: "text.primary",
            outline: "none",
            transition: "border-color 120ms, box-shadow 120ms",
            "&:focus": {
              borderColor: error ? "error.main" : "primary.main",
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}33`,
            },
            "&:disabled": { opacity: 0.6 },
          }}
        />
      ))}
    </Box>
  );
}
