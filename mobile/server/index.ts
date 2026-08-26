import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const securityHeaders = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=(), clipboard-read=()",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    Object.entries(securityHeaders).forEach(([name, value]) => res.setHeader(name, value));
    next();
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath, { setHeaders: (res, filePath) => res.setHeader("Cache-Control", path.basename(filePath) === "index.html" ? "no-store" : "public, max-age=31536000, immutable") }));

  // Handle client-side routing - serve index.html for all routes
  app.get("/{*splat}", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
