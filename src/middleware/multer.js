import fs from 'fs';
import multer from 'multer';

const uploadDir = 'temp/';

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Use the validated directory path
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept images or pdf only
        if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|svg|SVG|webp|WEBP|pdf|PDF)$/)) {
            req.fileValidationError = 'Only image or pdf files are allowed!';
            return cb(new Error('Only image or pdf files are allowed!'), false);
        }
        cb(null, true);
    }
});

export default upload;
