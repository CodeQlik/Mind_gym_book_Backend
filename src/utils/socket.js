import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    path: "/socket.io/",
    cors: {
      origin: [
        "http://localhost:5173",
        "https://mindgymbook.ductfabrication.in",
      ],
      methods: ["GET", "POST"],
      credentials: false,
    },
  });

  // JWT Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const secret = process.env.ACCESS_TOKEN_SECRET || "access_secret";
      const decoded = jwt.verify(token, secret);

      // Verify user in DB to get latest status and type
      const [user] = await sequelize.query(
        "SELECT id, user_type, is_active FROM users WHERE id = :id LIMIT 1",
        {
          replacements: { id: decoded.id },
          type: QueryTypes.SELECT,
        },
      );

      if (!user) {
        return next(new Error("User not found"));
      }

      if (!user.is_active) {
        return next(new Error("Account is inactive"));
      }

      // Attach user info to socket
      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, user_type } = socket.user;
    console.log(
      `Socket [${socket.id}] connected for User [${id}] (${user_type})`,
    );

    // Automatically join user-specific room
    socket.join(`user_${id}`);

    // Automatically join admin room if authorized
    if (user_type === "admin") {
      socket.join("admins");
      console.log(`Admin [${id}] joined admin channel`);
    }

    // Keep join event for backward compatibility but ignore the data and use socket.user
    socket.on("join", () => {
      // Redundant now, but keeping to avoid client errors
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitNotification = (userId, data, senderId = null) => {
  if (!io) return;

  const senderRoom = senderId ? `user_${senderId}` : null;

  if (userId) {
    if (userId !== senderId) {
      io.to(`user_${userId}`).emit("notification", data);
    }

    const adminDest = io.to("admins");
    adminDest.emit("notification", data);

    // Special Event: Tell admin panel to refresh its data tables (Orders, Stock, etc.)
    const refreshTypes = [
      "ORDER_CREATED",
      "ORDER_PAID",
      "ORDER_SHIPPED",
      "ORDER_STATUS_UPDATE",
      "ORDER_RETURNED",
      "REFUND_REQUEST",
      "REFUND_PROCESSED",
      "ORDER_CANCELLED",
      "STOCK_UPDATE",
    ];

    if (refreshTypes.includes(data.type)) {
      console.log(`[SOCKET] Triggering Admin Refresh for: ${data.type}`);
      adminDest.emit("data_refresh", {
        type: data.type,
        timestamp: new Date(),
      });
    }
  } else {
    const adminDest = io.to("admins");
    const broadcastDest = senderRoom ? io.except(senderRoom) : io;

    // Secure Broadcast: Sensitive system types go ONLY to admins
    const adminOnlyTypes = [
      "REFUND_REQUEST",
      "SYSTEM_ALERT",
      "STOCK_UPDATE",
      "CRON_JOB",
    ];
    if (adminOnlyTypes.includes(data.type)) {
      adminDest.emit("notification", data);
      adminDest.emit("data_refresh", {
        type: data.type,
        timestamp: new Date(),
      });
    } else {
      // Safe broadcast for everyone
      broadcastDest.emit("notification", data);
    }
  }
};
