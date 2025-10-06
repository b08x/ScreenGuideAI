
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
import { generateGuide, transcribeVideo } from './services/geminiService';
import { OutputFormat } from './types';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionError, setTranscriptionError] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('guide');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!videoFile) {
      setTranscribedText('');
      setTranscriptionError('');
      return;
    }

    const runTranscription = async () => {
      setIsTranscribing(true);
      setTranscriptionError('');
      setTranscribedText('');
      try {
        const transcription = await transcribeVideo(videoFile);
        setTranscribedText(transcription);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setTranscriptionError(`Transcription failed: ${e.message}`);
        } else {
          setTranscriptionError('An unknown error occurred during transcription.');
        }
      } finally {
        setIsTranscribing(false);
      }
    };

    runTranscription();
  }, [videoFile]);


  const handleGenerate = useCallback(async () => {
    if (!videoFile) {
      setError('Please upload a video file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedOutput('');

    try {
      const result = await generateGuide(userPrompt, outputFormat, videoFile.name, videoDescription, transcribedText);
      setGeneratedOutput(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`An error occurred: ${e.message}`);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, userPrompt, outputFormat, videoDescription, transcribedText]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InputSection
          videoFile={videoFile}
          setVideoFile={setVideoFile}
          videoDescription={videoDescription}
          setVideoDescription={setVideoDescription}
          transcribedText={transcribedText}
          setTranscribedText={setTranscribedText}
          isTranscribing={isTranscribing}
          transcriptionError={transcriptionError}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          outputFormat={outputFormat}
          setOutputFormat={setOutputFormat}
          isLoading={isLoading}
          onGenerate={handleGenerate}
        />
        <OutputSection
          isLoading={isLoading}
          output={generatedOutput}
          error={error}
        />
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Powered by Generative AI | ScreenGuide &copy; 2024</p>
      </footer>
    </div>
  );
};

export default App;
