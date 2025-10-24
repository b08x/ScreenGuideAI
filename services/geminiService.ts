
import { GoogleGenAI } from "@google/genai";
import { OutputFormat } from '../types';

// IMPORTANT: Do NOT configure your API key in the code.
// This is a placeholder and should be handled via environment variables.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this example, we'll throw an error if the key is missing.
  throw new Error("API_KEY is not configured in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove the "data:video/webm;base64," part
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
        const base64Audio = await blobToBase64(audioBlob);
        const audioPart = {
            inlineData: {
                mimeType: audioBlob.type,
                data: base64Audio,
            },
        };
        const textPart = {
            text: "Transcribe the following audio recording. Provide only the text of the transcription.",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [textPart, audioPart] }],
        });
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio with Gemini API:", error);
        throw new Error("Failed to transcribe audio.");
    }
};

export const transcribeVideo = async (videoFile: File): Promise<string> => {
    try {
        const base64Video = await fileToBase64(videoFile);
        const videoPart = {
            inlineData: {
                mimeType: videoFile.type,
                data: base64Video,
            },
        };
        const textPart = {
            text: "Please provide a verbatim transcript of all spoken audio in the video. Only return the raw text of the transcript, with no extra formatting, commentary, or labels.",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [textPart, videoPart] }],
        });
        return response.text;
    } catch (error) {
        console.error("Error transcribing video with Gemini API:", error);
        throw new Error("Failed to transcribe video. The file may be too large or in an unsupported format.");
    }
};

export const generateGuide = async (
  userPrompt: string,
  outputFormat: OutputFormat,
  fileName: string,
  videoDescription: string,
  transcribedText: string,
  videoFile: File,
): Promise<string> => {
  const formatText = outputFormat === 'guide' 
    ? 'a detailed step-by-step guide with numbered steps' 
    : 'a concise knowledge base article with clear headings and sections';

  const fullPrompt = `
# Agent Identity: ScreenGuide
You are ScreenGuide, an AI agent specializing in transforming screen recordings into high-quality documentation for software tutorials, educational content, how-to-guides, and process documentation.

# Core Responsibilities
- **Analyze and Transcribe:** Analyze the provided video, including visual information (UI elements, clicks, inputs, on-screen changes) and spoken audio, to create a chronological sequence of steps.
- **Synthesize Content:** Summarize and synthesize the information into the requested output format.
- **Formatting:** Use markdown extensively for readability. This includes headings, subheadings, lists (numbered and bulleted), and bold text to create a well-structured and easy-to-read document.
- **Visual Enhancement:** To make the guide more engaging and easier to follow, represent UI elements with simple ASCII art (e.g., \`( Save Changes ) \`, \`[ Enter your name... ]\`) and suggest where screenshots would be helpful using placeholders like \`[Image: A screenshot of the main dashboard after login.]\`.
- **Objectivity:** Ensure the generated guide is objective, factual, and does not reflect any bias.
- **Handle Uncertainty:** If you encounter ambiguous information or are not confident in your interpretation of a step from the video, clearly mark that section for human review (e.g., "[Review needed: The specific menu item clicked was unclear in the video.]").

# Task for this Request
- **Input Video:** You are being provided a screen recording named "${fileName}". Your primary task is to analyze its visual and audio content to generate the documentation.
- **Video Transcription (for reference only):** The following is a machine-generated transcription of the audio from the video. Use this as a supplementary reference, but rely on your direct analysis of the video's audio and visuals as the primary source of truth.
\`\`\`
${transcribedText || 'No transcription was provided.'}
\`\`\`
- **Video Description:** The user has provided the following description of the video content: "${videoDescription || 'No description provided.'}"
- **Requested Output Format:** Your task is to generate ${formatText} based on the video's content.
- **User Instructions:** Adapt your tone, language, and focus based on the following user-provided context: "${userPrompt || 'No additional instructions provided.'}"

# Final Output Rules
- The entire output must be in markdown format.
- The content must be clear, concise, and easy for the intended audience to follow.
- **Incorporate Visuals:** Use ASCII art for UI elements and \`[Image: ...]\` placeholders where a screenshot would clarify a complex step or significant visual change.
- **Crucially, do not mention that you are an AI or that you analyzed a video.** Just provide the guide or article directly, as if you are the human author of the document.
  `;

  try {
    const base64Video = await fileToBase64(videoFile);
    const videoPart = {
        inlineData: {
            mimeType: videoFile.type,
            data: base64Video,
        },
    };
    const textPart = { text: fullPrompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [textPart, videoPart] }],
    });
    return response.text;
  } catch (error) {
    console.error("Error generating content with Gemini API:", error);
    throw new Error("Failed to generate guide. Please check your API key and network connection.");
  }
};