import { redisClient } from "../config/redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = process.env.REDIS_TTL || 3600;

const getPrefix = () => {
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  return baseUrl.includes("localhost") ? "local:" : "live:";
};

export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
  try {
    const prefixedKey = getPrefix() + key;
    const value = JSON.stringify(data);
    await redisClient.set(prefixedKey, value, {
      EX: ttl,
    });
  } catch (error) {
    logger.error(`Error setting cache for key: ${key}`, error);
  }
};

export const getCache = async (key) => {
  try {
    const prefixedKey = getPrefix() + key;
    const data = await redisClient.get(prefixedKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

export const deleteCache = async (key) => {
  try {
    const prefixedKey = getPrefix() + key;
    await redisClient.del(prefixedKey);
  } catch (error) {
    logger.error(`Error deleting cache for key: ${key}`, error);
  }
};

/**
 * Clear cache by pattern (e.g., 'books:*')
 */
export const clearCachePattern = async (pattern) => {
  try {
    const prefixedPattern = getPrefix() + pattern;
    const keys = await redisClient.keys(prefixedPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.error(`Error clearing cache pattern: ${pattern}`, error);
  }
};
