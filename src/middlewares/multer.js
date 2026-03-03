import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "temp";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = /\.(jpg|jpeg|png|gif|svg|webp|avif|heic|pdf)$/i;
    const allowedMimeTypes =
      /^(image\/(jpeg|png|gif|svg\+xml|webp|avif|heic)|application\/pdf)$/;

    const isExtensionValid = allowedExtensions.test(
      path.extname(file.originalname),
    );
    const isMimeTypeValid = allowedMimeTypes.test(file.mimetype);

    if (isExtensionValid || isMimeTypeValid) {
      cb(null, true);
    } else {
      req.fileValidationError = "Only images or PDF files are allowed!";
      return cb(new Error("Only images or PDF files are allowed!"), false);
    }
  },
});

export default upload;
