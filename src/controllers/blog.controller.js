import { Blog, Category } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendResponse from "../utils/responseHandler.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import slugify from "slugify";

const getAllBlogs = asyncHandler(async (req, res) => {
  const blogs = await Blog.findAll({
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return sendResponse(res, 200, true, "Blogs fetched successfully", blogs);
});

const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({
    where: { slug },
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
      },
    ],
  });

  if (!blog) {
    return sendResponse(res, 404, false, "Blog not found");
  }

  return sendResponse(res, 200, true, "Blog fetched successfully", blog);
});

const createBlog = asyncHandler(async (req, res) => {
  const {
    title,
    excerpt,
    content,
    is_published,
    author,
    category_id,
    meta_title,
    meta_description,
    meta_keywords,
  } = req.body;

  if (!title || !content) {
    return sendResponse(res, 400, false, "Title and content are required");
  }

  let slug = slugify(title, { lower: true });

  // Check if slug exists
  const existingBlog = await Blog.findOne({ where: { slug } });
  if (existingBlog) {
    slug = `${slug}-${Date.now()}`;
  }

  let imageUrl = null;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(
      req.file.path,
      "mindgymbook/blogs",
    );
    if (uploadResult) {
      imageUrl = uploadResult.secure_url;
    }
  }

  const blog = await Blog.create({
    title,
    slug,
    excerpt,
    content,
    is_published: is_published === "true" || is_published === true,
    author: author || "Admin",
    category_id: category_id || null,
    image: imageUrl,
    meta_title,
    meta_description,
    meta_keywords,
  });

  return sendResponse(res, 201, true, "Blog created successfully", blog);
});

const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    excerpt,
    content,
    is_published,
    author,
    category_id,
    meta_title,
    meta_description,
    meta_keywords,
  } = req.body;

  const blog = await Blog.findByPk(id);
  if (!blog) {
    return sendResponse(res, 404, false, "Blog not found");
  }

  let imageUrl = blog.image;
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(
      req.file.path,
      "mindgymbook/blogs",
    );
    if (uploadResult) {
      imageUrl = uploadResult.secure_url;
    }
  }

  let slug = blog.slug;
  if (title && title !== blog.title) {
    slug = slugify(title, { lower: true });
    const existingBlog = await Blog.findOne({ where: { slug } });
    if (existingBlog && existingBlog.id !== parseInt(id)) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  await blog.update({
    title: title || blog.title,
    slug,
    excerpt: excerpt !== undefined ? excerpt : blog.excerpt,
    content: content || blog.content,
    is_published:
      is_published !== undefined
        ? is_published === "true" || is_published === true
        : blog.is_published,
    author: author || blog.author,
    category_id: category_id !== undefined ? category_id : blog.category_id,
    image: imageUrl,
    meta_title: meta_title !== undefined ? meta_title : blog.meta_title,
    meta_description:
      meta_description !== undefined ? meta_description : blog.meta_description,
    meta_keywords:
      meta_keywords !== undefined ? meta_keywords : blog.meta_keywords,
  });

  return sendResponse(res, 200, true, "Blog updated successfully", blog);
});

const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findByPk(id);

  if (!blog) {
    return sendResponse(res, 404, false, "Blog not found");
  }

  await blog.destroy();

  return sendResponse(res, 200, true, "Blog deleted successfully");
});

export { getAllBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog };
