import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ConnectionErrorPanel from "../ConnectionErrorPanel";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export default function FAQInfo({
  open,
  handleClose,
  faqs,
  loading,
  error,
  onRetry,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      scroll="paper"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 720px)",
          maxWidth: "720px",
          maxHeight: "calc(100% - 32px)",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      aria-labelledby="faq-info-title"
    >
      <DialogTitle
        id="faq-info-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <HelpOutlineOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        Frequently Asked Questions
        <Button
          aria-label="Close frequently asked questions"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <ConnectionErrorPanel
            title="FAQs Unavailable"
            onRetry={onRetry}
          />
        ) : !faqs.length ? (
          <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
            No frequently asked questions are available yet.
          </Typography>
        ) : (
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {faqs.map((faq, index) => (
              <Accordion
                key={faq.faq_id ?? index}
                disableGutters
                elevation={0}
                sx={{
                  backgroundColor: "transparent",
                  "&:before": { display: "none" },
                  "&:not(:last-of-type)": {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.95rem", sm: "1.05rem" },
                    }}
                  >
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    color="text.secondary"
                    sx={{
                      whiteSpace: "pre-line",
                      lineHeight: 1.7,
                      fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}