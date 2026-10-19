"use strict"

const fs = require("fs")

const voice = fs.readFileSync("voice.js", "utf8")
const css = fs.readFileSync("style.css", "utf8")
const app = fs.readFileSync("App.js", "utf8")

function expect(cond, label) {
  if (!cond) {
    console.error("FAILED:", label)
    process.exitCode = 1
  }
}

expect(voice.includes('recognition.continuous = false'), "voice recognition should be one-shot instead of continuous")
expect(!voice.includes('if (assistantEnabled && !assistantBusy) {\n        setTimeout(startListening, 500)'), "voice onend should not auto-restart the recognizer loop")
expect(css.includes('body[data-theme="light"]'), "light theme CSS selector should exist")
expect(app.includes('setupThemeToggle'), "theme setup should initialize from the page")

console.log("verify ok")
