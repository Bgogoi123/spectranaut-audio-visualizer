import { useCallback, useState } from "react";

export const useSpeechToText = () => {
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<{ message: string } | null>(null);

  const transcribeAudio = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setTranscription("");

    try {
      const token = import.meta.env.VITE_HUGGING_FACE_TOKEN;
      
      if (!token) {
        setError({ message: "API token not found in environment variables." });
        setLoading(false);
        return;
      }

      // Validate file size (30MB limit)
      const maxSize = 30 * 1024 * 1024;
      if (file.size > maxSize) {
        setError({ message: "File too large. Maximum size is 30MB." });
        setLoading(false);
        return;
      }

      // Read file as array buffer
      const buffer = await file.arrayBuffer();

      // New API endpoint with binary data
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": file.type || "audio/wav",
          },
          body: buffer,
        }
      );

      const result = await response.json();

      // Handle error responses
      if (response.status === 401 || response.status === 403) {
        setError({
          message: "Authentication failed. Please check your API token.",
        });
        return;
      }

      if (response.status === 503) {
        setError({
          message: "Model is loading. Please wait a moment and try again.",
        });
        return;
      }

      if (response.status === 429) {
        setError({
          message: "Rate limit exceeded. Please try again later.",
        });
        return;
      }

      if (!response.ok) {
        setError({
          message: result.error || `API Error: ${response.status}`,
        });
        return;
      }

      // Extract transcription text
      if (result.text) {
        setTranscription(result.text);
      } else if (typeof result === 'string') {
        setTranscription(result);
      } else {
        setError({ message: "No transcription text returned from API." });
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError({ 
          message: "Network error. Please check your internet connection." 
        });
      } else {
        setError({ 
          message: err?.message || "An unexpected error occurred." 
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription("");
    setError(null);
  }, []);

  return { 
    error, 
    loading, 
    transcription, 
    transcribeAudio,
    clearTranscription 
  };
};