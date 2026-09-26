import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

function parseClientUrls(value) {
  const urls = (value || "http://localhost:5173,https://codexa-project.onrender.com")
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const extraUrls = [];
  for (const url of urls) {
    if (url.includes("://localhost:")) {
      extraUrls.push(url.replace("://localhost:", "://127.0.0.1:"));
    } else if (url.includes("://127.0.0.1:")) {
      extraUrls.push(url.replace("://127.0.0.1:", "://localhost:"));
    }
  }
  return [...new Set([...urls, ...extraUrls])];
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrls: parseClientUrls(process.env.CLIENT_URL || process.env.CLIENT_URLS),
  collegeEmailDomain: (process.env.COLLEGE_EMAIL_DOMAIN || "college.com").trim().toLowerCase(),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/coding_platform",
  pgSsl:
    process.env.PGSSL === "true" ||
    String(process.env.DATABASE_URL || "").includes("neon.tech") ||
    String(process.env.DATABASE_URL || "").includes("sslmode=require"),
  jwtSecret: (() => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production. Refusing to start with weak fallback.");
    }
    return "development-jwt-secret-change-me";
  })(),
  judge0BaseUrl: (process.env.JUDGE0_BASE_URL || "https://ce.judge0.com").trim(),
  judge0ApiKey: (process.env.JUDGE0_API_KEY || "").trim(),
  judge0ApiHost: (process.env.JUDGE0_API_HOST || "").trim(),
  judge0PollIntervalMs: Number(process.env.JUDGE0_POLL_INTERVAL_MS) || 500,
  judge0MaxPollAttempts: Number(process.env.JUDGE0_MAX_POLL_ATTEMPTS) || 20,
  judge0LanguageCpp: Number(process.env.JUDGE0_LANGUAGE_CPP) || 105,
  judge0LanguageJava: Number(process.env.JUDGE0_LANGUAGE_JAVA) || 91,
  judge0LanguageJavascript: Number(process.env.JUDGE0_LANGUAGE_JAVASCRIPT) || 102,
  judge0LanguagePython: Number(process.env.JUDGE0_LANGUAGE_PYTHON) || 92
};
