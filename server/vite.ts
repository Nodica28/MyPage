import express, {type Express} from "express";
import fs from "fs";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
import {createServer as createViteServer, createLogger} from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import {type Server} from "http";
import viteConfig from "../vite.config";
import {nanoid} from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function escapeHtml(input: string): string {
  return String(input).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {server},
    allowedHosts: true as true
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      let page = await vite.transformIndexHtml(url, template);

      // Inject OG/Twitter meta for public profile paths in dev
      try {
        const pathOnly = req.path.split("?")[0];
        const isReserved = [
          "/",
          "/auth",
          "/logout",
          "/register",
          "/start",
          "/join-company",
          "/settings",
          "/headshots",
          "/headshot-generator",
          "/badge-profile",
          "/brand-assets",
          "/leads",
          "/support"
        ].some((p) => pathOnly === p || pathOnly.startsWith(p + "/"));
        const looksLikeStatic =
          pathOnly.includes(".") ||
          pathOnly.startsWith("/assets/") ||
          pathOnly.startsWith("/uploads/") ||
          pathOnly.startsWith("/icons/") ||
          pathOnly.startsWith("/public/") ||
          pathOnly.startsWith("/start-images/") ||
          pathOnly.startsWith("/backgrounds/") ||
          pathOnly.startsWith("/placeholder/");
        const isApi = pathOnly.startsWith("/api/");

        if (!isReserved && !looksLikeStatic && !isApi) {
          const publicPath = pathOnly.replace(/^\//, "");
          const fetchFn = (globalThis as any).fetch as (
            input: any,
            init?: any
          ) => Promise<any>;
          const apiUrl = `${req.protocol}://${req.get("host")}/api/users/badge-profile/${publicPath}`;
          const resp = await fetchFn(apiUrl);
          if (resp && resp.ok) {
            const data: any = await resp.json();
            const user = data?.userProfile || {};
            const org = data?.organization || null;
            const fullName = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ");
            const title = user.title
              ? `${fullName} — ${user.title}`
              : fullName || "Badge Profile";
            const description =
              user.bio ||
              (org?.name
                ? `Connect with ${fullName} at ${org.name}.`
                : "Connect with me on my Badge profile.");
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const imageUrl = user.profileImage
              ? user.profileImage.startsWith("http")
                ? user.profileImage
                : `${baseUrl}${user.profileImage}`
              : `${baseUrl}/placeholder/placeholder-avatar.jpg`;
            const canonical = `${baseUrl}/${user.publicPath || publicPath}`;

            const ogTags = `
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Badge" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
            `;

            page = page.replace("</head>", `${ogTags}\n</head>`);
          }
        }
      } catch {
        // no-op in dev
      }

      res.status(200).set({"Content-Type": "text/html"}).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
