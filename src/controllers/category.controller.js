import categoryService from '../services/category.service.js';
import sendResponse from '../utils/responseHandler.js';
import { validationResult } from 'express-validator';

export const createCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, errors.array()[0].msg, errors.array());
        }

        const category = await categoryService.createCategory(req.body, req.file);
        return sendResponse(res, 201, true, "Category created successfully", category);
    } catch (error) {
        next(error);
    }
};

// Public categories (Only active)
export const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories(true);
        if (categories.length === 0) {
            return sendResponse(res, 200, true, "No categories found", []);
        }
        return sendResponse(res, 200, true, "Categories fetched successfully", categories);
    } catch (error) {
        next(error);
    }
};

// Admin categories (All)
export const getAdminCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories(false);
        if (categories.length === 0) {
            return sendResponse(res, 200, true, "No categories found in system", []);
        }
        return sendResponse(res, 200, true, "Admin categories fetched successfully", categories);
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req, res, next) => {
    try {
        const isAdminRequest = req.user && req.user.role === 'admin';
        const category = await categoryService.getCategoryById(req.params.id, !isAdminRequest);
        return sendResponse(res, 200, true, "Category fetched successfully", category);
    } catch (error) {
        next(error);
    }
};

export const getByParentId = async (req, res, next) => {
    try {
        const isAdminRequest = req.user && req.user.role === 'admin';
        const parentId = req.params.parentId === 'null' ? null : req.params.parentId;
        const categories = await categoryService.getCategoriesByParentId(parentId, !isAdminRequest);
        if (categories.length === 0) {
            return sendResponse(res, 200, true, "No categories found for this parent", []);
        }
        return sendResponse(res, 200, true, "Categories fetched successfully", categories);
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, errors.array()[0].msg, errors.array());
        }

        const category = await categoryService.updateCategory(req.params.id, req.body, req.file);
        return sendResponse(res, 200, true, "Category updated successfully", category);
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req, res, next) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        return sendResponse(res, 200, true, "Category deleted successfully");
    } catch (error) {
        next(error);
    }
};

export const getCategoryBySlug = async (req, res, next) => {
    try {
        const isAdminRequest = req.user && req.user.role === 'admin';
        const category = await categoryService.getCategoryBySlug(req.params.slug, !isAdminRequest);
        return sendResponse(res, 200, true, "Category fetched successfully", category);
    } catch (error) {
        next(error);
    }
};

export const toggleCategoryStatus = async (req, res, next) => {
    try {
        const category = await categoryService.toggleCategoryStatus(req.params.id);
        return sendResponse(res, 200, true, `Category ${category.is_active ? 'activated' : 'deactivated'} successfully`, category);
    } catch (error) {
        next(error);
    }
};
