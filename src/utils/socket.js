import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust this for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Join a room based on userId for private notifications
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
      console.log("User disconnected");
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
    // 1. Send to the specific user (if not the sender)
    if (userId !== senderId) {
      io.to(`user_${userId}`).emit("notification", data);
    }

    // 2. Alert admins (excluding the sender)
    const adminDest = senderRoom
      ? io.to("admins").except(senderRoom)
      : io.to("admins");
    adminDest.emit("notification", data);
  } else {
    // 3. Broadcast to all (excluding the sender)
    const broadcastDest = senderRoom ? io.except(senderRoom) : io;
    broadcastDest.emit("notification", data);
  }
};
