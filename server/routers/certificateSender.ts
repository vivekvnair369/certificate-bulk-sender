import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq, inArray } from "drizzle-orm";
import { getDb, getCertificateTemplate, getUserCertificateTemplates, createCertificateTemplate, getParticipants, createParticipant, updateParticipant, deleteParticipant, getSmtpSettings, upsertSmtpSettings, getEmailTemplate, upsertEmailTemplate, createEmailLog, getEmailLogs } from "../db";
import { certificateTemplates, participants, emailLogs, smtpSettings, emailTemplates } from "../../drizzle/schema";
import { generateCertificatePDF, parseParticipantCSV } from "../certificate";
import { createTransporter, sendEmail, testSmtpConnection, replaceEmailTemplateVariables } from "../email";
import { storagePut, storageGetSignedUrl } from "../storage";
import sharp from "sharp";
import fs from "fs";

// Global background state for tracking active send progress (optional, database status is the source of truth)
const activeJobs = new Map<string, { total: number; processed: number; errors: number }>();

export const certificateSenderRouter = router({
  // --- SMTP Settings ---
  getSmtp: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getSmtpSettings(ctx.user.id);
    if (!settings) {
      return {
        id: 0,
        userId: ctx.user.id,
        host: "smtp.gmail.com",
        port: 587,
        email: "aitheronmlsymposium@gmail.com",
        password: "",
        fromName: "AITHERON ML Symposium",
        useTls: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return settings;
  }),

  saveSmtp: protectedProcedure
    .input(
      z.object({
        host: z.string().min(1, "Host is required"),
        port: z.number().int().positive(),
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
        fromName: z.string().min(1, "From Name is required"),
        useTls: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertSmtpSettings({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  testSmtp: protectedProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number(),
        email: z.string().email(),
        password: z.string(),
        fromName: z.string(),
        useTls: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // Mock SmtpSettings object for verification helper
      const mockSettings = {
        id: 0,
        userId: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      };
      return await testSmtpConnection(mockSettings);
    }),

  // --- Email Templates ---
  getEmailTemplate: protectedProcedure.query(async ({ ctx }) => {
    return await getEmailTemplate(ctx.user.id);
  }),

  saveEmailTemplate: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        body: z.string().min(1, "Email body is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertEmailTemplate({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  // --- Certificate Templates ---
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return await getUserCertificateTemplates(ctx.user.id);
  }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Template name is required"),
        imageBase64: z.string().min(1, "Image content is required"),
        fileName: z.string().default("template.png"),
        nameX: z.number(),
        nameY: z.number(),
        nameFont: z.string().default("Arial"),
        nameFontSize: z.number().default(48),
        nameColor: z.string().default("#000000"),
        eventX: z.number(),
        eventY: z.number(),
        eventFont: z.string().default("Arial"),
        eventFontSize: z.number().default(32),
        eventColor: z.string().default("#000000"),
        collegeX: z.number(),
        collegeY: z.number(),
        collegeFont: z.string().default("Arial"),
        collegeFontSize: z.number().default(32),
        collegeColor: z.string().default("#000000"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Remove data URI prefix if present
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Extract image dimensions
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      // Upload template image to S3
      const key = `templates/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { key: hashedKey, url } = await storagePut(key, buffer, "image/png");

      // Save template metadata to database
      await createCertificateTemplate({
        userId: ctx.user.id,
        name: input.name,
        imageUrl: url,
        imageKey: hashedKey,
        width,
        height,
        nameX: input.nameX.toString(),
        nameY: input.nameY.toString(),
        nameFont: input.nameFont,
        nameFontSize: input.nameFontSize,
        nameColor: input.nameColor,
        eventX: input.eventX.toString(),
        eventY: input.eventY.toString(),
        eventFont: input.eventFont,
        eventFontSize: input.eventFontSize,
        eventColor: input.eventColor,
        collegeX: input.collegeX.toString(),
        collegeY: input.collegeY.toString(),
        collegeFont: input.collegeFont,
        collegeFontSize: input.collegeFontSize,
        collegeColor: input.collegeColor,
      });

      return { success: true };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Ensure ownership
      const template = await getCertificateTemplate(ctx.user.id, input.id);
      if (!template) {
        throw new Error("Template not found or unauthorized");
      }

      await db.delete(certificateTemplates).where(eq(certificateTemplates.id, input.id));
      return { success: true };
    }),

  // --- Participants ---
  listParticipants: protectedProcedure.query(async ({ ctx }) => {
    return await getParticipants(ctx.user.id);
  }),

  createParticipant: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email format"),
        event: z.string().min(1, "Event name is required"),
        college: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createParticipant({
        userId: ctx.user.id,
        name: input.name,
        email: input.email,
        event: input.event,
        college: input.college || null,
        sendStatus: "pending",
        sendAttempts: 0,
      });
      return { success: true };
    }),

  updateParticipant: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email format"),
        event: z.string().min(1, "Event name is required"),
        college: z.string().optional(),
        sendStatus: z.enum(["pending", "sent", "failed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateParticipant(input.id, {
        name: input.name,
        email: input.email,
        event: input.event,
        college: input.college || null,
        ...(input.sendStatus ? { sendStatus: input.sendStatus } : {}),
      });
      return { success: true };
    }),

  deleteParticipant: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteParticipant(input.id);
      return { success: true };
    }),

  deleteParticipantsBulk: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db || input.ids.length === 0) return { success: true };
      await db.delete(participants).where(inArray(participants.id, input.ids));
      return { success: true };
    }),

  importCSV: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("[importCSV] Raw CSV content (first 500 chars):", JSON.stringify(input.csvContent.slice(0, 500)));
      const records = await parseParticipantCSV(input.csvContent);
      if (records.length === 0) {
        throw new Error("No valid participant records found in CSV");
      }

      for (const record of records) {
        await createParticipant({
          userId: ctx.user.id,
          name: record.name,
          email: record.email,
          event: record.event,
          college: record.college || null,
          sendStatus: "pending",
          sendAttempts: 0,
        });
      }

      return { count: records.length };
    }),

  // --- Bulk Email Dispatch (Asynchronous Worker) ---
  sendBulk: protectedProcedure
    .input(
      z.object({
        participantIds: z.array(z.number()),
        templateId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { participantIds, templateId } = input;

      // Kick off background execution thread (does not block HTTP response)
      processBulkEmailsBackground(userId, participantIds, templateId).catch(err => {
        console.error("[Bulk Sender Worker] Fatal execution error:", err);
      });

      return { success: true, message: "Bulk sending process has started in the background." };
    }),

  // --- Delivery Logs ---
  getLogs: protectedProcedure.query(async ({ ctx }) => {
    return await getEmailLogs(ctx.user.id);
  }),
});

/**
 * Background worker to orchestrate generating PDFs and sending emails.
 */
async function processBulkEmailsBackground(
  userId: number,
  participantIds: number[],
  templateId: number
) {
  const db = await getDb();
  if (!db) {
    console.error("[Bulk Sender Background Worker] Database connection unavailable");
    return;
  }

  // 1. Fetch dependencies
  const smtp = await getSmtpSettings(userId);
  const emailTemp = await getEmailTemplate(userId);
  const certTemplate = await getCertificateTemplate(userId, templateId);

  if (!smtp || !emailTemp || !certTemplate) {
    const errorMsg = !smtp
      ? "SMTP settings not configured"
      : !emailTemp
      ? "Email template not configured"
      : "Certificate template not found";

    console.error(`[Bulk Sender Worker] Aborting: ${errorMsg}`);
    
    // Fail all selected participants immediately
    await db
      .update(participants)
      .set({
        sendStatus: "failed",
        lastError: errorMsg,
      })
      .where(inArray(participants.id, participantIds));
    return;
  }

  // Create NodeMailer transport
  let transporter;
  try {
    transporter = createTransporter(smtp);
  } catch (err: any) {
    await db
      .update(participants)
      .set({
        sendStatus: "failed",
        lastError: `Failed to configure SMTP: ${err.message}`,
      })
      .where(inArray(participants.id, participantIds));
    return;
  }

  // Fetch certificate template image buffer from storage
  let templateBuffer: Buffer;
  try {
    const signedUrl = await storageGetSignedUrl(certTemplate.imageKey);
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    templateBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err: any) {
    console.error("[Bulk Sender Worker] Failed to load template image:", err);
    await db
      .update(participants)
      .set({
        sendStatus: "failed",
        lastError: `Failed to fetch template image: ${err.message}`,
      })
      .where(inArray(participants.id, participantIds));
    return;
  }

  // 2. Process each participant sequentially
  for (const participantId of participantIds) {
    // Fetch participant fresh
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);

    if (!participant) continue;

    try {
      // Increment send attempts
      await db
        .update(participants)
        .set({
          sendAttempts: participant.sendAttempts + 1,
        })
        .where(eq(participants.id, participantId));

      // Generate PDF
      const pdfBuffer = await generateCertificatePDF(
        {
          templateImage: templateBuffer,
          width: certTemplate.width,
          height: certTemplate.height,
          namePosition: {
            x: parseFloat(certTemplate.nameX),
            y: parseFloat(certTemplate.nameY),
            font: certTemplate.nameFont,
            fontSize: certTemplate.nameFontSize,
            color: certTemplate.nameColor,
          },
          eventPosition: {
            x: parseFloat(certTemplate.eventX),
            y: parseFloat(certTemplate.eventY),
            font: certTemplate.eventFont,
            fontSize: certTemplate.eventFontSize,
            color: certTemplate.eventColor,
          },
          collegePosition: certTemplate.collegeX && certTemplate.collegeY ? {
            x: parseFloat(certTemplate.collegeX),
            y: parseFloat(certTemplate.collegeY),
            font: certTemplate.collegeFont,
            fontSize: certTemplate.collegeFontSize,
            color: certTemplate.collegeColor,
          } : undefined,
        },
        participant.name,
        participant.event,
        participant.college || undefined
      );

      // Upload PDF to S3 storage
      const pdfKey = `certificates/${userId}/${Date.now()}-${participant.name.replace(/\s+/g, "_")}.pdf`;
      const { key: hashedPdfKey, url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, "application/pdf");

      // Replace variables in email template
      const templateVars = {
        name: participant.name,
        event: participant.event,
      };
      const customizedSubject = replaceEmailTemplateVariables(emailTemp.subject, templateVars);
      const customizedBody = replaceEmailTemplateVariables(emailTemp.body, templateVars);

      // Write attachment locally/temporarily or pass Buffer path.
      // Since Nodemailer supports raw Buffers for attachments, let's write a small patch for sendEmail or use temp file.
      // Let's check: in server/email.ts, we can modify it to accept buffer, or write pdf locally first.
      // Writing a temp file is standard and simple!
      const tempPdfPath = `./tmp-${participantId}.pdf`;
      fs.writeFileSync(tempPdfPath, pdfBuffer);

      // Send email
      const sendResult = await sendEmail(
        transporter,
        {
          to: participant.email,
          subject: customizedSubject,
          body: customizedBody,
          attachmentPath: tempPdfPath,
          attachmentFilename: `${certTemplate.name.replace(/\s+/g, "_")}_Certificate.pdf`,
        },
        smtp.email,
        smtp.fromName
      );

      // Delete temp PDF
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (e) {
        // Ignore unlink error
      }

      if (sendResult.success) {
        // Update database status
        await db
          .update(participants)
          .set({
            certificateUrl: pdfUrl,
            certificateKey: hashedPdfKey,
            sendStatus: "sent",
            sentAt: new Date(),
            lastError: null,
          })
          .where(eq(participants.id, participantId));

        // Create log
        await createEmailLog({
          userId,
          participantId,
          recipientEmail: participant.email,
          subject: customizedSubject,
          status: "sent",
          sentAt: new Date(),
        });
      } else {
        throw new Error(sendResult.error || "Email failed to send");
      }
    } catch (err: any) {
      console.error(`[Bulk Sender Worker] Error sending to ${participant.email}:`, err);
      // Update database status to failed
      await db
        .update(participants)
        .set({
          sendStatus: "failed",
          lastError: err.message || "Unknown error occurred",
        })
        .where(eq(participants.id, participantId));

      // Create log
      await createEmailLog({
        userId,
        participantId,
        recipientEmail: participant.email,
        subject: emailTemp.subject,
        status: "failed",
        errorMessage: err.message || "Unknown error occurred",
      });
    }
  }
}
