import { UserNote } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const saveNote = async (req, res, next) => {
  try {
    const { title, content, chapter_name, chapterName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: User not found");
    }

    if (!content) {
      return sendResponse(res, 400, false, "Content is required");
    }

    const note = await UserNote.create({
      userId: userId,
      title: title || null,
      content: content,
      chapterName: chapter_name || chapterName || null,
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

    const content = await UserNote.findAll({
      where: { userId: userId },
      order: [
        ["chapterName", "ASC"],
        ["updatedAt", "DESC"],
      ],
    });

    return sendResponse(res, 200, true, "Notes fetched successfully", content);
  } catch (error) {
    next(error);
  }
};

// Update a Specific Note
export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, chapter_name, chapterName } = req.body;
    const userId = req.user?.id;

    const note = await UserNote.findOne({
      where: { id, userId: userId },
    });

    if (!note) {
      return sendResponse(res, 404, false, "Note not found or unauthorized");
    }

    await note.update({
      title: title || note.title,
      content: content || note.content,
      chapterName: chapter_name || chapterName || note.chapterName,
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
