"use strict"

const speakBtn = document.getElementById("speakBtn")
const status = document.getElementById("status")
const orb = document.getElementById("orb")

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = new SpeechRecognition()

recognition.lang = "en-US"
recognition.continuous = true
recognition.interimResults = false

recognition.onstart = () => {
  status.innerText = "Listening..."
  orb.classList.add("listening")
}

recognition.onend = () => orb.classList.remove("listening")

recognition.onresult = (event) => {
  const speech = event.results[event.results.length - 1][0].transcript.toLowerCase()
  status.innerText = "You said: " + speech
  
  if (speech.includes("nova")) {
    speak("Yes, how can I help you")
    return
  }
  processCommand(speech)
}

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text)
  speech.lang = "en-US"
  orb.classList.add("speaking")
  speech.onend = () => orb.classList.remove("speaking")
  speechSynthesis.speak(speech)
}

function processCommand(cmd) {
  const sites = { youtube: "https://youtube.com", google: "https://google.com", facebook: "https://facebook.com" }
  
  for (let [key, url] of Object.entries(sites)) {
    if (cmd.includes(key)) {
      window.open(url, "_blank")
      speak(`Opening ${key.charAt(0).toUpperCase() + key.slice(1)}`)
      return
    }
  }
  
  if (cmd.includes("weather")) {
    const city = cmd.replace("weather in", "").trim()
    window.open(`https://www.google.com/search?q=weather+${city}`)
    speak("Showing weather for " + city)
    return
  }
  
  if (cmd.includes("time")) {
    const time = new Date().toLocaleTimeString()
    speak("The time is " + time)
    status.innerText = "Time: " + time
    return
  }
  
  searchInternet(cmd)
}

async function searchInternet(query) {
  status.innerText = "Searching..."
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json`)
    const data = await res.json()
    const answer = data.AbstractText || "I couldn't find an answer"
    status.innerText = answer
    speak(answer)
  } catch {
    status.innerText = "Search error"
  }
}

speakBtn.onclick = () => {
  recognition.start()
  status.innerText = "Voice assistant started"
}