import { pipeline, env } from "@xenova/transformers";

// Tell transformers to load from our local public folder instead of huggingface
env.allowRemoteModels = false;
env.localModelPath = "/models/";
env.useBrowserCache = true;

class PipelineSingleton {
  static task = "automatic-speech-recognition";
  static model = "Xenova/whisper-tiny.en";
  static instance: any = null;

  static async getInstance(progress_callback: any) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

self.addEventListener("message", async (event) => {
  const message = event.data;
  
  if (message.type === "load") {
    try {
      const transcriber = await PipelineSingleton.getInstance((x: any) => {
        // Post progress back to main thread
        self.postMessage({ type: "progress", data: x });
      });
      self.postMessage({ type: "loaded" });
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
  } else if (message.type === "transcribe") {
    try {
      const transcriber = await PipelineSingleton.getInstance(null);
      // The audioData is a Float32Array
      const output = await transcriber(message.audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true, // Word-level or segment-level timestamps
      });
      self.postMessage({ type: "result", data: output });
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
  }
});
