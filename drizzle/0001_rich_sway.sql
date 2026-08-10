ALTER TABLE "certificate_templates" ADD COLUMN "collegeX" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD COLUMN "collegeY" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD COLUMN "collegeFont" varchar(100) DEFAULT 'Arial' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD COLUMN "collegeFontSize" integer DEFAULT 32 NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD COLUMN "collegeColor" varchar(7) DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "college" varchar(255);