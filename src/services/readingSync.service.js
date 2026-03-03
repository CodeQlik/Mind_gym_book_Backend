import { ReadingProgress, Highlight, Book } from "../models/index.js";

class ReadingSyncService {
  // --- Reading Progress ---

  async syncProgress(userId, bookId, progressData) {
    const last_page = progressData.last_page || progressData.current_page;
    const total_pages = progressData.total_pages;
    let percentage =
      progressData.percentage !== undefined
        ? progressData.percentage
        : progressData.percentage_complete;

    if (
      percentage === undefined &&
      total_pages &&
      total_pages > 0 &&
      last_page
    ) {
      percentage = (last_page / total_pages) * 100;
      if (percentage > 100) percentage = 100;
    }

    const [progress, created] = await ReadingProgress.findOrCreate({
      where: { user_id: userId, book_id: bookId },
      defaults: {
        last_page: last_page || 1,
        total_pages,
        percentage_complete: percentage || 0,
        last_read_at: new Date(),
      },
    });

    if (!created) {
      await progress.update({
        last_page: last_page || progress.last_page,
        total_pages: total_pages || progress.total_pages,
        percentage_complete:
          percentage !== undefined ? percentage : progress.percentage_complete,
        last_read_at: new Date(),
      });
    }

    return progress;
  }

  async getProgress(userId, bookId) {
    return await ReadingProgress.findOne({
      where: { user_id: userId, book_id: bookId },
    });
  }

  async getAllProgressForUser(userId) {
    return await ReadingProgress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: ["title", "author", "thumbnail"],
        },
      ],
      order: [["last_read_at", "DESC"]],
    });
  }

  // --- Highlights ---

  async addHighlight(userId, bookId, highlightData) {
    const {
      text,
      color,
      page,
      page_number,
      rect_x,
      rect_y,
      rect_width,
      rect_height,
    } = highlightData;

    return await Highlight.create({
      user_id: userId,
      book_id: bookId,
      text,
      color,
      page_number: page_number || page,
      rect_x,
      rect_y,
      rect_width,
      rect_height,
    });
  }

  async getHighlights(userId, bookId) {
    return await Highlight.findAll({
      where: { user_id: userId, book_id: bookId },
      order: [
        ["page_number", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
  }

  async deleteHighlight(userId, highlightId) {
    const highlight = await Highlight.findOne({
      where: { id: highlightId, user_id: userId },
    });
    if (!highlight) throw new Error("Highlight not found");
    await highlight.destroy();
    return true;
  }

  async updateHighlight(userId, highlightId, updateData) {
    const highlight = await Highlight.findOne({
      where: { id: highlightId, user_id: userId },
    });
    if (!highlight) throw new Error("Highlight not found");

    const {
      text,
      color,
      page,
      page_number,
      rect_x,
      rect_y,
      rect_width,
      rect_height,
    } = updateData;

    const finalUpdate = {
      text: text !== undefined ? text : highlight.text,
      color: color !== undefined ? color : highlight.color,
      page_number:
        page_number !== undefined
          ? page_number
          : page !== undefined
            ? page
            : highlight.page_number,
      rect_x: rect_x !== undefined ? rect_x : highlight.rect_x,
      rect_y: rect_y !== undefined ? rect_y : highlight.rect_y,
      rect_width: rect_width !== undefined ? rect_width : highlight.rect_width,
      rect_height:
        rect_height !== undefined ? rect_height : highlight.rect_height,
    };

    return await highlight.update(finalUpdate);
  }
}

export default new ReadingSyncService();
