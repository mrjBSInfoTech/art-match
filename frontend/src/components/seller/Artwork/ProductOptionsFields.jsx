import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArtworkImage from "../../common/ArtworkImage";
import { createEmptyProductOption } from "../../../utils/productOptions";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function ProductOptionsFields({
  options,
  priceMode,
  errors = {},
  onChange,
  onPriceModeChange,
}) {
  const updateOption = (index, updates) => {
    onChange(options.map((option, optionIndex) =>
      optionIndex === index ? { ...option, ...updates } : option,
    ));
  };

  const handleImageChange = (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      updateOption(index, { imageError: "Product pictures must be 2MB or smaller." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateOption(index, {
      image: null,
      imageFile: file,
      imagePreview: reader.result,
      imageError: "",
    });
    reader.onerror = () => updateOption(index, {
      imageError: "Unable to preview this product picture.",
    });
    reader.readAsDataURL(file);
  };

  return (
    <Box component="section" sx={{ gridColumn: "1 / -1" }}>
      <Stack spacing={2}>
        <Box>
          <Typography component="h3" variant="subtitle2">
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add at least two product options. Set each option&apos;s available quantity and description; pictures are optional.
          </Typography>
        </Box>

        <FormControlLabel
          label="Set a different price for each product"
          control={(
            <Switch
              checked={priceMode === "manual"}
              onChange={(event) => onPriceModeChange(event.target.checked ? "manual" : "shared")}
            />
          )}
        />
        <Typography variant="body2" color="text.secondary">
          {priceMode === "manual"
            ? "Enter a price for each product. The disabled artwork price shows the lowest product price."
            : "All products use the artwork price."}
        </Typography>

        {errors.product_options && (
          <Typography color="error" variant="body2" role="alert">
            {errors.product_options}
          </Typography>
        )}

        {options.map((option, index) => {
          const optionErrors = errors[index] || {};
          return (
            <Box
              key={option.id}
              sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2">Product {index + 1}</Typography>
                  {options.length > 2 && (
                    <IconButton
                      aria-label={`Remove product ${index + 1}`}
                      onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </Stack>
                <TextField
                  required
                  fullWidth
                  label="Product name"
                  value={option.name}
                  onChange={(event) => updateOption(index, { name: event.target.value })}
                  error={Boolean(optionErrors.name)}
                  helperText={optionErrors.name}
                />
                <TextField
                  required
                  fullWidth
                  label="Description"
                  value={option.description}
                  onChange={(event) => updateOption(index, { description: event.target.value })}
                  error={Boolean(optionErrors.description)}
                  helperText={optionErrors.description || "Describe this product (up to 2000 characters)."}
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                <TextField
                  required
                  fullWidth
                  label="Quantity available"
                  type="number"
                  value={option.quantity}
                  onChange={(event) => updateOption(index, { quantity: event.target.value })}
                  error={Boolean(optionErrors.quantity)}
                  helperText={optionErrors.quantity || "Enter a whole number greater than 0."}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
                {priceMode === "manual" && (
                  <TextField
                    required
                    fullWidth
                    label="Product price"
                    type="number"
                    value={option.price ?? ""}
                    onChange={(event) => updateOption(index, { price: event.target.value })}
                    error={Boolean(optionErrors.price)}
                    helperText={optionErrors.price || "Enter a price greater than zero."}
                    slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                  />
                )}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {option.imagePreview && (
                    <ArtworkImage
                      image={option.imagePreview}
                      alt={`${option.name || `Product ${index + 1}`} picture preview`}
                      sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1 }}
                    />
                  )}
                  <Button variant="outlined" component="label">
                    {option.imagePreview ? "Change picture" : "Add picture (optional)"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageChange(index, event)}
                    />
                  </Button>
                  {option.imagePreview && (
                    <Button
                      color="inherit"
                      onClick={() => updateOption(index, {
                        image: null,
                        imageFile: null,
                        imagePreview: null,
                        imageError: "",
                      })}
                    >
                      Remove picture
                    </Button>
                  )}
                </Stack>
                {option.imageError && (
                  <Typography color="error" variant="body2" role="alert">
                    {option.imageError}
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => onChange([...options, createEmptyProductOption()])}
        >
          Add another product
        </Button>
      </Stack>
    </Box>
  );
}