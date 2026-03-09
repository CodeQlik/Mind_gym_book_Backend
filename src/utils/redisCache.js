import { redisClient } from "../config/redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = process.env.REDIS_TTL || 3600;

export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
  try {
    const value = JSON.stringify(data);
    await redisClient.set(key, value, {
      EX: ttl,
    });
  } catch (error) {
    logger.error(`Error setting cache for key: ${key}`, error);
  }
};

export const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Error deleting cache for key: ${key}`, error);
  }
};

/**
 * Clear cache by pattern (e.g., 'books:*')
 */
export const clearCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.error(`Error clearing cache pattern: ${pattern}`, error);
  }
};
