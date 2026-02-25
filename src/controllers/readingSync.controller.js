import readingSyncService from "../services/readingSync.service.js";
import sendResponse from "../utils/responseHandler.js";

export const syncProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const progress = await readingSyncService.syncProgress(
      req.user.id,
      bookId,
      req.body,
    );
    return sendResponse(res, 201, true, "Reading progress synced", progress);
  } catch (error) {
    next(error);
  }
};

export const getProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const progress = await readingSyncService.getProgress(req.user.id, bookId);
    return sendResponse(res, 200, true, "Reading progress fetched", progress);
  } catch (error) {
    next(error);
  }
};

export const getMyLibrary = async (req, res, next) => {
  try {
    const library = await readingSyncService.getAllProgressForUser(req.user.id);
    return sendResponse(
      res,
      200,
      true,
      "User library (reading history) fetched",
      library,
    );
  } catch (error) {
    next(error);
  }
};

export const addHighlight = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const highlight = await readingSyncService.addHighlight(
      req.user.id,
      bookId,
      req.body,
    );
    return sendResponse(res, 201, true, "Highlight saved", highlight);
  } catch (error) {
    next(error);
  }
};

export const getHighlights = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const highlights = await readingSyncService.getHighlights(
      req.user.id,
      bookId,
    );
    return sendResponse(res, 200, true, "Highlights fetched", highlights);
  } catch (error) {
    next(error);
  }
};

export const deleteHighlight = async (req, res, next) => {
  try {
    await readingSyncService.deleteHighlight(req.user.id, req.params.id);
    return sendResponse(res, 200, true, "Highlight deleted");
  } catch (error) {
    next(error);
  }
};
