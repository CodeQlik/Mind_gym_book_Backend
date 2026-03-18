import { ContactQuery } from "../models/index.js";
import nodemailer from "nodemailer";

class ContactService {
  async submitQuery(data) {
    const query = await ContactQuery.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      ip_address: data.ip_address,
    });

    // Optional: Send email to admin
    this.sendEmailToAdmin(query).catch((err) =>
      console.error("Failed to send contact email to admin:", err.message),
    );

    return query;
  }

  async sendEmailToAdmin(query) {
    // Basic implementation using existing env vars
    const transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: process.env.NODEMAILER_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.APP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_ID,
      to: process.env.EMAIL_ID, // Send to self/admin
      subject: `New Contact Inquiry: ${query.subject}`,
      html: `
        <h3>New Inquiry Received</h3>
        <p><strong>Name:</strong> ${query.name}</p>
        <p><strong>Email:</strong> ${query.email}</p>
        <p><strong>Phone:</strong> ${query.phone || "N/A"}</p>
        <p><strong>Subject:</strong> ${query.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${query.message}</p>
      `,
    };

    return await transporter.sendMail(mailOptions);
  }

  async getAllQueries(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await ContactQuery.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      queries: rows,
    };
  }

  async updateQueryStatus(id, status) {
    const query = await ContactQuery.findByPk(id);
    if (!query) throw new Error("The specified inquiry was not found.");

    query.status = status;
    await query.save();
    return query;
  }

  async deleteQuery(id) {
    const query = await ContactQuery.findByPk(id);
    if (!query) throw new Error("The specified inquiry was not found.");

    await query.destroy();
    return true;
  }
}

export default new ContactService();
