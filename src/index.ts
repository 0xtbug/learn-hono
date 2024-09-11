import { Hono } from "hono";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";
import { bearerAuth } from "hono/bearer-auth";

const app = new Hono();

/**
 * Schema for validating login data.
 * @typedef {Object} LoginSchema
 * @property {string} email - Must be a valid email address.
 * @property {string} password - Must be at least 8 characters long and contain at least one letter, one number, and one special character.
 */
const schema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
      message:
        "Minimum eight characters, at least one letter, one number and one special character",
    }),
});

// Enable logging for all routes
app.use(logger());

/**
 * Login endpoint.
 * @route POST /login
 * @param {Object} c - The context object.
 * @throws {HTTPException} 401 - If credentials are invalid.
 * @returns {Object} JSON response with payload and token.
 */
app.post("/login", zValidator("json", schema), async (c) => {
  const { email, password } = await c.req.json();
  if (password !== "qwery1234*") {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  /**
   * @typedef {Object} Payload
   * @property {string} email - The user's email.
   * @property {number} exp - Token expiration time in seconds since epoch.
   */
  const payload = { email, exp: Math.floor(Date.now() / 1000) + 60 * 60 };

  const token = await sign(payload, Bun.env.SECRET || "");
  setCookie(c, "token", token);
  return c.json({
    payload,
    token,
  });
});

/**
 * Authentication middleware for protected routes.
 * Uses bearer token for verification.
 */
app.use(
  "/index/*",
  bearerAuth({
    verifyToken: async (token, c) => {
      return token === getCookie(c, "token");
    },
  }) 
);

/**
 * Protected endpoint to get a list of movies.
 * @route GET /index/movies
 * @param {Object} c - The context object.
 * @returns {Object} JSON response with a list of movies.
 */
app.get("/index/movies", async (c) => {
  return c.json({
    movies: [
      {
        title: "The Shawshank Redemption",
        year: 1994,
      },
    ],
  });
});

export default app;