import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ConnectionErrorPanel from "../ConnectionErrorPanel";
import { SupportDialogTitle } from "./SupportTopicDialog";

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
      <SupportDialogTitle
        id="faq-info-title"
        icon={HelpOutlineOutlinedIcon}
        title="Frequently Asked Questions"
        subtitle="Quick answers about ordering, shipping, payments, and buyer protection."
        onClose={handleClose}
        closeLabel="Close frequently asked questions"
      />
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