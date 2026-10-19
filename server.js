"use strict"

const http = require("http")
const fs = require("fs")
const path = require("path")
const { URL } = require("url")

const root = __dirname
const port = 8000

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

server.listen(port, () => {
  console.log(`Nova static app server is running at http://127.0.0.1:${port}`)
})
