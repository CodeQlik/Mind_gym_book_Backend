import { UserAnnotation, Book } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

// Add or update annotation (highlight/note/bookmark)
export const upsertAnnotation = async (req, res, next) => {
  try {
    const { book_id, highlight_text, notes, page_number, color } = req.body;
    const user_id = req.user.id;

    const [annotation, created] = await UserAnnotation.findOrCreate({
      where: { user_id, book_id, page_number },
      defaults: { highlight_text, notes, color },
    });

    if (!created) {
      await annotation.update({ highlight_text, notes, color });
    }

    return sendResponse(res, 200, true, "Annotation saved", annotation);
  } catch (error) {
    next(error);
  }
};

// Get all annotations for a specific book by current user
export const getMyAnnotations = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const user_id = req.user.id;

    const annotations = await UserAnnotation.findAll({
      where: { user_id, book_id: bookId },
      order: [
        ["page_number", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    return sendResponse(res, 200, true, "Annotations fetched", annotations);
  } catch (error) {
    next(error);
  }
};

// Delete an annotation
export const deleteAnnotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const annotation = await UserAnnotation.findOne({ where: { id, user_id } });
    if (!annotation) throw new Error("Annotation not found");

    await annotation.destroy();
    return sendResponse(res, 200, true, "Annotation deleted");
  } catch (error) {
    next(error);
  }
};
