import { ReadingProgress, Highlight, Book } from "../models/index.js";

class ReadingSyncService {
  // --- Reading Progress ---

  async syncProgress(userId, bookId, progressData) {
    const { last_page, total_pages } = progressData;

    let percentage = 0;
    if (total_pages && total_pages > 0) {
      percentage = (last_page / total_pages) * 100;
      if (percentage > 100) percentage = 100;
    }

    const [progress, created] = await ReadingProgress.findOrCreate({
      where: { user_id: userId, book_id: bookId },
      defaults: {
        last_page,
        total_pages,
        percentage_complete: percentage,
        last_read_at: new Date(),
      },
    });

    if (!created) {
      await progress.update({
        last_page,
        total_pages: total_pages || progress.total_pages,
        percentage_complete: percentage || progress.percentage_complete,
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
    return await Highlight.create({
      user_id: userId,
      book_id: bookId,
      ...highlightData,
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
    return await highlight.update(updateData);
  }
}

export default new ReadingSyncService();
