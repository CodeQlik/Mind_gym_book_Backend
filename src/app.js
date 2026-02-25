import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js";
import addressRoutes from "./routes/address.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import bookRoutes from "./routes/book.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import noteRoutes from "./routes/note.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import planRoutes from "./routes/plan.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import readingSyncRoutes from "./routes/readingSync.routes.js";
import orderRoutes from "./routes/order.routes.js";

import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/user/addresses", addressRoutes);
app.use("/api/v1/category", categoryRoutes);

app.use("/api/v1/book", bookRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/note", noteRoutes);
app.use("/api/v1/review", reviewRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/marketplace", marketplaceRoutes);
app.use("/api/v1/reading-sync", readingSyncRoutes);
app.use("/api/v1/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Mind Gym Book API (Restructured Edition)");
});

app.use(errorMiddleware);

export { app };
