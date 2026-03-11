import axios from "axios";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import os from "os";
import { cloudinary } from "../config/cloudinary.js";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfService {
  // ─── Helper: Get signed Cloudinary URL ─────────────────────────────────────
  getSignedCloudinaryUrl(publicId) {
    return cloudinary.url(publicId, {
      resource_type: "raw",
      sign_url: true,
      secure: true,
    });
  }

  // ─── Helper: Download file buffer from URL ──────────────────────────────────
  async downloadBuffer(url) {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });
    return Buffer.from(response.data);
  }

  // ─── PDF: Get buffer (local first, then Cloudinary signed URL) ──────────────
  async getPdfBuffer(pdfUrl, bookData = null) {
    try {
      let pdfBuffer;

      const localPath = bookData?.file_data?.local_path;
      if (localPath) {
        const fullPath = path.resolve(localPath);
        if (fs.existsSync(fullPath)) {
          pdfBuffer = fs.readFileSync(fullPath);
          console.log("PDF loaded from local storage");
          return pdfBuffer;
        }
      }

      let finalUrl = pdfUrl;
      const publicId = bookData?.file_data?.public_id;
      if (pdfUrl.includes("cloudinary.com") && publicId) {
        try {
          finalUrl = this.getSignedCloudinaryUrl(publicId);
          console.log("Generated signed URL for Cloudinary PDF");
        } catch (e) {
          console.warn("Could not sign URL, using original:", e.message);
        }
      }

      console.log(`Downloading PDF from: ${finalUrl}`);
      pdfBuffer = await this.downloadBuffer(finalUrl);
      console.log("PDF downloaded successfully");
      return pdfBuffer;
    } catch (error) {
      console.error("PDF Download Buffer Error:", error.message);
      throw error;
    }
  }

  // ─── EPUB: Download to temp file, parse chapters ────────────────────────────
  async getEpubChapters(epubUrl, bookData = null) {
    // 1. Get file — try local first
    let epubBuffer;
    const localPath = bookData?.file_data?.local_path;
    if (localPath) {
      const fullPath = path.resolve(localPath);
      if (fs.existsSync(fullPath)) {
        epubBuffer = fs.readFileSync(fullPath);
        console.log("EPUB loaded from local storage");
      }
    }

    if (!epubBuffer) {
      let finalUrl = epubUrl;
      const publicId = bookData?.file_data?.public_id;
      if (epubUrl.includes("cloudinary.com") && publicId) {
        try {
          finalUrl = this.getSignedCloudinaryUrl(publicId);
          console.log("Generated signed URL for Cloudinary EPUB");
        } catch (e) {
          console.warn("Could not sign EPUB URL:", e.message);
        }
      }
      console.log(`Downloading EPUB from: ${finalUrl}`);
      epubBuffer = await this.downloadBuffer(finalUrl);
    }

    // 2. Write to temp file (epub2 requires a file path)
    const tmpPath = path.join(os.tmpdir(), `book_${Date.now()}.epub`);
    fs.writeFileSync(tmpPath, epubBuffer);

    // 3. Dynamic import of epub2 (ES module — named export EPub)
    const { EPub } = await import("epub2");

    // 4. Parse EPUB
    const epub = new EPub(tmpPath);
    await new Promise((resolve, reject) => {
      epub.on("end", resolve);
      epub.on("error", reject);
      epub.parse();
    });

    // 5. Extract text from each chapter
    const chapters = epub.flow; // array of chapters in reading order
    const chapterTexts = [];

    for (const chapter of chapters) {
      try {
        const html = await new Promise((resolve, reject) => {
          epub.getChapter(chapter.id, (err, text) => {
            if (err) reject(err);
            else resolve(text);
          });
        });
        // Strip HTML tags to get plain text
        const text = html
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 10) chapterTexts.push(text);
      } catch (e) {
        console.warn(`Chapter ${chapter.id} read error:`, e.message);
      }
    }

    // Cleanup temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch (e) {}

    // 6. Smart page splitting:
    // Always split into ~2000 char pages so frontend can paginate naturally (like PDF pages)
    // and access control (5 pages) is consistent.
    const PAGE_SIZE = 2000;
    const pages = [];

    for (const chapterText of chapterTexts) {
      let remaining = chapterText;
      while (remaining.length > 0) {
        if (remaining.length <= PAGE_SIZE) {
          pages.push(remaining.trim());
          break;
        }
        // Try to cut at end of sentence
        let cutAt = remaining.lastIndexOf(". ", PAGE_SIZE);
        if (cutAt < PAGE_SIZE / 2) cutAt = PAGE_SIZE;
        pages.push(remaining.slice(0, cutAt + 1).trim());
        remaining = remaining.slice(cutAt + 1).trim();
      }
    }

    console.log(`[EPUB] Total pages generated: ${pages.length}`);
    return pages;
  }

  // ─── PDF: Extract all text ──────────────────────────────────────────────────
  async extractTextFromPdfUrl(
    pdfUrl,
    bookId,
    bookData = null,
    maxPages = null,
  ) {
    try {
      console.log(`Starting text extraction for Book ID: ${bookId}`);
      let pdfBuffer = await this.getPdfBuffer(pdfUrl, bookData);

      if (maxPages) {
        const srcDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = srcDoc.getPageCount();
        const pagesToExtract = Math.min(maxPages, totalPages);
        for (let i = totalPages - 1; i >= pagesToExtract; i--) {
          srcDoc.removePage(i);
        }
        pdfBuffer = await srcDoc.save({ useObjectStreams: false });
        console.log(`PDF sliced to first ${pagesToExtract} pages for preview`);
      }

      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      let result = await parser.getText();
      let extractedText = typeof result === "string" ? result : result.text;

      if (parser.destroy && typeof parser.destroy === "function") {
        await parser.destroy();
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("PDF se text extract nahi ho paya.");
      }

      extractedText = extractedText.replace(/\s+/g, " ").trim();
      console.log(`Text extracted: ${extractedText.length} characters`);
      return extractedText;
    } catch (error) {
      console.error("Text Extraction Service Error:", error.message);
      throw error;
    }
  }

  // ─── EPUB: Extract all text (all chapters combined) ─────────────────────────
  async extractTextFromEpubUrl(
    epubUrl,
    bookId,
    bookData = null,
    maxPages = null,
  ) {
    try {
      console.log(`[EPUB] Starting text extraction for Book ID: ${bookId}`);
      const chapters = await this.getEpubChapters(epubUrl, bookData);
      if (!chapters.length)
        throw new Error("EPUB se text extract nahi ho paya.");

      const filteredChapters = maxPages
        ? chapters.slice(0, maxPages)
        : chapters;
      const combinedText = filteredChapters.join("\n\n");
      console.log(`[EPUB] Total text: ${combinedText.length} characters`);
      return combinedText;
    } catch (error) {
      console.error("[EPUB] Text Extraction Error:", error.message);
      throw error;
    }
  }

  // ─── PDF: Extract single page text ──────────────────────────────────────────
  async extractPageTextFromPdfUrl(pdfUrl, bookId, pageNumber, bookData = null) {
    try {
      console.log(`[PDF] Extracting page ${pageNumber} for Book ${bookId}`);
      const pdfBuffer = await this.getPdfBuffer(pdfUrl, bookData);

      const srcDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = srcDoc.getPageCount();

      if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(
          `Invalid page number. Document has ${totalPages} pages.`,
        );
      }

      for (let i = totalPages - 1; i >= 0; i--) {
        if (i !== pageNumber - 1) srcDoc.removePage(i);
      }

      const pagePdfBytes = await srcDoc.save({ useObjectStreams: false });

      const parser = new PDFParse(new Uint8Array(pagePdfBytes));
      let result = await parser.getText();
      let extractedText = typeof result === "string" ? result : result.text;

      if (parser.destroy && typeof parser.destroy === "function") {
        await parser.destroy();
      }

      extractedText = extractedText?.replace(/\s+/g, " ").trim() || "";

      return { text_content: extractedText, total_pages: totalPages };
    } catch (error) {
      console.error("Page Text Extraction Error:", error.message);
      throw error;
    }
  }

  // ─── EPUB: Extract single chapter text (chapter = page equivalent) ──────────
  async extractPageTextFromEpubUrl(
    epubUrl,
    bookId,
    chapterNumber,
    bookData = null,
  ) {
    try {
      console.log(
        `[EPUB] Extracting chapter ${chapterNumber} for Book ${bookId}`,
      );
      const chapters = await this.getEpubChapters(epubUrl, bookData);
      const totalChapters = chapters.length;

      if (chapterNumber < 1 || chapterNumber > totalChapters) {
        throw new Error(
          `Invalid chapter number. Book has ${totalChapters} chapters.`,
        );
      }

      const text = chapters[chapterNumber - 1];

      return {
        text_content: text,
        total_pages: totalChapters, // chapters as "pages"
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new PdfService();
