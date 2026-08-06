import { createCanvas, loadImage } from 'canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface TextPosition {
  x: number;
  y: number;
  font: string;
  fontSize: number;
  color: string;
}

export interface CertificateConfig {
  templateImage: string | Buffer;
  width: number;
  height: number;
  namePosition: TextPosition;
  eventPosition: TextPosition;
}

/**
 * Generate a personalized certificate as a PDF
 */
export async function generateCertificatePDF(
  config: CertificateConfig,
  participantName: string,
  eventName: string
): Promise<Buffer> {
  try {
    // Load the template image (accepts local path or Buffer in-memory)
    const image = await loadImage(config.templateImage);
    
    // Create a canvas with the same dimensions as the template
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the template image
    ctx.drawImage(image, 0, 0, config.width, config.height);
    
    // Draw participant name
    ctx.font = `${config.namePosition.fontSize}px ${config.namePosition.font}`;
    ctx.fillStyle = config.namePosition.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(participantName, config.namePosition.x, config.namePosition.y);
    
    // Draw event name
    ctx.font = `${config.eventPosition.fontSize}px ${config.eventPosition.font}`;
    ctx.fillStyle = config.eventPosition.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(eventName, config.eventPosition.x, config.eventPosition.y);
    
    // Convert canvas to image buffer
    const imageBuffer = canvas.toBuffer('image/png');
    
    // Create PDF with the image
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([config.width, config.height]);
    
    // Embed the image in the PDF
    const pdfImage = await pdfDoc.embedPng(imageBuffer);
    page.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
    });
    
    // Save PDF to buffer
    const pdfBuffer = await pdfDoc.save();
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    throw error;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 800,
      height: metadata.height || 600,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    throw error;
  }
}

/**
 * Validate and convert hex color to RGB
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Parse CSV file and extract participant data
 */
export async function parseParticipantCSV(csvContent: string): Promise<Array<{ name: string; email: string; event: string }>> {
  const { parse } = await import('csv-parse/sync');
  
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Validate required columns
    const participants = records.map((record: any) => ({
      name: record.Name || record.name || '',
      email: record.Email || record.email || '',
      event: record.Event || record.event || '',
    }));
    
    return participants.filter(p => p.name && p.email && p.event);
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
