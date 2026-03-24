import { Server } from "socket.io";

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

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", (data) => {
      const { userId, isAdmin } =
        typeof data === "object" ? data : { userId: data };

      if (userId) {
        socket.join(`user_${userId}`);
      }

      if (isAdmin) {
        socket.join("admins");
      }
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
    if (["ORDER_CREATED", "REFUND_REQUEST", "REFUND_PROCESSED", "ORDER_CANCELLED", "STOCK_UPDATE"].includes(data.type)) {
      adminDest.emit("data_refresh", { type: data.type, timestamp: new Date() });
    }
  } else {
    const adminDest = io.to("admins");
    const broadcastDest = senderRoom ? io.except(senderRoom) : io;

    // Secure Broadcast: Sensitive system types go ONLY to admins
    const adminOnlyTypes = ["REFUND_REQUEST", "SYSTEM_ALERT", "STOCK_UPDATE", "CRON_JOB"];
    if (adminOnlyTypes.includes(data.type)) {
        adminDest.emit("notification", data);
        adminDest.emit("data_refresh", { type: data.type, timestamp: new Date() });
    } else {
        // Safe broadcast for everyone
        broadcastDest.emit("notification", data);
    }
  }
};
