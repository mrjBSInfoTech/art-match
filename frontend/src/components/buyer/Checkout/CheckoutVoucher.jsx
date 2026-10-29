import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";

const currency = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));

export default function CheckoutVoucher({ code, onCodeChange, onApply, onRemove, voucher, warning, checking, disabled }) {
  return (
    <Box component="section" aria-labelledby="checkout-voucher-title" sx={{ mt: 3 }}>
      <Typography id="checkout-voucher-title" variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
        Voucher
      </Typography>
      <Stack component="form" onSubmit={(event) => { event.preventDefault(); onApply(); }} spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems="flex-start">
          <TextField
            label="Voucher code"
            placeholder="Enter your voucher code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            disabled={disabled || checking}
            error={Boolean(warning)}
            fullWidth
            size="small"
            autoComplete="off"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#f44336" },
                "&:hover fieldset": { borderColor: "#f44336" },
                "&.Mui-focused fieldset": { borderColor: "#f44336" },
              },
              "& .MuiInputLabel-root": { color: "#f44336" },
            }}
            slotProps={{
              htmlInput: { maxLength: 20, autoCapitalize: "characters", spellCheck: false },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={disabled || checking || !code.trim() || Boolean(voucher)}
            sx={{ minWidth: 105, minHeight: 40, width: { xs: "100%", sm: "auto" } }}
          >
            {checking ? <CircularProgress size={20} aria-label="Checking voucher" /> : voucher ? "Applied" : "Apply"}
          </Button>
          {(code || voucher) && <Button onClick={onRemove} color="text.secondary" disabled={disabled || checking} sx={{ minHeight: 40 }}>Remove</Button>}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Minimum spend applies to qualifying artworks from the voucher&apos;s seller. One voucher per checkout.
        </Typography>
        {warning && <Alert severity="warning">{warning}</Alert>}
        {voucher && <Alert severity="success">{voucher.voucher.code} applied. You save {currency(voucher.discount_amount)}.</Alert>}
      </Stack>
    </Box>
  );
}
