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
    const allowedExtensions =
      /\.(jpg|jpeg|png|gif|svg|webp|avif|heic|jfif|pdf|epub|mp3|wav|m4a|ogg|aac)$/i;
    const allowedMimeTypes =
      /^(image\/(jpeg|png|gif|svg\+xml|webp|avif|heic)|application\/pdf|application\/epub\+zip|application\/x-epub\+zip|audio\/(mpeg|wav|mp4|ogg|aac|x-m4a))$/;

    const isExtensionValid = allowedExtensions.test(
      path.extname(file.originalname),
    );
    const isMimeTypeValid = allowedMimeTypes.test(file.mimetype);

    // Support for smart 'book_file' and traditional fields
    if (isExtensionValid || isMimeTypeValid) {
      cb(null, true);
    } else {
      console.log("Rejected File Details:", {
        name: file.originalname,
        mimetype: file.mimetype,
        extension: path.extname(file.originalname),
      });
      req.fileValidationError = "Only images, PDF, EPUB, or Audio files are allowed!";
      return cb(
        new Error("Only images, PDF, EPUB, or Audio files are allowed!"),
        false,
      );
    }
  },
});

export default upload;
