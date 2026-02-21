import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  Typography,
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import {
  fetchCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../api/categoryAPI";
import CategoryForm from "../components/Category/CategoryForm";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [sortOption, setSortOption] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 🟢 Load all categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchCategories();
      if (response && response.data) {
        setCategories(Array.isArray(response.data) ? response.data : []);
      } else {
        setCategories([]);
        setErrorMessage("⚠️ No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setCategories([]);
      setErrorMessage(
        "⚠️ Failed to fetch categories data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadCategories();
  }, []);

  // ➕ Open Add Modal
  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setOpenModal(true);
  };

  // ✏️ Open Edit Modal
  const handleOpenEdit = (category) => {
    setSelectedCategory(category);
    setOpenModal(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (category) => {
    setSelectedCategory(category);
    setOpenDeleteModal(true);
  };

  const handleClose = () => setOpenModal(false);

  // 💾 Submit (Add or Edit)
  const handleSubmit = async (formData) => {
    try {
      if (selectedCategory) {
        await updateCategory(selectedCategory.category_id, formData);
        showSnackbar("✓ Editing Complete");
      } else {
        await addCategory(formData);
        showSnackbar("✓ Adding Complete");
      }
      await loadCategories();
      setOpenModal(false);
    } catch (err) {
      console.error("Error saving category:", err);
    }
  };

  // 🗑️ Submit (Delete)
  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      await loadCategories();
      setOpenDeleteModal(false);
      showSnackbar("✓ Deletion Complete");
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // 🧠 Filter and Sort Logic
  const filteredCategories = categories
    .filter((category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "highToLow") {
        return (b.product_count || 0) - (a.product_count || 0);
      } else if (sortOption === "lowToHigh") {
        return (a.product_count || 0) - (b.product_count || 0);
      }
      return 0;
    });

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
            Category
          </Typography>
          <Typography variant="body1" sx={{ mt: -1 }}>
            Welcome to the Category management page.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenAdd}
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Category
        </Button>
      </Box>
      {/* Filter Placeholder */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search category..."
            size="small"
            sx={{ width: { xs: 290, lg: 250 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FormControl size="small" sx={{ width: { xs: 290, lg: 180 } }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortOption}
              label="Sort"
              onChange={(e) => setSortOption(e.target.value)}
            >
              <MenuItem value="highToLow">High to Low</MenuItem>
              <MenuItem value="lowToHigh">Low to High</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Category Table */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Category List</Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <TableContainer
            component={Paper}
            sx={{
              width: "90%",
              maxHeight: "500px",
              margin: "0 auto",
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "10px",
              },
              "&::-webkit-scrollbar-track": {
                background: "#f1f1f1",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#888",
                borderRadius: "5px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "#555",
              },
            }}
          >
            <Table
              stickyHeader
              sx={{ minWidth: 650 }}
              aria-label="category table"
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      width: "20%",
                      backgroundColor: "#1565c0",
                      color: "white",
                      fontWeight: "bold",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    No.
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "20%",
                      backgroundColor: "#1565c0",
                      color: "white",
                      fontWeight: "bold",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      align: "center",
                    }}
                  >
                    Category Name
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "20%",
                      backgroundColor: "#1565c0",
                      color: "white",
                      fontWeight: "bold",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      align: "center",
                    }}
                  >
                    Products
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "20%",
                      backgroundColor: "#1565c0",
                      color: "white",
                      fontWeight: "bold",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Box sx={{ width: "80%", margin: "0 auto" }}>
                        <LinearProgress color="primary" />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : errorMessage ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: "red" }}>
                      {errorMessage}
                    </TableCell>
                  </TableRow>
                ) : categories.length > 0 ? (
                  filteredCategories.map((category, index) => (
                    <TableRow key={category.category_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.product_count || 0}</TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            color="success"
                            onClick={() => handleOpenEdit(category)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() =>
                              handleOpenDelete(category.category_id)
                            }
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No categories found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Add/Edit Form Modal */}
      <CategoryForm
        open={openModal}
        handleClose={handleClose}
        onSubmit={handleSubmit}
        selectedCategory={selectedCategory}
      />
      <CategoryForm
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        onSubmit={handleDelete}
        selectedCategory={selectedCategory}
        mode="delete"
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
