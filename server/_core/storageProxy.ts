import type { Express } from "express";
import { ENV } from "./env";
import fs from "fs";
import path from "path";

export function registerStorageProxy(app: Express) {
  // Ensure the local storage directory exists
  const STORAGE_DIR = path.resolve("./storage");
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

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
    const downloadUrl = `${protocol}://${host}/v1/storage/files/${filePath}`;
    res.json({ url: downloadUrl });
  });

  // 4. Serve Static Uploaded Files
  app.get("/v1/storage/files/*", (req, res) => {
    const relPath = (req.params as Record<string, string>)[0];
    const dest = path.join(STORAGE_DIR, relPath);

    if (!dest.startsWith(STORAGE_DIR)) {
      res.status(403).send("Forbidden path");
      return;
    }

    if (fs.existsSync(dest)) {
      res.sendFile(dest);
    } else {
      res.status(404).send("File not found");
    }
  });

  // 5. Proxy download /manus-storage/* route
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // If using the local mock server
    if (ENV.forgeApiUrl.includes("localhost") || ENV.forgeApiUrl.includes("127.0.0.1") || !ENV.forgeApiKey) {
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      res.redirect(307, `${protocol}://${host}/v1/storage/files/${key}`);
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
