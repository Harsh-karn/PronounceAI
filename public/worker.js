import { pipeline, env } from "/transformers/transformers.js";

console.log("[Worker] Script loaded and executing from public directory!");

env.allowRemoteModels = false;
env.localModelPath = "/models/";
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = "/transformers/";

class PipelineSingleton {
  static task = "automatic-speech-recognition";
  static model = "Xenova/whisper-tiny.en";
  static instance = null;

  static async getInstance(progress_callback) {
    if (this.instance === null) {
      console.log("[Worker] Pipeline initializing...");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

self.addEventListener("message", async (event) => {
  const message = event.data;
  console.log("[Worker] Received message:", message.type);
  
  if (message.type === "load") {
    try {
      console.log("[Worker] Starting model load...");
      const transcriber = await PipelineSingleton.getInstance((x) => {
        console.log("[Worker] Progress:", x);
        self.postMessage({ type: "progress", data: x });
      });
      self.postMessage({ type: "loaded" });
    } catch (err) {
      console.error("[Worker] Load Error:", err);
      self.postMessage({ type: "error", error: err.message || err.toString() });
    }
  } else if (message.type === "transcribe") {
    try {
      const transcriber = await PipelineSingleton.getInstance(null);
      const output = await transcriber(message.audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
      self.postMessage({ type: "result", data: output });
    } catch (err) {
      console.error("[Worker] Transcribe Error:", err);
      self.postMessage({ type: "error", error: err.message || err.toString() });
    }
  }
});
