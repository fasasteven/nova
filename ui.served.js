"use strict"

import { clearDiscussions, getDiscussions, getSavedTheme, saveTheme } from "./storage.js"

export function setStatus(statusElement, message) {
  statusElement.innerText = message
}

export function renderDiscussions(historyElement) {
  const discussions = getDiscussions()

  if (!discussions.length) {
    historyElement.innerHTML = `<p class="empty-history">No chats yet</p>`
    return
  }

  historyElement.innerHTML = discussions
    .map((discussion) => `
      <article class="chat-item">
        <p class="chat-line user"><span>You</span>${discussion.user}</p>
        <p class="chat-line assistant"><span>Nova</span>${discussion.assistant}</p>
      </article>
    `)
    .join("")

  historyElement.scrollTop = historyElement.scrollHeight
}

export function setupHistoryControls({ historyElement, clearHistoryBtn }) {
  renderDiscussions(historyElement)

  clearHistoryBtn.addEventListener("click", () => {
    clearDiscussions()
    renderDiscussions(historyElement)
  })
}

export function setupThemeToggle(toggleButton) {
  const applyTheme = (theme) => {
    document.body.dataset.theme = theme
    toggleButton.innerText = theme === "dark" ? "Light mode" : "Dark mode"
    saveTheme(theme)
  }

  applyTheme(getSavedTheme())

  toggleButton.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark"
    applyTheme(nextTheme)
  })
}
