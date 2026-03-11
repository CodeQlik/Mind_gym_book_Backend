import cmsService from "../services/cms.service.js";
import sendResponse from "../utils/responseHandler.js";

export const getPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await cmsService.getPageBySlug(slug);
    return sendResponse(res, 200, true, "Page fetched successfully", page);
  } catch (error) {
    next(error);
  }
};

export const getAllPagesAdmin = async (req, res, next) => {
  try {
    const pages = await cmsService.getAllPages();
    return sendResponse(res, 200, true, "All pages fetched", pages);
  } catch (error) {
    next(error);
  }
};

export const createOrUpdatePage = async (req, res, next) => {
  try {
    const page = await cmsService.createOrUpdatePage(req.body);
    return sendResponse(res, 201, true, "Page updated successfully", page);
  } catch (error) {
    next(error);
  }
};

export const deletePage = async (req, res, next) => {
  try {
    await cmsService.deletePage(req.params.id);
    return sendResponse(res, 200, true, "Page deleted successfully");
  } catch (error) {
    next(error);
  }
};
