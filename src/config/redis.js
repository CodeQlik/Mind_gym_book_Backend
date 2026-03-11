import { createClient } from "redis";
import logger from "../utils/logger.js";

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));
redisClient.on("connect", () => logger.info("Redis Client Connected"));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error("Failed to connect to Redis", error);
  }
};

export { redisClient, connectRedis };
export default redisClient;
