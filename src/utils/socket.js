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

    let adminDest = io.to("admins");
    if (senderRoom) adminDest = adminDest.except(senderRoom);
    adminDest = adminDest.except(`user_${userId}`);

    adminDest.emit("notification", data);
  } else {
    const broadcastDest = senderRoom ? io.except(senderRoom) : io;
    broadcastDest.emit("notification", data);
  }
};
