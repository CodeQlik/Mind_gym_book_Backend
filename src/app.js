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
import readingSyncRoutes from "./routes/readingSync.routes.js";
import orderRoutes from "./routes/order.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import supportRoutes from "./routes/support.routes.js";
import cmsRoutes from "./routes/cms.routes.js";

import requestLogger from "./middlewares/requestLogger.middleware.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://mindgymbook.ductfabrication.in",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Origin blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["X-Is-Preview"],
    optionsSuccessStatus: 200,
  }),
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(requestLogger);

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
app.use("/api/v1/reading-sync", readingSyncRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/cms", cmsRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Mind Gym Book API (Restructured Edition)");
});

app.use(errorMiddleware);

export { app };
