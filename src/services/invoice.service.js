import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import orderService from "./order.service.js";
import Setting from "../models/setting.model.js";
import axios from "axios";

class InvoiceService {
  async generateOrderInvoice(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 850]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Color Palette based on Reference Image
    const navyColor = rgb(0.08, 0.1, 0.18);
    const orangeColor = rgb(1, 0.58, 0.0); // Vibrant Amber/Orange
    const textDark = rgb(0.1, 0.1, 0.1);
    const textGray = rgb(0.4, 0.4, 0.4);

    let yPos = height;

    // ─── Header Section (Navy background with Orange slant) ──────────────
    page.drawRectangle({
      x: 0,
      y: height - 130,
      width: width,
      height: 130,
      color: navyColor,
    });

    // Orange accent slant (Top Right area effect)
    // Fix: Using SVG Path since drawPolygon is not an official method in pdf-lib PDFPage
    page.drawSvgPath(
      `M ${width - 180} ${height} L ${width - 120} ${height - 130} L ${width - 60} ${height - 130} L ${width} ${height} Z`,
      { color: orangeColor },
    );

    page.drawText("MIND GYM BOOK", {
      x: 40,
      y: height - 60,
      size: 26,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("PUBLICATION", {
      x: 40,
      y: height - 85,
      size: 16,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });

    page.drawText("INVOICE", {
      x: width - 200,
      y: height - 60,
      size: 38,
      font: fontBold,
      color: orangeColor,
    });
    page.drawText(`ID NO : ${order.order_no.split("-")[1] || "0000"}`, {
      x: width - 200,
      y: height - 85,
      size: 12,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });

    // ─── Contact Information (To/From) ────────────────────────────────────
    yPos = height - 180;

    const drawSectionHeader = (x, y, text) => {
      page.drawRectangle({
        x,
        y: y - 10,
        width: 100,
        height: 18,
        color: textDark,
      });
      page.drawText(text, {
        x: x + 10,
        y: y - 3,
        size: 9,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    };

    // Invoice To
    drawSectionHeader(40, yPos, "Invoice To :");
    page.drawText(order.user?.name || "Customer Name", {
      x: 40,
      y: yPos - 30,
      size: 11,
      font: fontBold,
      color: textDark,
    });
    page.drawText(order.user?.email || "", {
      x: 40,
      y: yPos - 45,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    page.drawText(order.user?.phone || "", {
      x: 40,
      y: yPos - 60,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    page.drawText(order.shipping_address || "", {
      x: 40,
      y: yPos - 75,
      size: 8,
      font: fontRegular,
      color: textGray,
      maxWidth: 220,
      lineHeight: 11,
    });

    // Invoice From
    drawSectionHeader(340, yPos, "Invoice From :");
    page.drawText("Mind Gym Book Publication", {
      x: 340,
      y: yPos - 30,
      size: 11,
      font: fontBold,
      color: textDark,
    });
    page.drawText("Support: +91 9876543210", {
      x: 340,
      y: yPos - 45,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    page.drawText("Email: admin@mindgym.com", {
      x: 340,
      y: yPos - 60,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    page.drawText("Jaipur, Rajasthan, 302020, India", {
      x: 340,
      y: yPos - 75,
      size: 9,
      font: fontRegular,
      color: textGray,
    });

    // ─── Table Header ─────────────────────────────────────────────────────
    yPos -= 130;
    page.drawRectangle({
      x: 40,
      y: yPos,
      width: width - 80,
      height: 28,
      color: orangeColor,
    });

    const tableHeaders = [
      { text: "DESCRIPTION", x: 55 },
      { text: "QTY", x: 280 },
      { text: "PRICE", x: 350 },
      { text: "TAX", x: 420 },
      { text: "TOTAL", x: 495 },
    ];

    tableHeaders.forEach((h) => {
      page.drawText(h.text, {
        x: h.x,
        y: yPos + 9,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    });

    // ─── Items Rows ───────────────────────────────────────────────────────
    yPos -= 5;
    order.items.forEach((item, idx) => {
      yPos -= 28;
      const bookTitle = item.book?.title || "Book Title";
      page.drawText(
        bookTitle.length > 40 ? bookTitle.substring(0, 37) + "..." : bookTitle,
        { x: 55, y: yPos + 10, size: 10, font: fontRegular, color: textDark },
      );
      page.drawText(String(item.quantity), {
        x: 285,
        y: yPos + 10,
        size: 10,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(`INR ${item.base_price}`, {
        x: 350,
        y: yPos + 10,
        size: 10,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(`${item.tax_rate}%`, {
        x: 425,
        y: yPos + 10,
        size: 10,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(`INR ${item.subtotal}`, {
        x: 495,
        y: yPos + 10,
        size: 10,
        font: fontBold,
        color: textDark,
      });

      // Row border
      page.drawLine({
        start: { x: 40, y: yPos + 2 },
        end: { x: 560, y: yPos + 2 },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
      });
    });

    // ─── Summary Section ──────────────────────────────────────────────────
    yPos -= 60;
    const summaryRightX = 540;
    const labelX = 420;

    const drawSummaryRow = (label, value, isBold = false) => {
      page.drawText(label, {
        x: labelX,
        y: yPos,
        size: 10,
        font: isBold ? fontBold : fontRegular,
        color: textDark,
      });
      const valWidth = fontBold.widthOfTextAtSize(String(value), 10);
      page.drawText(String(value), {
        x: summaryRightX - valWidth,
        y: yPos,
        size: 10,
        font: isBold ? fontBold : fontRegular,
        color: textDark,
      });
      yPos -= 18;
    };

    const itemTax = order.items.reduce((sum, item) => sum + parseFloat(item.tax_amount || 0), 0);
    const shippingTax = parseFloat(order.total_tax) - itemTax;

    drawSummaryRow("Subtotal :", `INR ${order.subtotal_amount}`);
    drawSummaryRow("Tax on Items :", `INR ${itemTax.toFixed(2)}`);

    if (parseFloat(order.shipping_charge) > 0) {
      drawSummaryRow("Shipping Base :", `INR ${order.shipping_charge}`);
      if (shippingTax > 0) {
        drawSummaryRow("Tax on Shipping :", `INR ${shippingTax.toFixed(2)}`);
      }
    }
    
    if (parseFloat(order.discount_amount) > 0) {
      drawSummaryRow(`Discount :`, `-INR ${order.discount_amount}`);
    }

    // Total Orange Row
    yPos -= 10;
    page.drawRectangle({
      x: 370,
      y: yPos - 10,
      width: 190,
      height: 25,
      color: orangeColor,
    });
    page.drawText("TOTAL", {
      x: 385,
      y: yPos - 2,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const grandTotalStr = `INR ${order.total_amount}`;
    const gtWidth = fontBold.widthOfTextAtSize(grandTotalStr, 12);
    page.drawText(grandTotalStr, {
      x: 550 - gtWidth,
      y: yPos - 2,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // ─── Signature & Footer ───────────────────────────────────────────────
    yPos = 130; // Use a fixed Y position near the bottom for the signature block
    
    page.drawText("Thanks for your business", {
      x: 40,
      y: yPos + 30,
      size: 14,
      font: fontBold,
      color: navyColor,
    });
    
    // Signature Line elements (Only the Image is kept for a clean look)
    const sigX = 420;
    try {
      const setting = await Setting.findOne();
      if (setting) {
        const plainSetting = setting.get ? setting.get({ plain: true }) : setting;
        let sigData = plainSetting.admin_signature;
        
        if (typeof sigData === "string") {
          try { sigData = JSON.parse(sigData); } catch(e) {}
        }

        if (sigData && sigData.url) {
          const sigResponse = await axios.get(sigData.url, { responseType: "arraybuffer" });
          const signatureBuffer = Buffer.from(sigResponse.data);
          
          let sigImage;
          try {
            sigImage = await pdfDoc.embedPng(signatureBuffer);
          } catch (pngErr) {
            sigImage = await pdfDoc.embedJpg(signatureBuffer);
          }
          
          page.drawImage(sigImage, {
            x: sigX - 10,
            y: yPos - 5,
            width: 140,
            height: 60,
          });
        }
      }
    } catch (e) {
      console.warn("[Invoice] Signature image embed failed:", e.message);
    }

    // Slants at the bottom
    page.drawSvgPath(`M 0 0 L 300 0 L 400 30 L 350 60 L 0 60 Z`, {
      color: navyColor,
    });
    page.drawSvgPath(`M 330 0 L ${width} 0 L ${width} 60 L 380 30 Z`, {
      color: orangeColor,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

export default new InvoiceService();
