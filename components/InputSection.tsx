import React, { useState, useRef } from 'react';
import { OutputFormat } from '../types';
import { UploadIcon, CameraIcon, MicrophoneIcon } from './icons';
import { VideoRecorder } from './VideoRecorder';
import { Loader } from './Loader';
import { transcribeAudio } from '../services/geminiService';

interface InputSectionProps {
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  videoDescription: string;
  setVideoDescription: (description: string) => void;
  transcribedText: string;
  setTranscribedText: (text: string) => void;
  isTranscribing: boolean;
  transcriptionError: string;
  userPrompt: string;
  // FIX: Updated type for setUserPrompt to allow functional updates.
  setUserPrompt: React.Dispatch<React.SetStateAction<string>>;
  outputFormat: OutputFormat;
  setOutputFormat: (format: OutputFormat) => void;
  isLoading: boolean;
  onGenerate: () => void;
}

const promptExamples = [
  "Focus on accessibility features shown in the video.",
  "Generate a guide for absolute beginners, explain every step simply.",
  "Create a knowledge base article for advanced users, skip the basic steps.",
  "The target audience is marketing professionals. Use their terminology.",
];

export const InputSection: React.FC<InputSectionProps> = ({
  videoFile,
  setVideoFile,
  videoDescription,
  setVideoDescription,
  transcribedText,
  setTranscribedText,
  isTranscribing,
  transcriptionError,
  userPrompt,
  setUserPrompt,
  outputFormat,
  setOutputFormat,
  isLoading,
  onGenerate,
}) => {
  const [inputType, setInputType] = useState<'upload' | 'record'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // State and refs for voice input
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [isMicTranscribing, setIsMicTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

    if (!file.type.startsWith('video/')) {
      setUploadError('Invalid file type. Please upload a video file.');
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds 500MB limit. Please choose a smaller video.');
      return;
    }
    
    setVideoFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleMicToggle = () => {
    if (isMicRecording) {
      handleStopMicRecord();
    } else {
      handleStartMicRecord();
    }
  };

  const handleStartMicRecord = async () => {
    setMicError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError("Voice input is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsMicRecording(true);
      
      const options = { mimeType: 'audio/webm' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsMicTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        
        try {
          const newTranscribedText = await transcribeAudio(audioBlob);
          setUserPrompt(prev => prev ? `${prev.trim()} ${newTranscribedText}` : newTranscribedText);
        } catch (e: unknown) {
          if (e instanceof Error) {
            setMicError(e.message);
          } else {
            setMicError("An unknown error occurred during transcription.");
          }
        } finally {
          setIsMicTranscribing(false);
        }
      };

      recorder.start();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
            setMicError("Microphone permission denied. Please allow access in browser settings.");
        } else {
            setMicError("Could not access the microphone.");
        }
        setIsMicRecording(false);
    }
  };

  const handleStopMicRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsMicRecording(false);
  };

  return (
    <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 flex flex-col space-y-6 h-full shadow-lg">
      <div>
        <label className="text-lg font-semibold text-gray-200 mb-3 block">1. Provide Screencast</label>
        
        <div className="flex border-b border-gray-600 mb-4">
          <button
            onClick={() => { setInputType('upload'); setVideoFile(null); }}
            className={`flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium transition-colors w-1/2 ${
              inputType === 'upload'
                ? 'border-b-2 border-indigo-400 text-indigo-300'
                : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
            }`}
            aria-current={inputType === 'upload' ? 'page' : undefined}
          >
            <UploadIcon className="h-5 w-5" />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => { setInputType('record'); setVideoFile(null); }}
            className={`flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium transition-colors w-1/2 ${
              inputType === 'record'
                ? 'border-b-2 border-indigo-400 text-indigo-300'
                : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
            }`}
             aria-current={inputType === 'record' ? 'page' : undefined}
          >
            <CameraIcon className="h-5 w-5" />
            <span>Record Video</span>
          </button>
        </div>

        {inputType === 'upload' ? (
           <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-2 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors ${isDragging ? 'border-indigo-400 bg-gray-800/50' : 'border-gray-600 hover:border-indigo-400'}`}>
              <div className="text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-500" aria-hidden="true" />
                <div className="mt-4 flex text-sm leading-6 text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-300"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-500">Video files up to 500MB</p>
                {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
              </div>
            </div>
        ) : (
          <VideoRecorder setVideoFile={setVideoFile} />
        )}

        {videoFile && (
          <div className="mt-4 text-sm text-green-400 bg-green-900/50 p-3 rounded-md animate-fade-in">
            Selected file: <span className="font-semibold">{videoFile.name}</span>
          </div>
        )}
      </div>
      
      {videoFile && (
        <div className="animate-fade-in">
          <label htmlFor="transcription" className="text-lg font-semibold text-gray-200 mb-2 block">2. Review Transcription</label>
          {isTranscribing ? (
            <div className="h-40 flex items-center justify-center bg-gray-900/50 rounded-md">
              <Loader />
            </div>
          ) : transcriptionError ? (
            <div className="text-red-400 bg-red-900/50 p-3 rounded-md">
              <p className="font-semibold">Transcription Error</p>
              <p className="text-sm mt-1">{transcriptionError}</p>
            </div>
          ) : (
            <>
            <textarea
              id="transcription"
              rows={6}
              className="block w-full rounded-md border-0 bg-gray-700/50 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition"
              placeholder="Video transcription will appear here... You can edit it before generating."
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              aria-label="Video Transcription"
            />
            <p className="mt-2 text-xs text-gray-400">Review and edit the generated transcription for accuracy before proceeding.</p>
            </>
          )}
        </div>
      )}

      <div>
        <label htmlFor="video-description" className="text-lg font-semibold text-gray-200 mb-2 block">3. Describe the video (Optional)</label>
        <textarea
          id="video-description"
          rows={3}
          className="block w-full rounded-md border-0 bg-gray-700/50 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition"
          placeholder="e.g., 'A short tutorial on how to use the new filtering feature on the dashboard.'"
          value={videoDescription}
          onChange={(e) => setVideoDescription(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="user-prompt" className="text-lg font-semibold text-gray-200 mb-2 block">4. Add Context (Optional)</label>
        <div className="relative">
          <textarea
            id="user-prompt"
            rows={4}
            className="block w-full rounded-md border-0 bg-gray-700/50 py-2 pr-12 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition"
            placeholder="Type or use the microphone to add instructions..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            disabled={isMicTranscribing}
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={handleMicToggle}
              disabled={isMicTranscribing}
              className={`p-1.5 rounded-full transition-colors ${
                isMicRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } disabled:opacity-50 disabled:cursor-wait`}
              aria-label={isMicRecording ? 'Stop recording voice input' : 'Start recording voice input'}
            >
              {isMicTranscribing ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <MicrophoneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {micError && <p className="mt-2 text-xs text-red-400">{micError}</p>}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">💡 Prompt Examples</h4>
          <div className="flex flex-wrap gap-2">
            {promptExamples.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setUserPrompt(prompt)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium py-1.5 px-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-3">5. Choose Output Format</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setOutputFormat('guide')}
            className={`flex-1 p-3 rounded-lg text-center font-medium transition-all ${outputFormat === 'guide' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Step-by-step Guide
          </button>
          <button
            onClick={() => setOutputFormat('article')}
            className={`flex-1 p-3 rounded-lg text-center font-medium transition-all ${outputFormat === 'article' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Knowledge Base Article
          </button>
        </div>
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 text-xs text-gray-400">
            <h4 className="font-semibold text-sm text-gray-300 mb-2">Format Preview</h4>
            {outputFormat === 'guide' ? (
                <div key="guide-preview" className="space-y-1 animate-fade-in-subtle">
                    <p className="font-mono">1. **Step Title**</p>
                    <p className="font-mono pl-4">Clear, concise instruction for the first action.</p>
                    <p className="font-mono pl-4">[Image: Screenshot of the relevant UI.]</p>
                    <p className="font-mono">2. **Another Step**</p>
                    <p className="font-mono pl-4">Description of what to do next, referencing UI elements like `( Save )`.</p>
                </div>
            ) : (
                <div key="article-preview" className="space-y-1 animate-fade-in-subtle">
                    <p className="font-mono">## Feature Overview</p>
                    <p className="font-mono">A high-level summary of the feature or process.</p>
                    <p className="font-mono">### Key Functionality</p>
                    <p className="font-mono">- Bullet point explaining a core concept.</p>
                    <p className="font-mono">- Another point using `backticks` for technical details.</p>
                </div>
            )}
        </div>
      </div>
      
      <div className="flex-grow flex items-end">
        <button
          onClick={onGenerate}
          disabled={!videoFile || isLoading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate Guide</span>
          )}
        </button>
      </div>
    </div>
  );
};

const animations = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeInSubtle {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in-subtle {
  animation: fadeInSubtle 0.4s ease-out forwards;
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = animations;
document.head.appendChild(styleSheet);