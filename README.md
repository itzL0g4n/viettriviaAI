# Viet Trivia AI 🇻🇳 🎤

**Viet Trivia AI** is an immersive, voice-interactive trivia game hosted by a dynamic Vietnamese AI. Built with React and the **Google Gemini Live API**, this application offers a real-time game show experience where you speak naturally to your host, and they respond with unique personalities, wit, and flair.

## ✨ Features

*   **🗣️ Voice-First Gameplay**: No typing required. Just listen to the host and speak your answers in Vietnamese.
*   **🎭 5 Unique Host Personalities**:
    *   **Cô Giáo Thảo**: Friendly, encouraging, and patient (Great for beginners).
    *   **Anh Ba Sàm**: Witty, sarcastic, and loves to tease you when you're wrong.
    *   **MC Hồi Hộp**: Dramatic and intense, building suspense before every reveal.
    *   **MC Vần Điệu**: A rapper host who speaks in rhymes and keeps the energy high.
    *   **Ông Kể Chuyện**: A wise storyteller who weaves trivia into calming narratives.
*   **⚡ Real-Time Interaction**: Powered by Gemini Multimodal Live API for ultra-low latency conversations.
*   **🎵 Audio Visualization**: Features a real-time frequency visualizer that reacts to the AI's voice and your input.
*   **⚙️ Customizable Settings**: Adjust difficulty levels, round duration, and winning score thresholds.

## 🎮 How to Play

1.  **Select a Host**: Browse the personalities on the home screen. Click one to select your host.
2.  **Adjust Settings (Optional)**: Click the **Settings** icon to change difficulty (Easy/Medium/Hard) or game rules.
3.  **Start Game**: Click the **Start Game** button to enter the game arena.
4.  **Connect**: Click the large **Microphone** button to start the live session.
    *   *Note: You must allow microphone access when prompted.*
5.  **Play**:
    *   The host will introduce themselves and ask a trivia question.
    *   Wait for them to finish speaking.
    *   Speak your answer clearly in Vietnamese.
    *   The host will evaluate your answer, award points, and react based on their personality.
6.  **Win**: The first to reach the target score (default: 5) wins the match!

## 🛠️ Technical Stack

*   **Frontend**: React 19, Vite, TypeScript
*   **Styling**: Tailwind CSS, CSS Modules (Glassmorphism effects)
*   **AI Integration**: `@google/genai` SDK (Gemini 2.5 Flash & Gemini Live)
*   **Audio**: Web Audio API (PCM streaming, Analysis for visualizer)

## 🚀 Installation & Setup

To run this project locally:

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd viet-trivia-ai
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure API Key**:
    *   Get an API Key from [Google AI Studio](https://aistudio.google.com/).
    *   Set your `API_KEY` environment variable. If using a bundler like Vite, you might set it in a `.env` file or your deployment settings.
    *   *Security Note: This is a client-side app. For production, ensure you use appropriate security measures or proxy your requests.*

4.  **Start the development server**:
    ```bash
    npm run start
    ```

## ☁️ Deployment

**Vercel** is recommended for deployment because it provides HTTPS by default, which is **required** for browser microphone access.

1.  Push code to GitHub.
2.  Import project into Vercel.
3.  Add `API_KEY` in Vercel Project Settings > Environment Variables.
4.  Deploy.

## 📝 License

This project is open-source and available under the MIT License.