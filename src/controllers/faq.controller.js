import faqService from "../services/faq.service.js";
import sendResponse from "../utils/responseHandler.js";

export const getAllFaqs = async (req, res, next) => {
  try {
    const faqs = await faqService.getAllFaqs();
    return sendResponse(res, 200, true, "FAQs fetched successfully", faqs);
  } catch (error) {
    next(error);
  }
};

export const getFaqById = async (req, res, next) => {
  try {
    const faq = await faqService.getFaqById(req.params.id);
    return sendResponse(res, 200, true, "FAQ fetched successfully", faq);
  } catch (error) {
    next(error);
  }
};

export const getAllFaqsAdmin = async (req, res, next) => {
  try {
    const faqs = await faqService.getAllFaqs(false);
    return sendResponse(res, 200, true, "All FAQs fetched", faqs);
  } catch (error) {
    next(error);
  }
};

export const createFaq = async (req, res, next) => {
  try {
    let faq;
    if (Array.isArray(req.body)) {
      faq = await faqService.bulkCreateFaqs(req.body);
    } else {
      faq = await faqService.createFaq(req.body);
    }
    return sendResponse(res, 201, true, "FAQ(s) created successfully", faq);
  } catch (error) {
    next(error);
  }
};

export const updateFaq = async (req, res, next) => {
  try {
    const faq = await faqService.updateFaq(req.params.id, req.body);
    return sendResponse(res, 200, true, "FAQ updated successfully", faq);
  } catch (error) {
    next(error);
  }
};

export const toggleFaqStatus = async (req, res, next) => {
  try {
    const faq = await faqService.getFaqById(req.params.id);
    await faq.update({ is_active: !faq.is_active });
    return sendResponse(res, 200, true, `FAQ marked as ${faq.is_active ? "Active" : "Inactive"}`, faq);
  } catch (error) {
    next(error);
  }
};

export const deleteFaq = async (req, res, next) => {
  try {
    await faqService.deleteFaq(req.params.id);
    return sendResponse(res, 200, true, "FAQ deleted successfully");
  } catch (error) {
    next(error);
  }
};
