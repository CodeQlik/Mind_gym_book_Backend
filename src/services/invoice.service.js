import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import orderService from "./order.service.js";

class InvoiceService {
  async generateOrderInvoice(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.2, 0.3, 0.5); // Deep Indigo/Charcoal
    const secondaryColor = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.96, 0.97, 0.98);

    // ─── Top Accent Bar ───────────────────────────────────────────────────
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width: width,
      height: 10,
      color: primaryColor,
    });

    // ─── Header Section ───────────────────────────────────────────────────
    page.drawText("TAX INVOICE", {
      x: 50,
      y: height - 55,
      size: 28,
      font: fontBold,
      color: primaryColor,
    });

    // Company Logo/Name Placeholder
    page.drawText("MIND GYM BOOK PUBLICATION", {
      x: width - 250,
      y: height - 55,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(
      "Empowering Minds, One Book at a Time\nSupport: contact@mindgym.com\nGSTIN: 27AAAAA0000A1Z5",
      {
        x: width - 250,
        y: height - 75,
        size: 9,
        font: fontRegular,
        color: secondaryColor,
        lineHeight: 12,
      },
    );

    // ─── Order Info Bar ───────────────────────────────────────────────────
    page.drawRectangle({
      x: 50,
      y: height - 165,
      width: 500,
      height: 60,
      color: lightGray,
    });

    // Left Side: Invoice Details
    page.drawText("INVOICE DETAILS", {
      x: 70,
      y: height - 125,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`No: INV-${order.order_no.split("-")[1]}`, {
      x: 70,
      y: height - 140,
      size: 10,
      font: fontBold,
    });

    const orderDate = order.created_at || order.createdAt || new Date();
    page.drawText(
      `Date: ${new Date(orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      {
        x: 70,
        y: height - 155,
        size: 9,
        font: fontRegular,
      },
    );

    // Right Side: Order Number & Type
    page.drawText("ORDER INFO", {
      x: 220,
      y: height - 125,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`ID: ${order.order_no}`, {
      x: 220,
      y: height - 140,
      size: 10,
      font: fontRegular,
    });
    page.drawText(
      `Type: ${order.order_type === "physical_book" ? "Physical Copy" : "Marketplace"}`,
      { x: 220, y: height - 155, size: 9, font: fontRegular },
    );

    // Payment Status Badge (Small Box)
    const isPaid = order.payment_status?.toLowerCase() === "paid";
    page.drawRectangle({
      x: 400,
      y: height - 150,
      width: 100,
      height: 25,
      color: isPaid ? rgb(0.9, 1, 0.9) : rgb(1, 0.9, 0.9),
    });
    page.drawText(order.payment_status?.toUpperCase() || "PENDING", {
      x: 415,
      y: height - 140,
      size: 9,
      font: fontBold,
      color: isPaid ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
    });

    // ─── Billing Section ──────────────────────────────────────────────────
    page.drawText("BILL TO:", {
      x: 50,
      y: height - 200,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    // Line under Billing title
    page.drawLine({
      start: { x: 50, y: height - 205 },
      end: { x: 100, y: height - 205 },
      thickness: 1.5,
      color: primaryColor,
    });

    page.drawText(order.user?.name || "Customer", {
      x: 50,
      y: height - 225,
      size: 12,
      font: fontBold,
    });
    page.drawText(order.user?.email || "", {
      x: 50,
      y: height - 240,
      size: 10,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawText(order.shipping_address || "", {
      x: 50,
      y: height - 255,
      size: 9,
      font: fontRegular,
      color: secondaryColor,
      maxWidth: 300,
      lineHeight: 12,
    });

    // ─── Items Table ──────────────────────────────────────────────────────
    let yPos = height - 330;

    // Table Header Styling
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: 500,
      height: 25,
      color: primaryColor,
    });

    const tableHeaderY = yPos + 2;
    page.drawText("ITEM DESCRIPTION", {
      x: 65,
      y: tableHeaderY,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("QTY", {
      x: 340,
      y: tableHeaderY,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("UNIT PRICE", {
      x: 400,
      y: tableHeaderY,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("TOTAL", {
      x: 490,
      y: tableHeaderY,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    yPos -= 35;

    // Table Rows
    order.items.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 1) {
        page.drawRectangle({
          x: 50,
          y: yPos - 8,
          width: 500,
          height: 22,
          color: rgb(0.98, 0.98, 1),
        });
      }

      const bookTitle = item.book?.title || "Book";
      page.drawText(
        bookTitle.length > 45 ? bookTitle.substring(0, 42) + "..." : bookTitle,
        {
          x: 65,
          y: yPos,
          size: 10,
          font: fontRegular,
        },
      );
      page.drawText(String(item.quantity).padStart(2, "0"), {
        x: 345,
        y: yPos,
        size: 10,
        font: fontRegular,
      });
      page.drawText(`INR ${item.unit_price}`, {
        x: 405,
        y: yPos,
        size: 10,
        font: fontRegular,
      });
      page.drawText(`INR ${item.subtotal}`, {
        x: 490,
        y: yPos,
        size: 10,
        font: fontBold,
      });

      yPos -= 25;

      // Bottom border for each row
      page.drawLine({
        start: { x: 50, y: yPos + 15 },
        end: { x: 550, y: yPos + 15 },
        thickness: 0.2,
        color: rgb(0.8, 0.8, 0.8),
      });
    });

    // ─── Summary Section ──────────────────────────────────────────────────
    yPos -= 20;
    const summaryLabelX = 380;
    const summaryValueX = 490;

    const drawSummaryRow = (
      label,
      value,
      isBold = false,
      customColor = rgb(0, 0, 0),
    ) => {
      page.drawText(label, {
        x: summaryLabelX,
        y: yPos,
        size: 10,
        font: isBold ? fontBold : fontRegular,
        color: customColor,
      });
      page.drawText(value, {
        x: summaryValueX,
        y: yPos,
        size: 10,
        font: isBold ? fontBold : fontRegular,
        color: customColor,
      });
      yPos -= 20;
    };

    drawSummaryRow("Subtotal:", `INR ${order.subtotal_amount}`);
    if (order.discount_amount > 0) {
      drawSummaryRow(
        "Discount:",
        `-INR ${order.discount_amount}`,
        false,
        rgb(0.8, 0, 0),
      );
    }

    yPos -= 10;
    // Grand Total Box
    page.drawRectangle({
      x: summaryLabelX - 15,
      y: yPos - 10,
      width: 200, // Increased from 180 to fit the text
      height: 35,
      color: primaryColor,
    });
    page.drawText("GRAND TOTAL:", {
      x: summaryLabelX - 5,
      y: yPos,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`INR ${order.total_amount}`, {
      x: 470, // Shifted left from 490 to avoid clipping
      y: yPos,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // ─── Footer ───────────────────────────────────────────────────────────
    const footerY = 80;
    page.drawLine({
      start: { x: 50, y: footerY + 20 },
      end: { x: 550, y: footerY + 20 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    page.drawText("Notes & Instructions:", {
      x: 50,
      y: footerY,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(
      "1. This is a computer generated invoice and does not require a physical signature.\n2. For any discrepancies, please contact support within 48 hours.\n3. Keep this invoice for any future warranty or return requests.",
      {
        x: 50,
        y: footerY - 15,
        size: 8,
        font: fontRegular,
        color: secondaryColor,
        lineHeight: 11,
      },
    );

    page.drawText("Thank you for shopping with Mind Gym!", {
      x: width / 2 - 80,
      y: 30,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

export default new InvoiceService();
