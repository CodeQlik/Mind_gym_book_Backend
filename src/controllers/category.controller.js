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

export const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories();
        return sendResponse(res, 200, true, "Categories fetched successfully", categories);
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        return sendResponse(res, 200, true, "Category fetched successfully", category);
    } catch (error) {
        next(error);
    }
};

export const getByParentId = async (req, res, next) => {
    try {
        const parentId = req.params.parentId === 'null' ? null : req.params.parentId;
        const categories = await categoryService.getCategoriesByParentId(parentId);
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

export const toggleCategoryStatus = async (req, res, next) => {
    try {
        const category = await categoryService.toggleCategoryStatus(req.params.id);
        return sendResponse(res, 200, true, `Category ${category.is_active ? 'activated' : 'deactivated'} successfully`, category);
    } catch (error) {
        next(error);
    }
};
