import express from "express";
import {
  createTicket,
  getMyTickets,
  getTicketDetails,
  addMessage,
  getAllTicketsAdmin,
  updateTicketStatus,
  getSupportStats,
} from "../controllers/support.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// ─── USER ROUTES ─────────────────────────────────────────────────────────
router.post("/tickets", verifyJWT, createTicket);
router.get("/tickets/my", verifyJWT, getMyTickets);
router.get("/tickets/:ticketId", verifyJWT, getTicketDetails);
router.post("/tickets/:ticketId/messages", verifyJWT, addMessage);

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────
router.get("/admin/tickets", verifyJWT, isAdmin, getAllTicketsAdmin);
router.get("/admin/stats", verifyJWT, isAdmin, getSupportStats);
router.patch(
  "/admin/tickets/:ticketId/status",
  verifyJWT,
  isAdmin,
  updateTicketStatus,
);

export default router;
