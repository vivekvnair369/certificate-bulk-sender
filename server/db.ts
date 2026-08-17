import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, certificateTemplates, participants, emailLogs, smtpSettings, emailTemplates } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect to PostgreSQL:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, any> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Certificate template queries
export async function getCertificateTemplate(userId: number, templateId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(certificateTemplates)
    .where(eq(certificateTemplates.id, templateId))
    .limit(1);
  
  return result.length > 0 && result[0].userId === userId ? result[0] : undefined;
}

export async function getUserCertificateTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(certificateTemplates)
    .where(eq(certificateTemplates.userId, userId));
}

export async function createCertificateTemplate(template: typeof certificateTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(certificateTemplates).values(template);
  return result;
}

// Participant queries
export async function getParticipants(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(participants)
    .where(eq(participants.userId, userId));
}

export async function createParticipant(participant: typeof participants.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(participants).values(participant);
  return result;
}

export async function updateParticipant(id: number, updates: Partial<typeof participants.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(participants)
    .set(updates)
    .where(eq(participants.id, id));
}

export async function deleteParticipant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(participants).where(eq(participants.id, id));
}

// SMTP settings queries
export async function getSmtpSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(smtpSettings)
    .where(eq(smtpSettings.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSmtpSettings(settings: typeof smtpSettings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSmtpSettings(settings.userId);
  
  if (existing) {
    return db.update(smtpSettings)
      .set(settings)
      .where(eq(smtpSettings.userId, settings.userId));
  } else {
    return db.insert(smtpSettings).values(settings);
  }
}

// Email template queries
export async function getEmailTemplate(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertEmailTemplate(template: typeof emailTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getEmailTemplate(template.userId);
  
  if (existing) {
    return db.update(emailTemplates)
      .set(template)
      .where(eq(emailTemplates.userId, template.userId));
  } else {
    return db.insert(emailTemplates).values(template);
  }
}

// Email log queries
export async function createEmailLog(log: typeof emailLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(emailLogs).values(log);
}

export async function getEmailLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(emailLogs)
    .where(eq(emailLogs.userId, userId));
}
