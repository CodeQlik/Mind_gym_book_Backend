import { Faq } from "../models/index.js";

class FaqService {
  async getAllFaqs(isActiveOnly = true) {
    const where = isActiveOnly ? { is_active: true } : {};
    return await Faq.findAll({
      where,
      order: [["order", "ASC"], ["created_at", "DESC"]],
    });
  }

  async getFaqById(id) {
    const faq = await Faq.findByPk(id);
    if (!faq) throw new Error("FAQ not found");
    return faq;
  }

  async createFaq(data) {
    const { question, answer, is_active, order } = data;
    if (!question || !answer) {
      throw new Error("Question and Answer are required");
    }
    return await Faq.create({
      question,
      answer,
      is_active: is_active !== undefined ? is_active : true,
      order: order || 0,
    });
  }

  async bulkCreateFaqs(faqsData) {
    if (!Array.isArray(faqsData) || faqsData.length === 0) {
      throw new Error("Invalid FAQs data. Expected a non-empty array.");
    }
    
    const preparedFaqs = faqsData.map(faq => ({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active !== undefined ? faq.is_active : true,
      order: faq.order || 0
    }));

    return await Faq.bulkCreate(preparedFaqs);
  }

  async updateFaq(id, data) {
    const faq = await this.getFaqById(id);
    await faq.update(data);
    return faq;
  }

  async deleteFaq(id) {
    const faq = await this.getFaqById(id);
    await faq.destroy();
    return true;
  }
}

export default new FaqService();
