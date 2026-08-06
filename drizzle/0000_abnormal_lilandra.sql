CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."send_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "certificate_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"imageUrl" text NOT NULL,
	"imageKey" varchar(255) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"nameX" numeric(10, 2) NOT NULL,
	"nameY" numeric(10, 2) NOT NULL,
	"nameFont" varchar(100) DEFAULT 'Arial' NOT NULL,
	"nameFontSize" integer DEFAULT 48 NOT NULL,
	"nameColor" varchar(7) DEFAULT '#000000' NOT NULL,
	"eventX" numeric(10, 2) NOT NULL,
	"eventY" numeric(10, 2) NOT NULL,
	"eventFont" varchar(100) DEFAULT 'Arial' NOT NULL,
	"eventFontSize" integer DEFAULT 32 NOT NULL,
	"eventColor" varchar(7) DEFAULT '#000000' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"participantId" integer NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"subject" text NOT NULL,
	"status" "send_status" DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"event" varchar(255) NOT NULL,
	"certificateUrl" text,
	"certificateKey" varchar(255),
	"sendStatus" "send_status" DEFAULT 'pending' NOT NULL,
	"sendAttempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"password" text NOT NULL,
	"fromName" varchar(255) NOT NULL,
	"useTls" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "smtp_settings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
