import addressService from '../services/address.service.js';
import sendResponse from '../utils/responseHandler.js';
import { validationResult } from 'express-validator';

export const addAddress = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, errors.array()[0].msg, errors.array());
        }

        const userId = req.user.id;
        const address = await addressService.addAddress(userId, req.body);

        return sendResponse(res, 201, true, "Address added successfully", address);
    } catch (error) {
        next(error);
    }
};

export const getMyAddresses = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const addresses = await addressService.getUserAddresses(userId);
        return sendResponse(res, 200, true, "Addresses fetched successfully", addresses);
    } catch (error) {
        next(error);
    }
};

export const getAddressById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const address = await addressService.getAddressById(id);
        if (!address) {
            return sendResponse(res, 404, false, "Address not found");
        }
        return sendResponse(res, 200, true, "Address fetched successfully", address);
    } catch (error) {
        next(error);
    }
};

export const updateAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const address = await addressService.updateAddress(id, req.body);
        return sendResponse(res, 200, true, "Address updated successfully", address);
    } catch (error) {
        next(error);
    }
};

export const deleteAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await addressService.deleteAddress(userId, id);
        return sendResponse(res, 200, true, "Address deleted successfully");
    } catch (error) {
        next(error);
    }
};







