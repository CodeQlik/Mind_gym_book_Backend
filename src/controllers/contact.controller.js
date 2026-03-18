import contactService from "../services/contact.service.js";

class ContactController {
  async submit(req, res) {
    try {
      const { name, email, phone, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          status: "error",
          message: "Name, email, subject and message are required fields.",
        });
      }

      const ip_address =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      const query = await contactService.submitQuery({
        name,
        email,
        phone,
        subject,
        message,
        ip_address,
      });

      res.status(201).json({
        status: "success",
        message: "Your inquiry has been submitted successfully.",
        data: query,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit } = req.query;
      const result = await contactService.getAllQueries(
        parseInt(page) || 1,
        parseInt(limit) || 10,
      );
      res.status(200).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          status: "error",
          message: "Status is required",
        });
      }

      const query = await contactService.updateQueryStatus(id, status);
      res.status(200).json({
        status: "success",
        message: "Status updated successfully",
        data: query,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await contactService.deleteQuery(id);
      res.status(200).json({
        status: "success",
        message: "Message deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
}

export default new ContactController();
