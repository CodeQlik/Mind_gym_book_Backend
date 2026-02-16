import { UserAnnotation } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

// Save Annotation (Create or Update if existing for same user/book/page)
export const saveAnnotation = async (req, res, next) => {
  try {
    const { bookId, highlightText, notes, pageNumber, color } = req.body;
    const userId = req.user.id;

    // We can use upsert logic or simple create. User requested "saveAnnotation"
    // Usually, multiple highlights can exist on the same page, so we use create.
    const annotation = await UserAnnotation.create({
      user_id: userId,
      book_id: bookId,
      highlight_text: highlightText,
      notes: notes,
      page_number: pageNumber,
      color: color || "#FFFF00",
    });

    return sendResponse(
      res,
      201,
      true,
      "Annotation saved successfully",
      annotation,
    );
  } catch (error) {
    next(error);
  }
};

// Get All Annotations for a Specific Book
export const getBookAnnotations = async (req, res, next) => {
  try {
    const { id: bookId } = req.params;
    const userId = req.user.id;

    const annotations = await UserAnnotation.findAll({
      where: { user_id: userId, book_id: bookId },
      order: [
        ["page_number", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    return sendResponse(
      res,
      200,
      true,
      "Annotations fetched successfully",
      annotations,
    );
  } catch (error) {
    next(error);
  }
};

// Update a Specific Annotation
export const updateAnnotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { highlightText, notes, color } = req.body;
    const userId = req.user.id;

    const annotation = await UserAnnotation.findOne({
      where: { id, user_id: userId },
    });

    if (!annotation) {
      return sendResponse(res, 404, false, "Annotation not found");
    }

    await annotation.update({
      highlight_text: highlightText,
      notes: notes,
      color: color,
    });

    return sendResponse(
      res,
      200,
      true,
      "Annotation updated successfully",
      annotation,
    );
  } catch (error) {
    next(error);
  }
};

// Delete an Annotation
export const deleteAnnotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const annotation = await UserAnnotation.findOne({
      where: { id, user_id: userId },
    });

    if (!annotation) {
      return sendResponse(res, 404, false, "Annotation not found");
    }

    await annotation.destroy();
    return sendResponse(res, 200, true, "Annotation deleted successfully");
  } catch (error) {
    next(error);
  }
};
