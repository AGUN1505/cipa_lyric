import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);

  // API endpoint for timeline editor saving directly to js/lyrics.js
  if (req.method === "PUT" && pathname === "/__timeline") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!data.lyrics || !Array.isArray(data.lyrics)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid payload: missing lyrics array" }));
        }

        const lyricsPath = path.join(__dirname, "js", "lyrics.js");
        if (!fs.existsSync(lyricsPath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "lyrics.js not found" }));
        }

        let content = fs.readFileSync(lyricsPath, "utf-8");
        const lines = content.split("\n");
        let updatedCount = 0;

        const byId = new Map(data.lyrics.map((l) => [l.id, l]));

        const newLines = lines.map((line) => {
          const match = line.match(/^(\s*\{\s*id:\s*)(\d+),/);
          if (match) {
            const id = parseInt(match[2], 10);
            const item = byId.get(id);
            if (item) {
              updatedCount++;
              const startStr = item.start == null ? "null" : Number(item.start).toFixed(2);
              const endStr = item.end == null ? "null" : Number(item.end).toFixed(2);
              const confStr = item.confidence == null ? "null" : Number(item.confidence).toFixed(2);
              const verStr = item.verified ? "true" : "false";

              let updated = line;
              updated = updated.replace(/start:\s*[^,]+,/, `start: ${startStr},`);
              updated = updated.replace(/end:\s*[^,]+,/, `end: ${endStr},`);
              updated = updated.replace(/confidence:\s*[^,]+,/, `confidence: ${confStr},`);
              updated = updated.replace(/verified:\s*(true|false)/, `verified: ${verStr}`);
              return updated;
            }
          }
          if (data.duration && line.includes("duration:")) {
            return line.replace(/duration:\s*[^,]+,/, `duration: ${Number(data.duration).toFixed(3)},`);
          }
          return line;
        });

        fs.writeFileSync(lyricsPath, newLines.join("\n"), "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, updated: updatedCount }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle static files
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.join(__dirname, pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const range = req.headers.range;

    // Handle Byte-Range requests (crucial for MP3 audio seek and smooth playback)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, {
          "Content-Range": `bytes */${stats.size}`,
        });
        return res.end();
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Bleachers Visualizer Server running at http://localhost:${PORT}`);
});
