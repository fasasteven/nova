# Nova Voice Assistant

Nova is a browser-based voice assistant that listens for a wake word, understands simple commands, speaks responses, and remembers recent conversations.

## Features

- Speech recognition using the browser Web Speech API.
- Text-to-speech replies using the browser speech synthesis API.
- Wake words: `hey`, `hello`, `nova`, `hey nova`, and `hello nova`.
- After the first click and microphone approval, Nova keeps listening and waits for a wake word after each response.
- Personalized greeting using the signed-in user's name from `localStorage`.
- Opens common websites such as Google, YouTube, Facebook, Instagram/IG, GitHub, Gmail, LinkedIn, Netflix, Reddit, Spotify, TikTok, WhatsApp, Wikipedia, X/Twitter, and more.
- Opens other one-word websites, for example: `Nova open Twitch`.
- Opens spoken domain names, for example: `Nova open example.com`.
- Tells the current time.
- Opens a Google weather search for a requested city.
- Answers factual questions with a fast, free Wikipedia lookup.
- Handles follow-up prompts such as `tell me more` and `explain that` using the latest saved discussion.
- Stores the latest five user-and-assistant discussions in `localStorage` under `novaDiscussions`.
- Supports account sign-up and sign-in with browser `localStorage`.

## Voice Commands

Start each request with a wake word:

```text
Hey
Hello Nova
Nova open YouTube
Hey open IG
Hello open google.com
Nova what time is it
Hey weather in Lagos
Nova who invented electricity
Nova tell me more
Nova stop
Nova end
```

Say `stop` (or `Nova stop`) while Nova is speaking to cancel the current response and continue listening. Say `end`, `goodbye`, or `Nova end` to stop the assistant session; click **Speak with AI** to start it again.

## Running the Project

1. Run `node server.js` and open `http://localhost:8000` in Chrome or Microsoft Edge.
2. Sign up or sign in to personalize Nova's greeting.
3. Click **Speak with AI**.
4. Allow microphone access when the browser asks.
5. Start speaking with `hey`, `hello`, or `nova`.

## Browser Requirements

- Use Chrome or Microsoft Edge for the best speech-recognition support.
- Speech recognition needs microphone permission and generally works best on `https://` or `localhost`.
- The project uses browser storage only; account and discussion data stay in the current browser.
