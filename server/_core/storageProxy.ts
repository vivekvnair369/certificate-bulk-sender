import type { Express } from "express";
import { ENV } from "./env";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export function registerStorageProxy(app: Express) {
  // Ensure the local storage directory exists
  const STORAGE_DIR = process.env.VERCEL ? "/tmp/storage" : path.resolve("./storage");
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Enable CORS for local storage and proxy endpoints
  app.use("/manus-storage", (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use("/v1/storage", (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // 1. Mock Presigned PUT URL Generator
  app.get("/v1/storage/presign/put", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).send("Missing path query parameter");
      return;
    }
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const uploadUrl = `${protocol}://${host}/v1/storage/upload?path=${encodeURIComponent(filePath)}`;
    res.json({ url: uploadUrl });
  });

  // 2. Mock File Upload Handler (receives PUT request with raw binary body)
  app.put("/v1/storage/upload", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).send("Missing path query parameter");
      return;
    }

    const dest = path.join(STORAGE_DIR, filePath);
    const destDir = path.dirname(dest);
    
    // Safety check to prevent directory traversal
    if (!dest.startsWith(STORAGE_DIR)) {
      res.status(403).send("Forbidden path");
      return;
    }

    try {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(dest);
      req.pipe(writeStream);

      req.on("end", () => {
        res.status(200).send("Uploaded successfully");
      });

      req.on("error", (err) => {
        console.error("[MockStorage] Upload stream error:", err);
        res.status(500).send("Upload stream error");
      });
    } catch (err) {
      console.error("[MockStorage] Upload write error:", err);
      res.status(500).send("Upload write error");
    }
  });

  // 3. Mock Presigned GET URL Generator
  app.get("/v1/storage/presign/get", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).send("Missing path query parameter");
      return;
    }
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const encodedPath = filePath
      .split("/")
      .map(segment => encodeURIComponent(segment))
      .join("/");
    const downloadUrl = `${protocol}://${host}/v1/storage/files/${encodedPath}`;
    res.json({ url: downloadUrl });
  });

  // 4. Serve Static Uploaded Files
  app.get("/v1/storage/files/*", (req, res) => {
    const relPath = (req.params as Record<string, string>)[0];
    const dest = path.join(STORAGE_DIR, relPath);
    console.log(`[StorageProxy] GET files. Path: ${relPath}, Resolved Dest: ${dest}`);

    if (!dest.startsWith(STORAGE_DIR)) {
      console.warn(`[StorageProxy] GET files Forbidden: path traversal attempted`);
      res.status(403).send("Forbidden path");
      return;
    }

    if (fs.existsSync(dest)) {
      console.log(`[StorageProxy] GET files Found, sending file.`);
      res.sendFile(dest);
    } else {
      console.warn(`[StorageProxy] GET files Not Found: ${dest}`);
      res.status(404).send("File not found");
    }
  });

  // 5. Proxy download /manus-storage/* route
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    console.log(`[StorageProxy] GET manus-storage key: ${key}`);
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // If using the local mock server, serve files directly
    if (ENV.forgeApiUrl.includes("localhost") || ENV.forgeApiUrl.includes("127.0.0.1") || !ENV.forgeApiKey) {
      const dest = path.join(STORAGE_DIR, key);
      console.log(`[StorageProxy] Local mock serving manus-storage file directly from: ${dest}`);

      if (!dest.startsWith(STORAGE_DIR)) {
        console.warn(`[StorageProxy] Path traversal prevented on manus-storage`);
        res.status(403).send("Forbidden path");
        return;
      }

      if (fs.existsSync(dest)) {
        res.sendFile(dest);
      } else {
        console.warn(`[StorageProxy] manus-storage File not found: ${dest}`);
        res.status(404).send("File not found");
      }
      return;
    }

    // Original Forge API signed URL redirect logic as fallback
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
