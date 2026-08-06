import nodemailer from 'nodemailer';
import type { SmtpSettings } from '../drizzle/schema';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachmentPath?: string;
  attachmentFilename?: string;
}

/**
 * Create a Nodemailer transporter from SMTP settings
 */
export function createTransporter(smtpSettings: SmtpSettings) {
  return nodemailer.createTransport({
    host: smtpSettings.host,
    port: smtpSettings.port,
    secure: smtpSettings.port === 465, // true for 465, false for 587 and others (which negotiate STARTTLS automatically)
    auth: {
      user: smtpSettings.email,
      pass: smtpSettings.password,
    },
  });
}

/**
 * Send an email with optional attachment
 */
export async function sendEmail(
  transporter: nodemailer.Transporter,
  options: EmailOptions,
  fromEmail: string,
  fromName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailOptions: any = {
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.body,
    };

    // Add attachment if provided
    if (options.attachmentPath) {
      mailOptions.attachments = [
        {
          filename: options.attachmentFilename || 'certificate.pdf',
          path: options.attachmentPath,
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(smtpSettings: SmtpSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(smtpSettings);
    await transporter.verify();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMTP connection test failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Replace template variables in email body
 */
export function replaceEmailTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}
