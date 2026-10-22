"use strict"

const http = require("http")
const fs = require("fs")
const path = require("path")
const { URL } = require("url")

const root = __dirname
const port = Number(process.env.PORT) || 8000
const host = process.env.PORT ? "0.0.0.0" : "127.0.0.1"
const MAX_API_BODY_SIZE = 1024 * 1024
const GEMINI_MODEL = "gemini-3.8-flash"

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`)

  if (requestUrl.pathname === "/api/gemini") {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "POST" })
      res.end(JSON.stringify({ error: "Method not allowed" }))
      return
    }

    handleGeminiRequest(req, res)
    return
  }

  let targetPath = decodeURIComponent(requestUrl.pathname)

  if (targetPath === "/") {
    targetPath = "/index.html"
  }

  const safePath = path.normalize(targetPath).replace(/^([.][.][\\/])+/, "")
  const filePath = path.join(root, safePath)

  if (!filePath.startsWith(root)) {
    res.writeHead(403)
    res.end("Forbidden")
    return
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404)
      res.end("Not Found")
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const mime = mimeTypes[ext] || "application/octet-stream"

    res.writeHead(200, {
      "Content-Type": mime,
      "Access-Control-Allow-Origin": "*"
    })

    fs.createReadStream(filePath).pipe(res)
  })
})

async function handleGeminiRequest(req, res) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server" }))
    return
  }

  let body = ""
  try {
    for await (const chunk of req) {
      body += chunk
      if (Buffer.byteLength(body) > MAX_API_BODY_SIZE) {
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ error: "Request body is too large" }))
        return
      }
    }

    const payload = JSON.parse(body)
    const controller = new AbortController()
    req.on("aborted", () => controller.abort())
    res.on("close", () => {
      if (!res.writableEnded) {
        controller.abort()
      }
    })

    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({ ...payload, model: GEMINI_MODEL }),
      signal: controller.signal
    })
    const responseBody = await upstream.text()

    if (!res.destroyed) {
      res.writeHead(upstream.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      })
      res.end(responseBody)
    }
  } catch (error) {
    if (error.name === "AbortError" || res.destroyed) {
      return
    }

    console.error("Gemini proxy error:", error)
    if (!res.headersSent) {
      res.writeHead(error instanceof SyntaxError ? 400 : 502, { "Content-Type": "application/json; charset=utf-8" })
      res.end(JSON.stringify({ error: error instanceof SyntaxError ? "Invalid JSON request" : "Could not contact Gemini" }))
    }
  }
}

server.listen(port, host, () => {
  console.log(`Nova server is running on ${host}:${port}`)
})
