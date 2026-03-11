import supportService from "../services/support.service.js";
import sendResponse from "../utils/responseHandler.js";

// ─── USER: Create Ticket ──────────────────────────────────────────────────
export const createTicket = async (req, res, next) => {
  try {
    const ticket = await supportService.createTicket(req.user.id, req.body);
    return sendResponse(res, 201, true, "Support ticket created", ticket);
  } catch (error) {
    next(error);
  }
};

// ─── USER: Get My Tickets ────────────────────────────────────────────────
export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await supportService.getUserTickets(req.user.id);
    return sendResponse(res, 200, true, "Tickets fetched", tickets);
  } catch (error) {
    next(error);
  }
};

// ─── USER/ADMIN: Get Ticket Details ──────────────────────────────────────
export const getTicketDetails = async (req, res, next) => {
  try {
    const userId = req.user.user_type === "admin" ? null : req.user.id;
    const ticket = await supportService.getTicketDetails(
      req.params.ticketId,
      userId,
    );
    return sendResponse(res, 200, true, "Ticket details fetched", ticket);
  } catch (error) {
    next(error);
  }
};

// ─── USER/ADMIN: Add Message ──────────────────────────────────────────────
export const addMessage = async (req, res, next) => {
  try {
    const senderRole = req.user.user_type;
    const message = await supportService.addMessage(
      req.params.ticketId,
      req.user.id,
      { ...req.body, sender_role: senderRole },
    );
    return sendResponse(res, 201, true, "Message added", message);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get All Tickets ───────────────────────────────────────────────
export const getAllTicketsAdmin = async (req, res, next) => {
  try {
    const result = await supportService.getAllTicketsAdmin(req.query);
    return sendResponse(res, 200, true, "All tickets fetched", result);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Update Status ─────────────────────────────────────────────────
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticket = await supportService.updateTicketStatus(
      req.params.ticketId,
      status,
    );
    return sendResponse(res, 200, true, "Ticket status updated", ticket);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get Stats ────────────────────────────────────────────────────
export const getSupportStats = async (req, res, next) => {
  try {
    const stats = await supportService.getSupportStats();
    return sendResponse(res, 200, true, "Support stats fetched", stats);
  } catch (error) {
    next(error);
  }
};
