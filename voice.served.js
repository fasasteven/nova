"use strict"

const MAX_ERRORS = 3

export function createVoiceAssistant({ speakBtn, status, orb, setStatus, getUserName, onCommand, onStopCommand, recordConversation }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = SpeechRecognition ? new SpeechRecognition() : null
  let assistantBusy = false
  let activeUserMessage = null
  let listeningActive = false
  let assistantEnabled = false
  let recognitionErrorCount = 0
  let listeningRestartTimer = null

  if (recognition) {
    recognition.lang = "en-US"
    recognition.continuous = true
    recognition.interimResults = false
  }

  function startListening() {
    if (!recognition || !assistantEnabled || assistantBusy || listeningActive) {
      return
    }

    try {
      recognition.start()
    } catch (error) {
      console.error("Could not start speech recognition:", error)
      if (error.name === "InvalidStateError") {
        setStatus("Nova is already listening. Please wait a moment.")
        return
      }
      setStatus("Nova could not start listening. Please wait a moment and try again.")
    }
  }

  function scheduleListeningRestart() {
    if (!assistantEnabled || assistantBusy) {
      return
    }

    clearTimeout(listeningRestartTimer)
    listeningRestartTimer = setTimeout(() => {
      listeningRestartTimer = null
      startListening()
    }, 250)
  }

  function handleVoiceInterruption(transcript) {
    const command = transcript.replace(/^(?:hey|hello|nova)\s+/i, "").trim()

    if (/^(?:stop|stop talking|be quiet|quiet)$/.test(command)) {
      onStopCommand?.()
      speechSynthesis.cancel()
      assistantBusy = false
      activeUserMessage = null
      setStatus("Response stopped. I'm listening.")
      return true
    }

    return false
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus("Speech audio is not supported in this browser, but Nova can still show responses here.")
      if (activeUserMessage) {
        recordConversation(activeUserMessage, text)
        activeUserMessage = null
      }
      return
    }

    if (activeUserMessage) {
      recordConversation(activeUserMessage, text)
      activeUserMessage = null
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-US"
    utterance.rate = 1
    utterance.pitch = 1
    const voices = speechSynthesis.getVoices()
    const englishVoices = voices.filter((voice) => /^en(?:-|_)/i.test(voice.lang))
    const naturalVoice = englishVoices.find((voice) =>
      /natural|neural|premium|aria|jenny|samantha|ava|zira|google us english|microsoft.*online/i.test(voice.name)
    )
    utterance.voice = naturalVoice || englishVoices.find((voice) => /^en-US$/i.test(voice.lang)) || englishVoices[0] || null
    orb.classList.add("speaking")
    assistantBusy = true

    utterance.onstart = () => {
      assistantBusy = true
    }

    utterance.onend = () => {
      orb.classList.remove("speaking")
      assistantBusy = false
      scheduleListeningRestart()
    }

    utterance.onerror = () => {
      orb.classList.remove("speaking")
      assistantBusy = false
      setStatus("Nova could not play the voice response, but the answer is saved in chat history.")
      scheduleListeningRestart()
    }

    speechSynthesis.speak(utterance)
  }

  if (recognition) {
    recognition.onstart = () => {
      setStatus("Listening...")
      orb.classList.add("listening")
      listeningActive = true
      recognitionErrorCount = 0
    }

    recognition.onend = () => {
      orb.classList.remove("listening")
      listeningActive = false

      if (assistantEnabled && !assistantBusy) {
        scheduleListeningRestart()
      }
    }

    recognition.onresult = (event) => {
      let result
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) {
          result = event.results[index][0]
        }
      }

      if (!result) {
        return
      }

      const transcript = result.transcript.trim().toLowerCase()
      const confidence = Number.isFinite(result.confidence) ? result.confidence : null

      if (!transcript) {
        setStatus("I couldn't hear that. Please try again.")
        return
      }

      if (handleVoiceInterruption(transcript)) {
        return
      }

      if (assistantBusy) {
        return
      }

      setStatus(`You said: "${transcript}"${confidence === null ? "" : ` (${Math.round(confidence * 100)}%)`}`)

      const wakeWordMatch = transcript.match(/^(?:(?:hello|hey)(?:\s+nova)?|nova)\b\s*/i)
      const wakeWordDetected = Boolean(wakeWordMatch)
      const cleanedTranscript = wakeWordMatch ? transcript.slice(wakeWordMatch[0].length).trim() : ""
      const command = wakeWordDetected ? cleanedTranscript : transcript
      const includedGreeting = wakeWordDetected && Boolean(cleanedTranscript) && /^(?:hello|hey)\b/i.test(transcript)

      if (wakeWordDetected && !cleanedTranscript) {
        const name = getUserName()
        const greeting = name ? `Hey ${name}, how may I help?` : "Hey, how may I help?"
        recordConversation(transcript, greeting)
        speak(greeting)
        return
      }

      if (/^(?:end|end session|goodbye|exit|shut down)$/i.test(command)) {
        const message = "Nova will keep listening until you close this tab."
        activeUserMessage = command
        setStatus(message)
        speak(message)
        return
      }

      activeUserMessage = command
      onCommand(command, { includedGreeting })
    }

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error)

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        assistantEnabled = false
        speakBtn.textContent = "Speak with AI"
        speakBtn.setAttribute("aria-pressed", "false")
        setStatus("Microphone access is blocked. Allow it in your browser settings, then start Nova again.")
        return
      }

      if (event.error === "no-speech") {
        setStatus("I did not hear anything. Try speaking a little closer to the microphone.")
        return
      }

      recognitionErrorCount++
      setStatus("Nova had trouble listening. Please try again.")

      if (recognitionErrorCount >= MAX_ERRORS) {
        speak("I'm having trouble hearing you. Please check your microphone and try again.")
        recognitionErrorCount = 0
      }
    }
  }

  speakBtn.addEventListener("click", () => {
    if (!recognition) {
      setStatus("Speech recognition is not supported here. Please use Chrome or Edge over HTTPS or localhost.")
      return
    }

    if (listeningActive) {
      setStatus("Nova is already listening. Ask your next question whenever you're ready.")
      return
    }

    if (assistantEnabled) {
      startListening()
      setStatus("Nova is listening. Ask your next question whenever you're ready.")
      return
    }

    assistantEnabled = true
    speakBtn.textContent = "Nova is listening"
    speakBtn.setAttribute("aria-pressed", "true")
    startListening()
    setStatus("Voice assistant started. Ask your question now, and Nova will keep listening between replies.")
  })

  return { speak }
}
