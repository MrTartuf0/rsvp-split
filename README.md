# RSVP Reader 📖⚡️

> "I don't like reading, so I took a day to build an e-reader."

I've never been a huge fan of reading long, dense texts—my attention span just drifts. But I still needed to consume books and documents. I had seen RSVP (Rapid Serial Visual Presentation) speed-reading concepts before and loved the Monkeytype-style aesthetics. So, I spent a day hacking together the ultimate minimalist, distraction-free, lightning-fast e-reader directly in the browser. 

The result? An e-reader that flashes words at you, letting you read at 300+ WPM without moving your eyes, complete with Vim shortcuts and a command palette.

## 🚀 Features

- **RSVP Reading Engine**: Read blazing fast with a central visual focus point. No eye movement required.
- **Universal File Support**: Drag and drop EPUBs, PDFs, TXT, or Markdown files.
- **Local-First & Privacy Focused**: Everything is stored directly in your browser using IndexedDB. No servers, no tracking.
- **Command Palette**: Inspired by VSCode. Press `Cmd+Shift+P` (or `Cmd+P`) to jump between files, run commands, or set your WPM on the fly.
- **Vim-style Navigation**: Never touch the mouse. Use `j`/`k` to jump words, `u`/`d` to change pages/chapters, and spacebar to play/pause.
- **Focus & Zen Modes**: Press `f` to dim everything but the text, or `z` to enter full Zen mode for ultimate immersion.
- **Smart EPUB & PDF Handling**: Dynamic thumbnail generation for PDFs and intelligent auto-scrolling for EPUBs so you never lose your place.
- **Monkeytype Aesthetics**: Beautiful, dark, high-contrast, minimalist UI.

## 🛠️ Tech Stack

- **Vue 3** (Composition API)
- **Vite**
- **TailwindCSS** (for the sleek, minimal design)
- **Pinia** (State management)
- **LocalForage** (IndexedDB for offline file storage)
- **PDF.js** & **Epub.js**

## 💻 Getting Started

1. Clone the repository
```bash
git clone https://github.com/your-username/rsvp-reader.git
cd rsvp-reader
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open `http://localhost:3000` (or the port Vite provides) in your browser. Drag and drop a book, and start reading at the speed of light!

## ⌨️ Shortcuts

- `Space`: Play / Pause
- `j` / `k`: Rewind / Forward by 1 word
- `J` / `K` (Shift+j/k): Decrease / Increase reading speed by 25 WPM
- `h` / `l`: Rewind / Forward by 1 word
- `H` / `L`: Rewind / Forward by 10 words
- `u` / `d`: Previous / Next Page (PDF) or Chapter (EPUB)
- `-` / `=`: Zoom out / Zoom in (PDF) or decrease/increase font size (EPUB)
- `f`: Open Recent Files search
- `z`: Toggle Zen Mode
- `Cmd + P`: Open Command Palette
- `Cmd + O`: Open file picker
- `Esc`: Close palettes and exit Zen/Focus modes

## 📄 License

MIT License
