"use strict"

import { getDiscussions } from "./storage.js"

const responseVariations = {
  thinking: ["Let me think about that", "One moment", "Let me help with that"],
  opening: ["Opening", "Launching", "Getting", "Pulling up"]
}

const MAX_GEMINI_RETRIES = 2

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

function getDuckDuckGoQuery(query) {
  const isFollowUp = /^(?:tell me more|explain that|what about it|and then|continue)$/i.test(query.trim())
  const previousDiscussion = getDiscussions().at(-1)

  return isFollowUp && previousDiscussion ? `${previousDiscussion.user} ${query}` : query
}

function getGeminiInput(query) {
  const isFollowUp = /^(?:tell me more|explain that|what about it|and then|continue)$/i.test(query.trim())
  if (!isFollowUp) {
    return query
  }

  const previousDiscussion = getDiscussions().at(-1)
  return previousDiscussion
    ? `Previous question: ${String(previousDiscussion.user).slice(0, 1000)}\nPrevious answer: ${String(previousDiscussion.assistant).slice(0, 1000)}\nFollow-up: ${query}`
    : query
}

function getWikipediaSearchQuery(query) {
  if (/\bjesus\b/i.test(query) && /\b(?:born|birth|birthday|nativity)\b/i.test(query)) {
    return '"date of the birth of Jesus"'
  }

  return getDuckDuckGoQuery(query)
}

function selectRelevantWikipediaPage(pages, query) {
  const stopWords = new Set(["a", "an", "and", "are", "at", "did", "do", "does", "for", "how", "in", "is", "it", "of", "the", "to", "was", "were", "what", "when", "who", "why", "year"])
  const queryTerms = getWikipediaSearchQuery(query)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term))
    .map((term) => term === "born" ? "birth" : term)
  const candidates = Object.values(pages || {})
    .map((page) => {
      const title = page.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
      const matches = queryTerms.filter((term) => title.includes(term)).length
      return { page, score: queryTerms.length ? matches / queryTerms.length : 0 }
    })
    .sort((left, right) => right.score - left.score)

  return candidates.find((candidate) => candidate.score >= 0.5)?.page
}

function getDuckDuckGoAnswer(data) {
  const relatedTopics = (data.RelatedTopics || [])
    .flatMap((topic) => topic.Topics || [topic])
    .map((topic) => topic.Text)
    .find(Boolean)
  const answer = data.Answer || data.AbstractText || data.Definition || relatedTopics

  if (!answer) {
    return ""
  }

  return answer.match(/[^.!?]+[.!?]?/g)?.slice(0, 2).join(" ").replace(/\s+/g, " ").trim() || answer.trim()
}

function getGreeting(command) {
  const match = command.trim().match(/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up)\b[,.!?;:\s]*(.*)$/i)
  if (!match) {
    return { greeting: "", question: command }
  }

  const phrase = match[1].toLowerCase()
  const question = match[2].trim()
  const greeting = /^(?:how are you|how's it going|what's up)$/.test(phrase)
    ? "I'm doing well, thanks for asking!"
    : phrase.startsWith("good ")
      ? `${phrase[0].toUpperCase()}${phrase.slice(1)}!`
      : "Hi!"

  return { greeting, question }
}

function getLocalAnswer(query) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()

  if (/\b(?:who is|who was)\s+(?:the\s+)?father of (?:the\s+)?computers?\b|\bfather of (?:the\s+)?computers?\b/.test(normalized)) {
    return "Charles Babbage is widely called the father of the computer for designing the Analytical Engine, an early programmable computing machine."
  }

  if (/\b(?:mom|mother|mum|mummy)\b/.test(normalized) && /\b(?:money|cash)\b/.test(normalized) && /\b(?:ask|asking|request|borrow)\b/.test(normalized)) {
    return "You could say: “Mom, could I borrow [amount] for [reason]? I can repay you by [date].” Or ask if you can earn it by helping with a chore. Be honest and respectful, and accept her answer."
  }

  return ""
}

function waitBeforeRetry(signal, delay) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"))
      return
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort)
      resolve()
    }, delay)
    const handleAbort = () => {
      clearTimeout(timeout)
      reject(new DOMException("The operation was aborted", "AbortError"))
    }
    signal.addEventListener("abort", handleAbort, { once: true })
  })
}

async function askDuckDuckGo(query, { setStatus, speak, signal }) {
  setStatus("Finding an answer...")

  try {
    const params = new URLSearchParams({
      q: getDuckDuckGoQuery(query),
      format: "json",
      no_html: "1",
      skip_disambig: "1"
    })
    const response = await fetch(`https://api.duckduckgo.com/?${params}`, { signal })

    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status ${response.status}`)
    }

    const data = await response.json()
    if (signal.aborted) {
      return
    }
    const answer = getDuckDuckGoAnswer(data)

    if (answer) {
      setStatus(answer)
      speak(answer)
      return
    }

  } catch (error) {
    if (error.name === "AbortError") {
      return
    }
    console.error("DuckDuckGo fallback error:", error)
  }

  if (signal.aborted) {
    return
  }

  return askWikipedia(query, { setStatus, speak, signal })
}

async function askWikipedia(query, { setStatus, speak, signal }) {
  setStatus("Finding an answer...")

  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: getWikipediaSearchQuery(query),
      gsrlimit: "5",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      origin: "*"
    })
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal })

    if (!response.ok) {
      throw new Error(`Wikipedia request failed with status ${response.status}`)
    }

    const data = await response.json()
    if (signal.aborted) {
      return
    }
    const page = selectRelevantWikipediaPage(data?.query?.pages, query)
    const answer = page?.extract?.replace(/\s+/g, " ").trim()

    if (!answer) {
      throw new Error("Wikipedia returned no clearly relevant article")
    }

    setStatus(answer)
    speak(answer)
  } catch (error) {
    if (error.name === "AbortError") {
      return
    }
    console.error("Wikipedia fallback error:", error)
    const message = "I couldn't find a reliable answer right now. Please check your internet connection or try rephrasing the question."
    setStatus(message)
    speak(message)
  }
}

async function askGemini(query, { setStatus, speak, signal }) {
  setStatus(getRandom(responseVariations.thinking))
  const input = getGeminiInput(query)

  try {
    const payload = {
      system_instruction: "You are Nova, a warm, thoughtful, friendly voice assistant. Respond naturally and conversationally, like a helpful friend. Answer the user's question directly in no more than three short sentences. Keep simple facts especially concise. Use recent conversation context for follow-up questions. Be honest when uncertain or when information may be out of date; do not invent live facts or claim you searched the web. Ask at most one brief follow-up question when it would help.",
      input,
      store: false,
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 220,
        thinking_level: "low"
      }
    }
    let data

    for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt++) {
      let response
      try {
        response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal
        })
        data = await response.json()
      } catch (error) {
        if (error.name === "AbortError" || signal.aborted) {
          return
        }
        if (attempt === MAX_GEMINI_RETRIES) {
          throw error
        }
        setStatus("One moment...")
        await waitBeforeRetry(signal, 700 * (attempt + 1))
        continue
      }

      if (signal.aborted) {
        return
      }
      if (response.ok) {
        break
      }

      const apiMessage = data?.error?.message || data?.error
      const error = new Error(`Gemini API ${response.status}: ${apiMessage || "request failed"}`)
      if (response.status < 500 || attempt === MAX_GEMINI_RETRIES) {
        throw error
      }

      setStatus("One moment...")
      await waitBeforeRetry(signal, 700 * (attempt + 1))
    }

    if (!data || signal.aborted) {
      return
    }

    const outputStep = [...(data?.steps || [])].reverse().find((step) => step.type === "model_output")
    const answer = (outputStep?.content || [])
      .map((part) => part.text)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    if (!answer) {
      throw new Error("Gemini returned no text answer")
    }

    setStatus(answer)
    speak(answer)
  } catch (error) {
    if (error.name === "AbortError") {
      return
    }
    console.error("Gemini request error:", error)
    return askDuckDuckGo(query, { setStatus, speak, signal })
  }
}

export function createCommandProcessor({ setStatus, speak, recordConversation }) {
  let activeRequestController = null

  function cancelCurrentCommand() {
    activeRequestController?.abort()
    activeRequestController = null
  }

  function openWebsite(command, greeting) {
    const website = getWebsiteUrl(command)
    if (!website) {
      return false
    }

    const message = `${greeting ? `${greeting} ` : ""}Opening ${website.requestedSite}`
    setStatus(message)
    recordConversation(command, message)
    window.location.assign(website.url)
    return true
  }

  function processCommand(command, { includedGreeting = false } = {}) {
    const parsedGreeting = getGreeting(command)
    const greeting = includedGreeting ? "Hi!" : parsedGreeting.greeting
    const cleanedCommand = parsedGreeting.greeting ? parsedGreeting.question : command.trim()

    if (!cleanedCommand) {
      speak(greeting || "Hi! How can I help?")
      return
    }

    const respond = (message) => speak(greeting ? `${greeting} ${message}` : message)

    if (openWebsite(cleanedCommand, greeting)) {
      return
    }

    const matchedIntent = getIntent(cleanedCommand)

    if (matchedIntent === "openSite") {
      const site = intents.sites.keywords.find((keyword) => cleanedCommand.includes(keyword))
      const message = `${greeting ? `${greeting} ` : ""}${getRandom(responseVariations.opening)} ${site}`

      setStatus(message)
      recordConversation(cleanedCommand, message)
      window.location.assign(websites[site])
      return
    }

    if (matchedIntent === "getWeather") {
      const city = cleanedCommand.replace(/weather|forecast|temperature|in/g, "").trim() || "your area"
      window.open(`https://www.google.com/search?q=weather+${encodeURIComponent(city)}`)
      respond(`Showing weather for ${city}`)
      return
    }

    if (matchedIntent === "getTime") {
      const time = new Date().toLocaleTimeString()
      setStatus(`Time: ${time}`)
      respond(`The current time is ${time}`)
      return
    }

    if (matchedIntent === "greet") {
      respond(getRandom([
        "I'm doing great, thanks for asking!",
        "I'm here and ready to help!",
        "All systems operational!"
      ]))
      return
    }

    if (matchedIntent === "showHelp") {
      respond("I can open websites, tell the time, show weather, and answer questions. Ask directly, or start with hey, hello, or Nova.")
      return
    }

    const localAnswer = getLocalAnswer(cleanedCommand)
    if (localAnswer) {
      cancelCurrentCommand()
      const message = `${greeting ? `${greeting} ` : ""}${localAnswer}`
      setStatus(message)
      recordConversation(command, message)
      speak(message)
      return
    }

    cancelCurrentCommand()
    const controller = new AbortController()
    activeRequestController = controller

    return askGemini(cleanedCommand, { setStatus, speak: respond, signal: controller.signal })
      .finally(() => {
        if (activeRequestController === controller) {
          activeRequestController = null
        }
      })
  }

  return { processCommand, cancelCurrentCommand }
}
