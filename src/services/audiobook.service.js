import { Audiobook, Book } from "../models/index.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

class AudiobookService {
  async createAudiobook(data, files) {
    const { book_id, chapter_number, chapter_title, narrator, language, status } = data;

    // Check if book exists
    const book = await Book.findByPk(book_id);
    if (!book) {
      throw new Error("Book not found");
    }

    // Default status to true if not provided
    const isActive = status === 'false' || status === false ? false : true;

    // Bulk upload logic: if MaxCount > 1 or multiple files are sent
    if (files?.audio_files?.length > 0) {
      return await this.createBulkAudiobooks(data, files.audio_files);
    }

    // Single upload logic (Fallback)
    const audioFile = files?.audio_file?.[0] || files?.audio_files?.[0];
    if (!audioFile) {
      throw new Error("Audio file is required");
    }

    // Check if this chapter already exists for this book
    const existingChapter = await Audiobook.findOne({ 
      where: { book_id, chapter_number: chapter_number || 1 } 
    });
    if (existingChapter) {
      throw new Error(`Chapter ${chapter_number || 1} already exists for this book.`);
    }

    // Handle audio file upload
    const res = await uploadOnCloudinary(audioFile.path, "mindgymbook/audiobooks");
    if (!res) {
      throw new Error("Failed to upload audio file to Cloudinary");
    }

    return await Audiobook.create({
      book_id,
      chapter_number: chapter_number || 1,
      chapter_title: chapter_title || audioFile.originalname.split('.')[0],
      narrator,
      audio_file: { url: res.secure_url, public_id: res.public_id },
      language,
      status: isActive,
    });
  }

  async createBulkAudiobooks(data, audioFiles) {
    const { book_id, narrator, language, status, chapter_numbers, chapter_titles } = data;
    const results = [];

    // Process each file
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      try {
        const res = await uploadOnCloudinary(file.path, "mindgymbook/audiobooks");
        if (res) {
          // Use provided metadata if available (for bulk), otherwise fallback
          const customNum = Array.isArray(chapter_numbers) ? chapter_numbers[i] : chapter_numbers;
          const customTitle = Array.isArray(chapter_titles) ? chapter_titles[i] : null;

          const newAudiobook = await Audiobook.create({
            book_id,
            chapter_number: customNum || (i + 1),
            chapter_title: customTitle || file.originalname.split('.')[0].replace(/_/g, ' ').replace(/-/g, ' '),
            narrator,
            audio_file: { url: res.secure_url, public_id: res.public_id },
            language,
            status: status !== 'false' && status !== false,
          });
          results.push(newAudiobook);
        }
      } catch (err) {
        console.error(`Failed to upload/create chapter for file ${file.originalname}:`, err.message);
      }
    }

    if (results.length === 0) {
      throw new Error("Failed to upload any audio files.");
    }

    return results;
  }

  async getAllAudiobooks(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Audiobook.findAndCountAll({
      include: [{ model: Book, as: "book", attributes: ["id", "title", "author", "cover_image", "thumbnail"] }],
      limit,
      offset,
      order: [
        ["createdAt", "DESC"],
        ["chapter_number", "ASC"]
      ],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      audiobooks: rows,
    };
  }

  async getAudiobookById(id) {
    const audiobook = await Audiobook.findByPk(id, {
      include: [{ model: Book, as: "book" }],
    });
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    return audiobook;
  }

  async getAudiobookByBookId(bookId) {
    return await Audiobook.findAll({
      where: { book_id: bookId },
      include: [{ model: Book, as: "book" }],
      order: [["chapter_number", "ASC"]],
    });
  }

  async updateAudiobook(id, data, files) {
    const audiobook = await Audiobook.findByPk(id);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }

    // Handle new audio file if provided
    if (files?.audio_file?.[0]) {
      // Delete old file
      if (audiobook.audio_file?.public_id) {
        await deleteFromCloudinary(audiobook.audio_file.public_id);
      }
      
      const res = await uploadOnCloudinary(files.audio_file[0].path, "mindgymbook/audiobooks");
      if (res) {
        data.audio_file = { url: res.secure_url, public_id: res.public_id };
      }
    }

    return await audiobook.update(data);
  }

  async deleteAudiobook(id) {
    const audiobook = await Audiobook.findByPk(id);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }

    // Delete file from Cloudinary
    if (audiobook.audio_file?.public_id) {
      await deleteFromCloudinary(audiobook.audio_file.public_id);
    }

    await audiobook.destroy();
    return { message: "Audiobook deleted successfully" };
  }

  async toggleAudiobookStatus(id) {
    const audiobook = await Audiobook.findByPk(id);
    if (!audiobook) throw new Error("Audiobook not found");
    audiobook.status = !audiobook.status;
    await audiobook.save();
    return audiobook;
  }
}

export default new AudiobookService();
