import { UserAnnotation } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const saveNote = async (req, res, next) => {
  try {
    // Naye fields destructure karein
    const { title, notes, chapter_name, book_name } = req.body;

    const note = await UserAnnotation.create({
      title: title,
      notes: notes,
      chapter_name: chapter_name,
      book_name: book_name,
    });

    return sendResponse(res, 201, true, "Note saved successfully", note);
  } catch (error) {
    next(error);
  }
};

// Get All Notes for User
export const getUserNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notes = await UserAnnotation.findAll({
      where: { user_id: userId },
      order: [
        ["book_name", "ASC"],
        ["chapter_name", "ASC"],
        ["updated_at", "DESC"],
      ],
    });

    return sendResponse(res, 200, true, "Notes fetched successfully", notes);
  } catch (error) {
    next(error);
  }
};

// Update a Specific Note
export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, notes, chapter_name, book_name } = req.body;
    const userId = req.user.id;

    const note = await UserAnnotation.findOne({
      where: { id, user_id: userId },
    });

    if (!note) {
      return sendResponse(res, 404, false, "Note not found");
    }

    // Update logic mein naye fields include karein
    await note.update({
      title: title || note.title,
      notes: notes || note.notes,
      chapter_name: chapter_name || note.chapter_name,
      book_name: book_name || note.book_name,
    });

    return sendResponse(res, 200, true, "Note updated successfully", note);
  } catch (error) {
    next(error);
  }
};

// Delete a Note
export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const note = await UserAnnotation.findOne({
      where: { id, user_id: userId },
    });

    if (!note) {
      return sendResponse(res, 404, false, "Note not found");
    }

    await note.destroy();
    return sendResponse(res, 200, true, "Note deleted successfully");
  } catch (error) {
    next(error);
  }
};
