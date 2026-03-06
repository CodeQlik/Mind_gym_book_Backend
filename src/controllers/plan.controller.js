import planService from "../services/plan.service.js";
import sendResponse from "../utils/responseHandler.js";

export const createPlan = async (req, res, next) => {
  try {
    const plan = await planService.createPlan(req.body);
    return sendResponse(res, 201, true, "Plan created successfully", plan);
  } catch (error) {
    next(error);
  }
};

export const getAllPlans = async (req, res, next) => {
  try {
    const plans = await planService.getAllPlans();
    return sendResponse(res, 200, true, "Plans fetched successfully", plans);
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await planService.getPlanById(id);
    if (!plan) {
      return sendResponse(res, 404, false, "Plan not found");
    }
    return sendResponse(res, 200, true, "Plan fetched successfully", plan);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await planService.updatePlan(id, req.body);
    return sendResponse(res, 200, true, "Plan updated successfully", plan);
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    await planService.deletePlan(id);
    return sendResponse(res, 200, true, "Plan deleted successfully");
  } catch (error) {
    next(error);
  }
};
