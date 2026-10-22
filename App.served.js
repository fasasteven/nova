"use strict"

import { createCommandProcessor } from "./commands.served.js"
import { getCurrentUserName, saveDiscussion } from "./storage.js"
import { renderDiscussions, setStatus, setupHistoryControls, setupThemeToggle } from "./ui.served.js"
import { createVoiceAssistant } from "./voice.served.js"

const elements = {
  speakBtn: document.getElementById("speakBtn"),
  status: document.getElementById("status"),
  orb: document.getElementById("orb"),
  history: document.getElementById("chatHistory"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  themeToggle: document.getElementById("themeToggle")
}

function updateStatus(message) {
  setStatus(elements.status, message)
}

function recordConversation(user, assistant) {
  saveDiscussion(user, assistant)
  renderDiscussions(elements.history)
}

setupThemeToggle(elements.themeToggle)
setupHistoryControls({
  historyElement: elements.history,
  clearHistoryBtn: elements.clearHistoryBtn
})

let commandProcessor

const voiceAssistant = createVoiceAssistant({
  speakBtn: elements.speakBtn,
  status: elements.status,
  orb: elements.orb,
  setStatus: updateStatus,
  getUserName: getCurrentUserName,
  onCommand: (command, options) => commandProcessor.processCommand(command, options),
  onStopCommand: () => commandProcessor.cancelCurrentCommand(),
  recordConversation
})

commandProcessor = createCommandProcessor({
  setStatus: updateStatus,
  speak: voiceAssistant.speak,
  recordConversation
})
