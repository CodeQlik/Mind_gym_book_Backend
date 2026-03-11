import { SupportTicket, SupportMessage, User, Order } from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

class SupportService {
  /**
   * Create a new support ticket (USER)
   */
  async createTicket(userId, { subject, description, order_id, priority }) {
    return await SupportTicket.create({
      user_id: userId,
      subject,
      description,
      order_id: order_id || null,
      priority: priority || "medium",
      status: "open",
    });
  }

  /**
   * Get all tickets for a user (USER)
   */
  async getUserTickets(userId) {
    return await SupportTicket.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: SupportMessage,
          as: "messages",
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
    });
  }

  /**
   * Get single ticket with messages
   */
  async getTicketDetails(ticketId, userId = null) {
    const where = { id: ticketId };
    if (userId) where.user_id = userId;

    const ticket = await SupportTicket.findOne({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Order,
          as: "order",
          attributes: ["id", "order_no", "total_amount", "createdAt"],
        },
        {
          model: SupportMessage,
          as: "messages",
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [[{ model: SupportMessage, as: "messages" }, "createdAt", "ASC"]],
    });

    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  /**
   * Add a message/reply to a ticket
   */
  async addMessage(ticketId, senderId, { message, sender_role, attachments }) {
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const newMessage = await SupportMessage.create({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_role,
      message,
      attachments,
    });

    // Auto update status if admin replies
    if (sender_role === "admin" && ticket.status === "open") {
      await ticket.update({ status: "in_progress" });
    }

    return newMessage;
  }

  /**
   * ADMIN: Get all tickets with filters
   */
  async getAllTicketsAdmin({ status, priority, search, page = 1, limit = 10 }) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (search) {
      where[Op.or] = [
        { ticket_no: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { "$user.name$": { [Op.like]: `%${search}%` } },
        { "$user.email$": { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [
        ["status", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: limitNum,
      offset: offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      tickets: rows,
    };
  }

  /**
   * ADMIN: Update ticket status
   */
  async updateTicketStatus(ticketId, status) {
    const id = Number(ticketId);
    const ticket = await SupportTicket.findOne({ where: { id } });
    if (!ticket) throw new Error(`Ticket with ID ${id} not found`);

    const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
    if (!VALID_STATUSES.includes(status)) throw new Error("Invalid status");

    await ticket.update({ status });
    return ticket;
  }

  /**
   * ADMIN: Get dashboard stats
   */
  async getSupportStats() {
    const stats = await SupportTicket.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const result = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: 0,
    };

    stats.forEach((s) => {
      result[s.status] = parseInt(s.count);
      result.total += parseInt(s.count);
    });

    return result;
  }
}

export default new SupportService();
