import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	InputLabel,
	MenuItem,
	Select,
	Slide,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

const Transition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="up" ref={ref} {...props} />;
});

const emptyForm = {
	username: "",
	password: "",
	confirmPassword: "",
	first_name: "",
	last_name: "",
	email: "",
	role: "admin",
	can_add: false,
	can_edit: false,
	can_delete: false,
	file: null,
};

const toBoolean = (value) =>
	value === true || value === 1 || ["1", "true"].includes(String(value).toLowerCase());

export default function AdminForm({ open, handleClose, onSubmit, selectedAdmin }) {
	const isEditMode = Boolean(selectedAdmin);
	const [formData, setFormData] = useState(emptyForm);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		setFormData({
			...emptyForm,
			username: selectedAdmin?.username || "",
			first_name: selectedAdmin?.first_name || "",
			last_name: selectedAdmin?.last_name || "",
			email: selectedAdmin?.email || "",
			role: selectedAdmin?.role || "admin",
			can_add: toBoolean(selectedAdmin?.can_add),
			can_edit: toBoolean(selectedAdmin?.can_edit),
			can_delete: toBoolean(selectedAdmin?.can_delete),
		});
		setError("");
	}, [open, selectedAdmin]);

	const handleChange = (event) => {
		const { name, value, checked, type } = event.target;
		setFormData((current) => ({
			...current,
			[name]: type === "checkbox" ? checked : value,
		}));
		setError("");
	};

	const handleSubmit = async () => {
		if (["username", "first_name", "last_name", "email"].some((field) => !formData[field].trim())) {
			setError("Please fill in all required fields.");
			return;
		}
		if (!isEditMode && !formData.password.trim()) {
			setError("Password is required when creating an account.");
			return;
		}
		if (formData.password || formData.confirmPassword) {
			if (formData.password.length < 6) {
				setError("Password must be at least 6 characters long.");
				return;
			}
			if (formData.password !== formData.confirmPassword) {
				setError("Passwords do not match.");
				return;
			}
		}

		setLoading(true);
		try {
			await onSubmit({ ...formData, password: formData.password.trim() });
			handleClose();
		} catch (submitError) {
			setError(submitError.message || "Unable to save admin account.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={loading ? undefined : handleClose} TransitionComponent={Transition} keepMounted maxWidth="sm" fullWidth>
			<DialogTitle sx={{ fontWeight: "bold" }}>
				{isEditMode ? "Manage Admin Access" : "Create Admin Account"}
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 1 }}>
					{error && <Alert severity="error">{error}</Alert>}
					<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
						<TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} disabled={loading} required />
						<TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} disabled={loading} required />
					</Box>
					<TextField label="Username" name="username" value={formData.username} onChange={handleChange} disabled={loading || isEditMode} required />
					<TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={loading} required />
					<FormControl fullWidth disabled={loading}>
						<InputLabel>Account Type</InputLabel>
						<Select name="role" value={formData.role} label="Account Type" onChange={handleChange}>
							<MenuItem value="admin">Admin</MenuItem>
							<MenuItem value="super admin">Super Admin</MenuItem>
						</Select>
					</FormControl>
					<Box sx={{ bgcolor: "action.hover", border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
						<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>Account Permissions</Typography>
						<Box sx={{ display: "flex", flexDirection: "column" }}>
							<FormControlLabel control={<Checkbox name="can_add" checked={formData.can_add} onChange={handleChange} disabled={loading} />} label="Can Add" />
							<FormControlLabel control={<Checkbox name="can_edit" checked={formData.can_edit} onChange={handleChange} disabled={loading} />} label="Can Edit" />
							<FormControlLabel control={<Checkbox name="can_delete" checked={formData.can_delete} onChange={handleChange} disabled={loading} />} label="Can Delete" />
						</Box>
					</Box>
					<TextField type="password" label="Password" name="password" value={formData.password} onChange={handleChange} disabled={loading} required={!isEditMode} helperText={isEditMode ? "Optional. Leave empty to keep the current password." : "Minimum 6 characters."} />
					<TextField type="password" label="Confirm Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} disabled={loading} required={!isEditMode} />
					<Button component="label" variant="outlined" disabled={loading}>
						{formData.file ? formData.file.name : "Choose profile image (optional)"}
						<input hidden type="file" accept="image/*" onChange={(event) => setFormData((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
					</Button>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} color="secondary" disabled={loading}>Cancel</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={loading}>{isEditMode ? "Update Access" : "Create Account"}</Button>
			</DialogActions>
		</Dialog>
	);
}
