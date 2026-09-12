import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Slide,
	Box,
	Typography,
} from "@mui/material";

const Transition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="up" ref={ref} {...props} />;
});

function CustomerInfo({ open, handleClose, selectedCustomer }) {
	const [customer, setCustomer] = useState(null);

	useEffect(() => {
		setCustomer(selectedCustomer || null);
	}, [selectedCustomer, open]);

	return (
		<Dialog
			open={open}
			onClose={handleClose}
			TransitionComponent={Transition}
			keepMounted
			PaperProps={{ sx: { minWidth: { xs: "320px", sm: "420px" } } }}
		>
			<DialogTitle sx={{ fontWeight: "bold" }}>Customer Information</DialogTitle>

			<DialogContent>
				{customer ? (
					<Box sx={{ mt: 1, display: "grid", gap: 1.25 }}>
						<Typography variant="body2" color="text.secondary">
							<strong>Full Name:</strong> {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Username:</strong> {customer.username || "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Email:</strong> {customer.email || "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Phone Number:</strong> {customer.phone_number || "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Address:</strong> {customer.address || "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Birthday:</strong>{" "}
							{customer.birthdate
								? new Date(customer.birthdate).toLocaleDateString("en-US", {
										month: "long",
										day: "numeric",
										year: "numeric",
									})
								: "Not provided"}
						</Typography>

						<Typography variant="body2" color="text.secondary">
							<strong>Account Status:</strong>{" "}
							{customer.is_banned ? "Banned" : customer.account_status || "Active"}
						</Typography>
					</Box>
				) : (
					<Typography>No customer selected.</Typography>
				)}
			</DialogContent>

			<DialogActions>
				<Button onClick={handleClose} color="secondary">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default CustomerInfo;
