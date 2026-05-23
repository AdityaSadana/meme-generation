'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onImageSelected: (objectUrl: string, file: File) => void;
  previewUrl: string | null;
}

export default function ImageUploader({ onImageSelected, previewUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      onImageSelected(url, file);
    },
    [onImageSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const openWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 50);
    } catch {
      alert('Could not access camera. Please allow camera permissions and try again.');
    }
  };

  const closeWebcam = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setShowWebcam(false);
  };

  const snapPhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'webcam-snap.jpg', { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      onImageSelected(url, file);
      closeWebcam();
    }, 'image/jpeg', 0.9);
  };

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !previewUrl && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
            : 'border-purple-700/60 hover:border-purple-500/80 bg-purple-950/20 hover:bg-purple-900/20'
          }
          ${previewUrl ? 'cursor-default' : ''}
        `}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className="w-full max-h-72 object-contain rounded-2xl"
            />
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-6">
            <div className="w-16 h-16 rounded-full bg-purple-800/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-purple-200 font-medium">Drop your photo here</p>
              <p className="text-purple-400/60 text-sm mt-1">PNG, JPG, WEBP — max 10 MB</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-4 py-2 text-sm rounded-lg bg-purple-700/50 hover:bg-purple-600/60 text-purple-200 border border-purple-600/40 transition-colors"
              >
                Browse files
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openWebcam(); }}
                className="px-4 py-2 text-sm rounded-lg bg-purple-700/50 hover:bg-purple-600/60 text-purple-200 border border-purple-600/40 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Use Camera
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Webcam modal */}
      {showWebcam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#110820] border border-purple-700/50 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-200 font-semibold text-lg">Take a Photo</h3>
              <button onClick={closeWebcam} className="text-purple-400 hover:text-purple-200 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black aspect-video object-cover"
            />
            <button
              onClick={snapPhoto}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold transition-all shadow-lg shadow-purple-900/40"
            >
              Snap Photo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
