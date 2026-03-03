import axios from "axios";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { cloudinary } from "../config/cloudinary.js";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfService {
  async getPdfBuffer(pdfUrl, bookData = null) {
    try {
      let pdfBuffer;

      // 1. Try Local File first if available (Performance++)
      if (bookData?.pdf_file?.local_path) {
        const fullPath = path.resolve(bookData.pdf_file.local_path);
        if (fs.existsSync(fullPath)) {
          pdfBuffer = fs.readFileSync(fullPath);
          console.log("PDF loaded from local storage");
          return pdfBuffer;
        }
      }

      // 2. Download PDF if not loaded from local
      let finalUrl = pdfUrl;

      // If it's a Cloudinary URL, try to generate a signed URL just in case it's private/authenticated
      if (pdfUrl.includes("cloudinary.com") && bookData?.pdf_file?.public_id) {
        try {
          const public_id = bookData.pdf_file.public_id;
          finalUrl = cloudinary.url(public_id, {
            resource_type: "raw",
            sign_url: true,
            secure: true,
          });
          console.log("Generated signed URL for Cloudinary");
        } catch (e) {
          console.warn("Could not sign URL, using original:", e.message);
        }
      }

      console.log(`Downloading PDF from: ${finalUrl}`);
      const response = await axios.get(finalUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 30000,
      });
      pdfBuffer = Buffer.from(response.data);
      console.log("PDF downloaded successfully");
      return pdfBuffer;
    } catch (error) {
      console.error("PDF Download Buffer Error:", error.message);
      throw error;
    }
  }

  async extractTextFromPdfUrl(pdfUrl, bookId, bookData = null) {
    try {
      console.log(`Starting text extraction for Book ID: ${bookId}`);
      const pdfBuffer = await this.getPdfBuffer(pdfUrl, bookData);

      // 3. Extract Text using mehmet-kozan/pdf-parse (v2+)
      // Note: Convert Buffer to Uint8Array as required by this library version
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      let result = await parser.getText();

      // If result is an object, get the text property. v2 getText() returns string directly.
      let extractedText = typeof result === "string" ? result : result.text;

      // Cleanup parser resources (especially important if using worker-based parsers)
      if (parser.destroy && typeof parser.destroy === "function") {
        await parser.destroy();
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(
          "PDF se text extract nahi ho paya. Shayad yeh image-based PDF hai?",
        );
      }

      // Clean up text (remove excessive newlines/spaces)
      extractedText = extractedText.replace(/\s+/g, " ").trim();
      console.log(
        `Text extracted and cleaned: ${extractedText.length} characters`,
      );

      return extractedText;
    } catch (error) {
      console.error("Text Extraction Service Error:", error.message);
      throw error;
    }
  }

  async extractPageTextFromPdfUrl(pdfUrl, bookId, pageNumber, bookData = null) {
    try {
      console.log(
        `[PdfService] Extracting single page: Book ${bookId}, Page ${pageNumber}`,
      );
      const pdfBuffer = await this.getPdfBuffer(pdfUrl, bookData);

      // 1. Load document with pdf-lib
      const srcDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = srcDoc.getPageCount();

      if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(
          `Invalid page number. Document has ${totalPages} pages.`,
        );
      }

      // 2. Strategy: Remove all pages EXCEPT the target page
      // This preserves all embedded fonts, metadata, and resources better than copyPages.
      // We iterate backwards to avoid index shifting.
      for (let i = totalPages - 1; i >= 0; i--) {
        if (i !== pageNumber - 1) {
          srcDoc.removePage(i);
        }
      }

      // 3. Save as a simple, uncompressed PDF bytes
      const pagePdfBytes = await srcDoc.save({ useObjectStreams: false });

      // 4. Extract Text using PDFParse
      const parser = new PDFParse(new Uint8Array(pagePdfBytes));
      let result = await parser.getText();

      let extractedText = typeof result === "string" ? result : result.text;

      if (parser.destroy && typeof parser.destroy === "function") {
        await parser.destroy();
      }

      // Clean up text
      extractedText = extractedText?.replace(/\s+/g, " ").trim() || "";
      console.log(
        `[PdfService] Page ${pageNumber} extracted. Text length: ${extractedText.length}`,
      );

      return {
        text_content: extractedText,
        total_pages: totalPages,
      };
    } catch (error) {
      console.error("Page Text Extraction Error:", error.message);
      throw error;
    }
  }
}

export default new PdfService();
