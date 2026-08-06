import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  console.log(`[createContext] Path: ${opts.req.path}`);
  try {
    user = await sdk.authenticateRequest(opts.req);
    console.log(`[createContext] Authentication success. User ID: ${user?.id}`);
  } catch (error: any) {
    console.log(`[createContext] Authentication failed: ${error.message || error}`);
    user = null;
  }

  // Local development auto-login: if authentication fails and OAUTH is unconfigured or in development, log in default dev user
  const isDev = process.env.NODE_ENV === "development";
  const hasNoOAuth = !process.env.OAUTH_SERVER_URL;
  console.log(`[createContext] isDev: ${isDev}, hasNoOAuth: ${hasNoOAuth}, env.NODE_ENV: ${process.env.NODE_ENV}, env.OAUTH_SERVER_URL: ${process.env.OAUTH_SERVER_URL}`);

  if (!user && (isDev || hasNoOAuth)) {
    const devUserOpenId = "dev-user-openid";
    console.log(`[createContext] Attempting dev auto-login with openId: ${devUserOpenId}`);
    try {
      await db.upsertUser({
        openId: devUserOpenId,
        name: "Local Developer",
        email: "developer@example.com",
        loginMethod: "dev",
        role: "admin",
      });
      user = await db.getUserByOpenId(devUserOpenId) || null;
      console.log(`[createContext] Dev auto-login query result:`, user ? `ID=${user.id}` : "NULL");
    } catch (dbError: any) {
      console.log(`[createContext] Dev auto-login query error: ${dbError.message || dbError}`);
      user = null;
    }

    // If database is offline (db.ts helpers resolved to undefined without throwing) or query returned null, apply in-memory fallback
    if (!user) {
      console.log(`[createContext] Applying in-memory developer fallback session`);
      user = {
        id: 1,
        openId: devUserOpenId,
        name: "Local Developer",
        email: "developer@example.com",
        loginMethod: "dev",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
  }

  console.log(`[createContext] Final Context User:`, user ? `ID=${user.id}, Name=${user.name}` : "NULL");

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
