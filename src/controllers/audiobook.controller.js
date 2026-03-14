import audiobookService from "../services/audiobook.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendResponse from "../utils/responseHandler.js";

const createAudiobook = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.createAudiobook(req.body, req.files);
  return sendResponse(res, 201, true, "Audiobook created successfully", audiobook);
});

const getAllAudiobooks = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await audiobookService.getAllAudiobooks(parseInt(page), parseInt(limit));
  return sendResponse(res, 200, true, "Audiobooks fetched successfully", data);
});

const getAudiobookById = asyncHandler(async (req, res) => {
  const audiobook = await audiobookService.getAudiobookById(req.params.id);
  return sendResponse(res, 200, true, "Audiobook fetched successfully", audiobook);
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

export default {
  createAudiobook,
  getAllAudiobooks,
  getAudiobookById,
  updateAudiobook,
  deleteAudiobook,
  toggleAudiobookStatus,
};
