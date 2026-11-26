import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.PORTFOLIO_HOST || "127.0.0.1";
const port = Number(process.env.PORTFOLIO_PORT || "8080");
const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
};
const allowedPath = /^(?:[\w-]+\.html|css\/[\w-]+\.css|js\/[\w-]+\.js|images\/[\w.-]+\.(?:jpg|svg)|images\/optimized\/[\w.-]+\.webp|videos\/[\w-]+\.mp4|fonts\/[\w-]+\.woff2)$/;

function getRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2])) return null;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    return start <= end ? { start, end } : null;
}

const server = createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
    }

    const path = request.url.split("?", 1)[0].slice(1) || "index.html";
    if (!allowedPath.test(path)) {
        response.writeHead(404).end();
        return;
    }

    const file = fileURLToPath(new URL(path, import.meta.url));
    const info = await lstat(file).catch(() => null);
    if (!info?.isFile()) {
        response.writeHead(404).end();
        return;
    }

    const extension = extname(path);
    const headers = {
        "Content-Type": types[extension],
        "Content-Length": info.size,
        "X-Content-Type-Options": "nosniff",
    };
    if (extension === ".webp") headers["Cache-Control"] = "public, max-age=3600";
    let range;
    if (extension === ".mp4") {
        headers["Accept-Ranges"] = "bytes";
        if (request.headers.range) {
            range = getRange(request.headers.range, info.size);
            if (!range) {
                response.writeHead(416, { "Content-Range": "bytes */" + info.size }).end();
                return;
            }
            headers["Content-Length"] = range.end - range.start + 1;
            headers["Content-Range"] = "bytes " + range.start + "-" + range.end + "/" + info.size;
        }
    }

    response.writeHead(range ? 206 : 200, headers);
    if (request.method === "HEAD") {
        response.end();
        return;
    }

    const stream = createReadStream(file, range);
    response.once("close", () => stream.destroy());
    stream.on("error", () => response.destroy());
    stream.pipe(response);
});

server.listen(port, host, () => {
    console.log("Portfolio: http://" + host + ":" + server.address().port + "/");
});
