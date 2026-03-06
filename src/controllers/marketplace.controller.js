import marketplaceService from "../services/marketplace.service.js";
import sendResponse from "../utils/responseHandler.js";

export const registerSeller = async (req, res, next) => {
  try {
    const seller = await marketplaceService.registerAsSeller(
      req.user.id,
      req.body,
    );
    return sendResponse(
      res,
      201,
      true,
      "Seller registration request submitted",
      seller,
    );
  } catch (error) {
    next(error);
  }
};

export const getSellerProfile = async (req, res, next) => {
  try {
    const seller = await marketplaceService.getSellerProfile(req.user.id);
    return sendResponse(res, 200, true, "Seller profile fetched", seller);
  } catch (error) {
    next(error);
  }
};

export const createListing = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    // Assuming file upload handled elsewhere or req.body.images exists
    const listing = await marketplaceService.createListing(
      sellerId,
      req.body,
      req.body.images || [],
    );
    return sendResponse(
      res,
      201,
      true,
      "Listing created and pending approval",
      listing,
    );
  } catch (error) {
    next(error);
  }
};

export const getActiveListings = async (req, res, next) => {
  try {
    const listings = await marketplaceService.getListings("active");
    return sendResponse(
      res,
      200,
      true,
      "Marketplace listings fetched",
      listings,
    );
  } catch (error) {
    next(error);
  }
};

// Admin Controllers
export const getPendingSellers = async (req, res, next) => {
  try {
    const sellers = await marketplaceService.getAllSellers("pending");
    return sendResponse(res, 200, true, "Pending sellers fetched", sellers);
  } catch (error) {
    next(error);
  }
};

export const approveSeller = async (req, res, next) => {
  try {
    const seller = await marketplaceService.updateSellerStatus(
      req.params.id,
      "approved",
    );
    return sendResponse(res, 200, true, "Seller approved", seller);
  } catch (error) {
    next(error);
  }
};

export const approveListing = async (req, res, next) => {
  try {
    const listing = await marketplaceService.updateListingStatus(
      req.params.id,
      "active",
    );
    return sendResponse(res, 200, true, "Listing approved and live", listing);
  } catch (error) {
    next(error);
  }
};

export const releaseEscrow = async (req, res, next) => {
  try {
    const result = await marketplaceService.releaseEscrow(req.params.orderId);
    return sendResponse(res, 200, true, "Escrow released to seller", result);
  } catch (error) {
    next(error);
  }
};
