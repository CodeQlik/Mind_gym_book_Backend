import { UserNote } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const saveNote = async (req, res, next) => {
  try {
    const { title, notes, chapter_name, book_name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: User not found");
    }

    const note = await UserNote.create({
      userId: userId, // 👈 NOT user_id
      title,
      notes,
      chapterName: chapter_name,
      bookName: book_name,
    });

    return sendResponse(res, 201, true, "Note saved successfully", note);
  } catch (error) {
    next(error);
  }
};

// Get All Notes for User
export const getUserNotes = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: User not found");
    }

    const notes = await UserNote.findAll({
      where: { userId: userId },
      order: [
        ["bookName", "ASC"], // Use model attribute name here
        ["chapterName", "ASC"],
        ["updatedAt", "DESC"],
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
    const userId = req.user?.id;

    const note = await UserNote.findOne({
      where: { id, userId: userId },
    });

    if (!note) {
      return sendResponse(res, 404, false, "Note not found or unauthorized");
    }

    await note.update({
      title: title || note.title,
      notes: notes || note.notes,
      chapterName: chapter_name || note.chapterName,
      bookName: book_name || note.bookName,
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
    const userId = req.user?.id;

    const note = await UserNote.findOne({
      where: { id, userId: userId },
    });

    if (!note) {
      return sendResponse(res, 404, false, "Note not found or unauthorized");
    }

    await note.destroy();
    return sendResponse(res, 200, true, "Note deleted successfully");
  } catch (error) {
    next(error);
  }
};
