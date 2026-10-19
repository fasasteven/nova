"use strict"

const DISCUSSION_STORAGE_KEY = "novaDiscussions"
const THEME_STORAGE_KEY = "novaTheme"
const MAX_DISCUSSIONS = 8

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

export function getDiscussions() {
  return readJson(DISCUSSION_STORAGE_KEY, [])
}

export function saveDiscussion(user, assistant) {
  const discussions = getDiscussions()
  discussions.push({ user, assistant, timestamp: Date.now() })
  localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify(discussions.slice(-MAX_DISCUSSIONS)))
}

export function clearDiscussions() {
  localStorage.removeItem(DISCUSSION_STORAGE_KEY)
}

export function getContextualQuery(query) {
  const isFollowUp = /^(?:tell me more|explain that|what about it|and then|continue)$/i.test(query.trim())
  const previousDiscussion = getDiscussions().at(-1)

  return isFollowUp && previousDiscussion ? `${previousDiscussion.user} ${query}` : query
}

export function getCurrentUserName() {
  const users = readJson("UserDetail", [])
  const presentUser = readJson("presentUser", null)

  return (presentUser && presentUser.firstname) || (users[0] && users[0].firstname) || ""
}

export function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || "dark"
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}
