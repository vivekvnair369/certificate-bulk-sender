import { serial, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, integer } from "drizzle-orm/pg-core";

// Define Postgres Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sendStatusEnum = pgEnum("send_status", ["pending", "sent", "failed"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Certificate templates table - stores uploaded certificate templates
 */
export const certificateTemplates = pgTable("certificate_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  imageKey: varchar("imageKey", { length: 255 }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  
  // Name text positioning and styling
  nameX: decimal("nameX", { precision: 10, scale: 2 }).notNull(),
  nameY: decimal("nameY", { precision: 10, scale: 2 }).notNull(),
  nameFont: varchar("nameFont", { length: 100 }).default("Arial").notNull(),
  nameFontSize: integer("nameFontSize").default(48).notNull(),
  nameColor: varchar("nameColor", { length: 7 }).default("#000000").notNull(),
  
  // Event text positioning and styling
  eventX: decimal("eventX", { precision: 10, scale: 2 }).notNull(),
  eventY: decimal("eventY", { precision: 10, scale: 2 }).notNull(),
  eventFont: varchar("eventFont", { length: 100 }).default("Arial").notNull(),
  eventFontSize: integer("eventFontSize").default(32).notNull(),
  eventColor: varchar("eventColor", { length: 7 }).default("#000000").notNull(),

  // College text positioning and styling
  collegeX: decimal("collegeX", { precision: 10, scale: 2 }).notNull(),
  collegeY: decimal("collegeY", { precision: 10, scale: 2 }).notNull(),
  collegeFont: varchar("collegeFont", { length: 100 }).default("Arial").notNull(),
  collegeFontSize: integer("collegeFontSize").default(32).notNull(),
  collegeColor: varchar("collegeColor", { length: 7 }).default("#000000").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type InsertCertificateTemplate = typeof certificateTemplates.$inferInsert;

/**
 * Participants table - stores participant data for certificate distribution
 */
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  event: varchar("event", { length: 255 }).notNull(),
  college: varchar("college", { length: 255 }),
  certificateUrl: text("certificateUrl"),
  certificateKey: varchar("certificateKey", { length: 255 }),
  sendStatus: sendStatusEnum("sendStatus").default("pending").notNull(),
  sendAttempts: integer("sendAttempts").default(0).notNull(),
  lastError: text("lastError"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * Email logs table - tracks email sending history
 */
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  participantId: integer("participantId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: text("subject").notNull(),
  status: sendStatusEnum("status").default("pending").notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * SMTP settings table - stores SMTP configuration per user
 */
export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  password: text("password").notNull(),
  fromName: varchar("fromName", { length: 255 }).notNull(),
  useTls: boolean("useTls").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type InsertSmtpSettings = typeof smtpSettings.$inferInsert;

/**
 * Email templates table - stores email subject and body templates
 */
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
