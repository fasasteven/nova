"use strict"

const MAX_ERRORS = 3

export function createVoiceAssistant({ speakBtn, status, orb, setStatus, getUserName, onCommand, recordConversation }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = SpeechRecognition ? new SpeechRecognition() : null
  let waitingForCommand = false
  let assistantBusy = false
  let activeUserMessage = null
  let listeningActive = false
  let assistantEnabled = false
  let recognitionErrorCount = 0

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

  function handleVoiceInterruption(transcript) {
    const command = transcript.replace(/^(?:hey|hello|nova)\s+/i, "").trim()

    if (/^(?:stop|stop talking|be quiet|quiet)$/.test(command)) {
      speechSynthesis.cancel()
      assistantBusy = false
      waitingForCommand = false
      setStatus("Response stopped. I'm listening.")
      return true
    }

    if (/^(?:end|end session|goodbye|exit|shut down)$/.test(command)) {
      speechSynthesis.cancel()
      assistantBusy = false
      waitingForCommand = false
      assistantEnabled = false
      recognition?.stop()
      setStatus("Nova has stopped. Click Speak with AI to start again.")
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
    utterance.rate = 0.95
    orb.classList.add("speaking")
    assistantBusy = true

    utterance.onstart = () => {
      assistantBusy = true
    }

    utterance.onend = () => {
      orb.classList.remove("speaking")
      assistantBusy = false
    }

    utterance.onerror = () => {
      orb.classList.remove("speaking")
      assistantBusy = false
      setStatus("Nova could not play the voice response, but the answer is saved in chat history.")
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
        setTimeout(() => startListening(), 250)
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

      if (assistantBusy) {
        handleVoiceInterruption(transcript)
        return
      }

      setStatus(`You said: "${transcript}"${confidence === null ? "" : ` (${Math.round(confidence * 100)}%)`}`)

      const wakeWordMatch = transcript.match(/^(?:(?:hello|hey)(?:\s+nova)?|nova)\b\s*/i)
      const wakeWordDetected = Boolean(wakeWordMatch)
      const cleanedTranscript = wakeWordMatch ? transcript.slice(wakeWordMatch[0].length).trim() : ""

      if (wakeWordDetected && !cleanedTranscript) {
        const name = getUserName()
        const greeting = name ? `Hey ${name}, how may I help?` : "Hey, how may I help?"
        recordConversation(transcript, greeting)
        speak(greeting)
        waitingForCommand = true
        return
      }

      if (wakeWordDetected) {
        waitingForCommand = false
        activeUserMessage = cleanedTranscript
        onCommand(cleanedTranscript)
        return
      }

      if (waitingForCommand) {
        waitingForCommand = false
        activeUserMessage = transcript
        onCommand(transcript)
      } else {
        setStatus("Start with hey, hello, or Nova.")
      }
    }

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error)

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        assistantEnabled = false
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
      setStatus("Nova is already listening. Please wait for the result.")
      return
    }

    assistantEnabled = true
    startListening()
    setStatus("Voice assistant started. Start with hey, hello, or Nova.")
  })

  return { speak }
}
