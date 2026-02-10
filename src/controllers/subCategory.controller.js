import subcategoryService from "../services/subCategory.service.js";
import { validationResult } from "express-validator";
import sendResponse from "../utils/responseHandler.js";

export const createSubCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        400,
        false,
        errors.array()[0].msg,
        errors.array(),
      );
    }

    const subCategory = await subcategoryService.createSubCategory(
      req.body,
      req.file,
    );

    return sendResponse(
      res,
      201,
      true,
      "Subcategory successfully add ho gayi!",
      subCategory,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubCategories = async (req, res, next) => {
  try {
    const isAdminRequest = req.user && req.user.role === "admin";
    const subCategories =
      await subcategoryService.getSubCategories(!isAdminRequest);
    return sendResponse(
      res,
      200,
      true,
      "Subcategories fetched successfully",
      subCategories,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubCategoryById = async (req, res, next) => {
  try {
    const subCategory = await subcategoryService.getSubCategoryById(
      req.params.id,
    );
    return sendResponse(
      res,
      200,
      true,
      "Subcategory fetched successfully",
      subCategory,
    );
  } catch (error) {
    next(error);
  }
};

export const updateSubCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        400,
        false,
        errors.array()[0].msg,
        errors.array(),
      );
    }

    const subCategory = await subcategoryService.updateSubCategory(
      req.params.id,
      req.body,
      req.file,
    );
    return sendResponse(
      res,
      200,
      true,
      "Subcategory updated successfully",
      subCategory,
    );
  } catch (error) {
    next(error);
  }
};

export const deleteSubCategory = async (req, res, next) => {
  try {
    await subcategoryService.deleteSubCategory(req.params.id);
    return sendResponse(res, 200, true, "Subcategory deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getSubCategoriesByCategoryId = async (req, res, next) => {
  try {
    const subCategories = await subcategoryService.getSubCategoriesByCategoryId(
      req.params.categoryId,
    );
    return sendResponse(
      res,
      200,
      true,
      "Subcategories fetched for category",
      subCategories,
    );
  } catch (error) {
    next(error);
  }
};
