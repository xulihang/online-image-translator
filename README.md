# online-image-translator
An online image translator which supports translation of various images like comics and manga using ImageTrans

Online demo: <https://www.basiccat.org/online-image-translator/>

## How It Works

Local PaddleOCR Mode: OCR runs entirely in your browser using PaddleOCR (compiled to WebAssembly). Translation uses the free MyMemory API or an OpenAI-compatible API (ChatGPT, DeepSeek, etc.). No server needed.

ImageTrans Server Mode: Connect to an ImageTrans server (public or self-hosted) for the full pipeline — OCR, translation, and rendered output in one step.

