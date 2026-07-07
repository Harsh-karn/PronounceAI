/**
 * Resamples an audio blob to 16kHz Float32Array suitable for Whisper.
 */
export async function prepareAudioForModel(audioBlob: Blob): Promise<Float32Array> {
  // Use webkitAudioContext fallback for older Safari versions
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass({ sampleRate: 16000 });
  
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  return audioBuffer.getChannelData(0);
}
