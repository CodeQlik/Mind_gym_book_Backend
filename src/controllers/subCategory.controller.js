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
    const isAdminRequest = req.user && req.user.user_type === "admin";
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
    const isAdminRequest = req.user && req.user.user_type === "admin";
    const subCategory = await subcategoryService.getSubCategoryById(
      req.params.id,
      !isAdminRequest,
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
    const { categoryId } = req.params;
    const isAdminRequest = req.user && req.user.user_type === "admin";

    const subCategories = await subcategoryService.getSubCategoriesByCategoryId(
      categoryId,
      !isAdminRequest,
    );

    if (!subCategories || subCategories.length === 0) {
      return sendResponse(
        res,
        200,
        true,
        "Is category ke liye koi subcategories nahi mili!",
        [],
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Subcategories successfully fetch ho gayi!",
      subCategories,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubCategoriesByCategorySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const isAdminRequest = req.user && req.user.user_type === "admin";

    const subCategories =
      await subcategoryService.getSubCategoriesByCategorySlug(
        slug,
        !isAdminRequest,
      );

    if (!subCategories || subCategories.length === 0) {
      return sendResponse(
        res,
        200,
        true,
        "Is category ke liye koi subcategories nahi mili!",
        [],
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Subcategories successfully fetch ho gayi!",
      subCategories,
    );
  } catch (error) {
    next(error);
  }
};

export const toggleSubCategoryStatus = async (req, res, next) => {
  try {
    const subCategory = await subcategoryService.toggleSubCategoryStatus(
      req.params.id,
    );
    return sendResponse(
      res,
      200,
      true,
      `Subcategory ${subCategory.is_active ? "activated" : "deactivated"} successfully`,
      subCategory,
    );
  } catch (error) {
    next(error);
  }
};

export const searchSubCategories = async (req, res, next) => {
  try {
    const { q } = req.query;
    const isAdminRequest = req.user && req.user.user_type === "admin";
    const subCategories = await subcategoryService.searchSubCategories(
      q,
      !isAdminRequest,
    );
    return sendResponse(
      res,
      200,
      true,
      "Search results fetched",
      subCategories,
    );
  } catch (error) {
    next(error);
  }
};
