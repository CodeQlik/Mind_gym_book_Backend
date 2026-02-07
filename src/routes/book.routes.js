import express from 'express';
import { createBook, getAllBooks, getBookById, updateBook, deleteBook, getAdminBooks, toggleBookStatus, getBooksByCategory, getBookBySlug } from '../controllers/book.controller.js';
import { bookValidation, updateBookValidation } from '../validations/book.validation.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/admin.middleware.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

// Public routes
router.get('/all', getAllBooks);
router.get('/:slug', getBookBySlug);
router.get('/:id', getBookById);
router.get('/category/:categoryId', getBooksByCategory);

// Admin only routes
router.get('/admin/all', verifyJWT, isAdmin, getAdminBooks);
router.post('/add', verifyJWT, isAdmin, upload.single('thumbnail'), bookValidation, createBook);
router.put('/update/:id', verifyJWT, isAdmin, upload.single('thumbnail'), updateBookValidation, updateBook);
router.delete('/delete/:id', verifyJWT, isAdmin, deleteBook);
router.patch('/toggle-status/:id', verifyJWT, isAdmin, toggleBookStatus);

export default router;
