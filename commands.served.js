"use strict"

import { getContextualQuery } from "./storage.js"

const responseVariations = {
  searching: ["Let me find that for you", "Searching now", "Looking that up", "One moment"],
  noAnswer: ["I couldn't find that", "Sorry, I don't know", "No results", "I'm not sure about that"],
  opening: ["Opening", "Launching", "Getting", "Pulling up"]
}

const websites = {
  amazon: "https://www.amazon.com",
  facebook: "https://www.facebook.com",
  github: "https://github.com",
  gmail: "https://mail.google.com",
  google: "https://www.google.com",
  goggle: "https://www.google.com",
  instagram: "https://www.instagram.com",
  ig: "https://www.instagram.com",
  linkedin: "https://www.linkedin.com",
  netflix: "https://www.netflix.com",
  pinterest: "https://www.pinterest.com",
  reddit: "https://www.reddit.com",
  snapchat: "https://www.snapchat.com",
  spotify: "https://open.spotify.com",
  tiktok: "https://www.tiktok.com",
  twitter: "https://x.com",
  whatsapp: "https://web.whatsapp.com",
  wikipedia: "https://www.wikipedia.org",
  x: "https://x.com",
  youtube: "https://www.youtube.com"
}

const intents = {
  sites: { keywords: ["youtube", "google", "facebook"], action: "openSite" },
  weather: { keywords: ["weather", "forecast", "temperature"], action: "getWeather" },
  time: { keywords: ["time", "what time", "current time"], action: "getTime" },
  greeting: { keywords: ["how are you", "how's it going", "what's up"], action: "greet" },
  help: { keywords: ["help", "what can you do", "capabilities"], action: "showHelp" }
}

function getRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function getIntent(command) {
  return Object.values(intents).find((intent) => intent.keywords.some((keyword) => command.includes(keyword)))?.action
}

function getWebsiteUrl(command) {
  const match = command.match(/^(?:open|launch|visit|go to)\s+(.+)$/i)
  if (!match) {
    return null
  }

  const requestedSite = match[1].trim().toLowerCase()
  const normalizedSite = requestedSite.replace(/^the\s+/, "")
  let url = websites[normalizedSite]

  if (!url && /^[a-z0-9-]+(?:\.[a-z]{2,})+$/i.test(normalizedSite)) {
    url = `https://${normalizedSite}`
  }

  if (!url && /^[a-z0-9-]+$/i.test(normalizedSite)) {
    url = `https://www.${normalizedSite}.com`
  }

  return url ? { requestedSite, url } : null
}

async function searchInternet(query, { setStatus, speak }) {
  setStatus(getRandom(responseVariations.searching))

  try {
    const searchQuery = getContextualQuery(query)
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: searchQuery,
      gsrlimit: "1",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      origin: "*"
    })
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)

    if (!response.ok) {
      throw new Error("Wikipedia request failed")
    }

    const data = await response.json()
    const page = Object.values(data?.query?.pages || {})[0]
    const answer = page?.extract?.replace(/\s+/g, " ").trim()

    if (!answer) {
      throw new Error("No answer found")
    }

    setStatus(answer)
    speak(answer)
  } catch (error) {
    console.error("Search error:", error)
    const message = `${getRandom(responseVariations.noAnswer)}. Please check your internet connection or ask another way.`
    setStatus(message)
    speak(message)
  }
}

export function createCommandProcessor({ setStatus, speak, recordConversation }) {
  function openWebsite(command) {
    const website = getWebsiteUrl(command)
    if (!website) {
      return false
    }

    const message = `Opening ${website.requestedSite}`
    setStatus(message)
    recordConversation(command, message)
    window.location.assign(website.url)
    return true
  }

  function processCommand(command) {
    if (openWebsite(command)) {
      return
    }

    const matchedIntent = getIntent(command)

    if (matchedIntent === "openSite") {
      const site = intents.sites.keywords.find((keyword) => command.includes(keyword))
      const message = `${getRandom(responseVariations.opening)} ${site}`

      setStatus(message)
      recordConversation(command, message)
      window.location.assign(websites[site])
      return
    }

    if (matchedIntent === "getWeather") {
      const city = command.replace(/weather|forecast|temperature|in/g, "").trim() || "your area"
      window.open(`https://www.google.com/search?q=weather+${encodeURIComponent(city)}`)
      speak(`Showing weather for ${city}`)
      return
    }

    if (matchedIntent === "getTime") {
      const time = new Date().toLocaleTimeString()
      setStatus(`Time: ${time}`)
      speak(`The current time is ${time}`)
      return
    }

    if (matchedIntent === "greet") {
      speak(getRandom([
        "I'm doing great, thanks for asking!",
        "I'm here and ready to help!",
        "All systems operational!"
      ]))
      return
    }

    if (matchedIntent === "showHelp") {
      speak("I can open websites, tell the time, show weather, or search Wikipedia. Start with hey, hello, or Nova.")
      return
    }

    searchInternet(command, { setStatus, speak })
  }

  return { processCommand }
}
