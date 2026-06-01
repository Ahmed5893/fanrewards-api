import dotenv from "dotenv";

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
function optionalCsvEnv(name: string): string[] {
  const value = process.env[name];

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  logLevel: process.env.LOG_LEVEL || "info",
  nodeEnv: process.env.NODE_ENV || "development",

  cors: {
    origins: optionalCsvEnv("CORS_ORIGINS"),
  },

  db: {
    host: requiredEnv("DB_HOST"),
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: requiredEnv("DB_USERNAME"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_DATABASE"),
  },

  jwt: {
    accessSecret: requiredEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requiredEnv("JWT_REFRESH_SECRET"),
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },
};
