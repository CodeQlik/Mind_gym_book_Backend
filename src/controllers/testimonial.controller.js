import { Testimonial } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendResponse from "../utils/responseHandler.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

const getAllTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.findAll({
    order: [["created_at", "DESC"]],
  });

  return sendResponse(
    res,
    200,
    true,
    "Testimonials fetched successfully",
    testimonials,
  );
});

const createTestimonial = asyncHandler(async (req, res) => {
  const { name, designation, content, rating, is_active } = req.body;

  if (!name || !content) {
    return sendResponse(res, 400, false, "Name and content are required");
  }

  let imageUrl = null;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(
      req.file.path,
      "mindgymbook/testimonials",
    );
    if (uploadResult) {
      imageUrl = uploadResult.secure_url;
    }
  }

  const testimonial = await Testimonial.create({
    name,
    designation,
    content,
    rating: rating || 5,
    is_active: is_active === "true" || is_active === true,
    image: imageUrl,
  });

  return sendResponse(
    res,
    201,
    true,
    "Testimonial created successfully",
    testimonial,
  );
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, designation, content, rating, is_active } = req.body;

  const testimonial = await Testimonial.findByPk(id);
  if (!testimonial) {
    return sendResponse(res, 404, false, "Testimonial not found");
  }

  let imageUrl = testimonial.image;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(
      req.file.path,
      "mindgymbook/testimonials",
    );
    if (uploadResult) {
      imageUrl = uploadResult.secure_url;
    }
  }

  await testimonial.update({
    name: name || testimonial.name,
    designation:
      designation !== undefined ? designation : testimonial.designation,
    content: content || testimonial.content,
    rating: rating || testimonial.rating,
    is_active:
      is_active !== undefined
        ? is_active === "true" || is_active === true
        : testimonial.is_active,
    image: imageUrl,
  });

  return sendResponse(
    res,
    200,
    true,
    "Testimonial updated successfully",
    testimonial,
  );
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testimonial = await Testimonial.findByPk(id);

  if (!testimonial) {
    return sendResponse(res, 404, false, "Testimonial not found");
  }

  await testimonial.destroy();

  return sendResponse(res, 200, true, "Testimonial deleted successfully");
});

export {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
