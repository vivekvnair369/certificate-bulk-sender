import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { certificateSenderRouter } from "./routers/certificateSender";
import { z } from "zod";
import crypto from "crypto";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { users } from "../drizzle/schema";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    signup: publicProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const emailLower = input.email.toLowerCase().trim();
        const existingUser = await db.getUserByEmail(emailLower);
        if (existingUser) {
          throw new Error("A user with this email already exists");
        }

        const openId = `email-${emailLower}`;
        const hashedPassword = hashPassword(input.password);

        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Insert new user
        await database.insert(users).values({
          openId,
          name: input.name,
          email: emailLower,
          passwordHash: hashedPassword,
          loginMethod: "email",
        });

        // Sign in immediately
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const emailLower = input.email.toLowerCase().trim();
        const user = await db.getUserByEmail(emailLower);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const hashedPassword = hashPassword(input.password);
        if (user.passwordHash !== hashedPassword) {
          throw new Error("Invalid email or password");
        }

        // Set session cookie
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Update lastSignedIn
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  sender: certificateSenderRouter,
});

export type AppRouter = typeof appRouter;
