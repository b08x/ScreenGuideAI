import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, CheckIcon, MicrophoneIcon, RecordIcon, ScreenShareIcon, StopIcon } from './icons';

interface VideoRecorderProps {
  setVideoFile: (file: File | null) => void;
}

type RecordSource = 'camera' | 'screen' | 'audio';

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ setVideoFile }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const [recordSource, setRecordSource] = useState<RecordSource>('camera');
  const [includeMic, setIncludeMic] = useState(true);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Cleanup stream and timer on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [stream]);

  const handleSourceChange = (source: RecordSource) => {
    if (isRecording) return;
    setRecordSource(source);
    // Reset any existing previews or files when source changes
    if (hasRecording || error) {
      setError(null);
      setHasRecording(false);
      setVideoFile(null);
      if (videoRef.current) {
        videoRef.current.src = "";
        videoRef.current.srcObject = null;
        videoRef.current.controls = false;
      }
    }
  };

  const handleStartRecording = async () => {
    setError(null);
    setVideoFile(null);
    setHasRecording(false);
    recordedChunks.current = [];
    setRecordingTime(0);

    if (videoRef.current) {
        videoRef.current.src = "";
        videoRef.current.srcObject = null;
        videoRef.current.controls = false;
    }

    try {
      let mediaStream: MediaStream;

      if (recordSource === 'audio') {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } else if (recordSource === 'camera') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: includeMic,
        });
      } else { // screen
        // Get the screen video/audio stream
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: true, // This is for system/tab audio
        });

        // If mic is requested, get it and combine streams
        if (includeMic) {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const micTrack = micStream.getAudioTracks()[0];
            // Add the microphone track to the display stream
            displayStream.addTrack(micTrack);
        }
        
        mediaStream = displayStream;

        // Add listener to stop recording when user clicks native "Stop sharing" button
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = () => handleStopRecording();
        }
      }
      
      setStream(mediaStream);
      if (videoRef.current && recordSource !== 'audio') {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Mute preview to avoid feedback
        videoRef.current.play().catch(console.error);
      }

      // FIX: Explicitly type `options` to avoid TypeScript error when accessing `mimeType`.
      let options: MediaRecorderOptions = {};
      if (recordSource === 'audio') {
        options = { mimeType: 'audio/webm' };
      } else {
        options = { mimeType: 'video/webm; codecs=vp9' };
      }

      if (options.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn(`${options.mimeType} is not supported, falling back to default.`);
          delete options.mimeType;
      }
      
      const recorder = new MediaRecorder(mediaStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || (recordSource === 'audio' ? 'audio/webm' : 'video/webm');
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        
        let fileName = 'recording.webm';
        if (recordSource === 'screen') fileName = 'screen-recording.webm';
        else if (recordSource === 'camera') fileName = 'camera-recording.webm';
        else if (recordSource === 'audio') fileName = 'audio-recording.webm';

        const file = new File([blob], fileName, { type: mimeType });
        setVideoFile(file);
        setHasRecording(true);
        
        if (videoRef.current && recordSource !== 'audio') {
            videoRef.current.srcObject = null;
            const videoUrl = URL.createObjectURL(blob);
            videoRef.current.src = videoUrl;
            videoRef.current.muted = false;
            videoRef.current.controls = true;
        }

        // Stop all tracks on the combined stream
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing media devices:", err);
      if (err instanceof Error) {
        if(err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError(`${recordSource === 'camera' ? 'Camera/mic' : 'Screen'} permission denied. Please allow access in your browser settings.`);
        } else if (err.name === "NotFoundError") {
             setError("No camera or microphone found. Please connect a device and try again.");
        } else {
            setError(`Could not start recording: ${err.message}`);
        }
      } else {
         setError("An unknown error occurred while accessing media devices.");
      }
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      // onstop handler will set isRecording to false and clean up streams
    } else {
        // Handle cases where stream exists but not recording (e.g. user cancels screen share prompt)
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
        setIsRecording(false);
    }
  };
  
  const isRecordingSupported = typeof MediaRecorder !== 'undefined' && navigator.mediaDevices;

  if (!isRecordingSupported) {
    return (
        <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-md">
            <p>Video recording is not supported in your browser. Please try a modern browser like Chrome or Firefox.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
        <div className="w-full flex justify-center items-center p-1 bg-gray-700/50 rounded-lg space-x-1">
          <button
            onClick={() => handleSourceChange('camera')}
            className={`w-1/3 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              recordSource === 'camera' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-600'
            }`}
            disabled={isRecording}
          >
            <CameraIcon className="h-5 w-5" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => handleSourceChange('screen')}
            className={`w-1/3 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              recordSource === 'screen' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-600'
            }`}
            disabled={isRecording}
          >
            <ScreenShareIcon className="h-5 w-5" />
            <span>Screen</span>
          </button>
          <button
            onClick={() => handleSourceChange('audio')}
            className={`w-1/3 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              recordSource === 'audio' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-600'
            }`}
            disabled={isRecording}
          >
            <MicrophoneIcon className="h-5 w-5" />
            <span>Audio</span>
          </button>
        </div>

        {(recordSource === 'camera' || recordSource === 'screen') && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300 self-center py-1">
                <input
                    type="checkbox"
                    id="include-mic"
                    className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-indigo-600 focus:ring-indigo-500"
                    checked={includeMic}
                    onChange={(e) => setIncludeMic(e.target.checked)}
                    disabled={isRecording}
                />
                <label htmlFor="include-mic">Include Microphone Audio</label>
            </div>
        )}

      <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-600 flex items-center justify-center text-gray-500 relative">
        <video ref={videoRef} className={`w-full h-full object-cover ${recordSource === 'audio' ? 'hidden' : ''}`} />
        
        {recordSource !== 'audio' && !stream && !hasRecording && <p className="capitalize">{recordSource} preview will appear here</p>}
        
        {recordSource === 'audio' && !isRecording && !hasRecording &&
          <div className="text-center">
            <MicrophoneIcon className="h-16 w-16 mx-auto mb-2" />
            <p>Ready to record audio</p>
          </div>
        }
        {recordSource === 'audio' && hasRecording && !isRecording &&
            <div className="text-center text-green-400 p-4">
                <CheckIcon className="h-16 w-16 mx-auto mb-2"/>
                <p className="font-semibold">Audio Recorded</p>
                <p className="text-sm text-gray-400 mt-1">Your audio file is ready to be used.</p>
            </div>
        }

        {isRecording && (
          <div className="absolute top-2 left-2 bg-red-600/80 backdrop-blur-sm text-white text-sm font-mono py-1 px-3 rounded-md flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      {!isRecording ? (
        <button
          onClick={handleStartRecording}
          className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center space-x-2"
        >
          <RecordIcon className="h-5 w-5" />
          <span>{hasRecording ? 'Re-record' : 'Start Recording'}</span>
        </button>
      ) : (
        <button
          onClick={handleStopRecording}
          className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-all duration-300 ease-in-out flex items-center justify-center space-x-2 animate-pulse"
        >
          <StopIcon className="h-5 w-5" />
          <span>Stop Recording</span>
        </button>
      )}
    </div>
  );
};