import audiobookService from "../services/audiobook.service.js";
import bookService from "../services/book.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendResponse from "../utils/responseHandler.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const createAudiobook = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.createAudiobook(req.body, req.files);
  return sendResponse(res, 201, true, "Audiobook created successfully", audiobook);
});

const getCleanBaseUrl = () => {
  return (process.env.BASE_URL)
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");
};

const getAllAudiobooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const data = await audiobookService.getAllAudiobooks(page, limit);

  const isAdmin = req.user && req.user.user_type === "admin";
  const baseUrl = getCleanBaseUrl();

  if (data.audiobooks) {
    const bookMap = new Map();

    data.audiobooks.forEach((audio) => {
      const audioData = audio.toJSON ? audio.toJSON() : audio;
      const bookId = audioData.book_id;
      const bookInfo = audioData.book || {};
      const catName = bookInfo.category?.name || "Unknown";

      if (!bookMap.has(bookId)) {
        bookMap.set(bookId, {
          id: bookInfo.id,
          title: bookInfo.title,
          author: bookInfo.author,
          categoryName: catName,
          thumbnail: (bookInfo.thumbnail === 0 || bookInfo.thumbnail === "0") ? null : bookInfo.thumbnail,
          cover_image: (bookInfo.cover_image === 0 || bookInfo.cover_image === "0") ? null : bookInfo.cover_image,
          chapters: []
        });
      }

      const chapter = {
        id: audioData.id,
        chapter_number: audioData.chapter_number,
        title: audioData.chapter_title,
        audio_url: `${baseUrl}/api/v1/audiobook/stream/${audioData.id}`,
        status: audioData.status,
        narrator: audioData.narrator,
        language: audioData.language,
        updatedAt: audioData.updatedAt || audioData.updated_at,
        createdAt: audioData.createdAt || audioData.created_at
      };

      if (isAdmin) {
        chapter.audio_file = {
          ...audioData.audio_file,
          url: audioData.audio_file?.url,
          is_encrypted: false
        };
      }

      bookMap.get(bookId).chapters.push(chapter);
    });

    // Group the books into their categories
    const categoryGroups = {};
    bookMap.forEach((bookData) => {
      const { categoryName, ...bookWithoutCat } = bookData;
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = [];
      }
      categoryGroups[categoryName].push(bookWithoutCat);
    });

    data.audiobooks = categoryGroups;
  }

  return sendResponse(res, 200, true, "Audiobooks fetched successfully", data);
});

const getAudiobookById = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.getAudiobookById(req.params.id);
  const audioData = audiobook.toJSON ? audiobook.toJSON() : audiobook;

  const isAdmin = req.user && req.user.user_type === "admin";
  const baseUrl = getCleanBaseUrl();
  const { book, audio_file, ...rest } = audioData;

  const structuredData = {
    book: book,
    audio_url: `${baseUrl}/api/v1/audiobook/stream/${audioData.id}`,
    audio_file: {
      ...audio_file,
      url: audio_file?.url,
      is_encrypted: false
    },
    ...rest
  };

  return sendResponse(res, 200, true, "Audiobook fetched successfully", structuredData);
});

const streamAudiobook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const audiobook = await audiobookService.getAudiobookById(id);
  
  if (!audiobook || !audiobook.audio_file?.url) {
    return res.status(404).json({ message: "Audio file not found" });
  }

  const book = await bookService.getBookById(audiobook.book_id);
  const user = req.user;
  const fullAccess = await bookService.hasFullAccess(user, book);

  res.setHeader("Content-Type", "audio/mpeg");
  
  let stream = ffmpeg(audiobook.audio_file.url)
    .format("mp3")
    .on("error", (err) => {
      console.error("FFMPEG Stream Error:", err);
    });

  if (!fullAccess) {
    // Non-subscribed users get only 30 seconds
    console.log("Streaming 30s preview for audiobook:", id);
    stream = stream.duration(30);
    res.setHeader("X-Is-Preview", "true");
  } else {
    console.log("Streaming full audio for audiobook:", id);
    res.setHeader("X-Is-Preview", "false");
  }

  stream.pipe(res, { end: true });
});

const updateAudiobook = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.updateAudiobook(req.params.id, req.body, req.files);
  return sendResponse(res, 200, true, "Audiobook updated successfully", audiobook);
});

const deleteAudiobook = asyncHandler(async (req, res) => {
  await audiobookService.deleteAudiobook(req.params.id);
  return sendResponse(res, 200, true, "Audiobook deleted successfully");
});

const toggleAudiobookStatus = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.toggleAudiobookStatus(req.params.id);
  return sendResponse(res, 200, true, "Status updated successfully", audiobook);
});

const toggleBookAudiobooksStatus = asyncHandler(async (req, res) => {
  const result = await audiobookService.toggleBookAudiobooksStatus(req.params.bookId);
  return sendResponse(res, 200, true, "Book audiobooks status updated successfully", result);
});

export default {
  createAudiobook,
  getAllAudiobooks,
  getAudiobookById,
  updateAudiobook,
  deleteAudiobook,
  toggleAudiobookStatus,
  toggleBookAudiobooksStatus,
  streamAudiobook,
};
