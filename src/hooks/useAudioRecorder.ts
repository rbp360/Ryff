'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioRecordResult {
  audioBase64: string;
  audioMimeType: string;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingSeconds: number;
  maxSeconds: number;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecordResult | null>;
  cancelRecording: () => void;
  error: string | null;
  clearError: () => void;
}

export interface UseAudioRecorderOptions {
  onAutoStop?: (result: AudioRecordResult) => void;
}

const MAX_RECORDING_SECONDS = 30;

export function useAudioRecorder(
  maxDuration = MAX_RECORDING_SECONDS,
  options?: UseAudioRecorderOptions
): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onAutoStopRef = useRef<((result: AudioRecordResult) => void) | undefined>(options?.onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = options?.onAutoStop;
  }, [options?.onAutoStop]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resolvePromiseRef = useRef<((value: AudioRecordResult | null) => void) | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupAudioContext = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const cleanupStream = useCallback(() => {
    cleanupAudioContext();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [cleanupAudioContext]);

  const cancelRecording = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioLevel(0);
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(null);
      resolvePromiseRef.current = null;
    }
  }, [clearTimer, cleanupStream]);

  const stopRecording = useCallback((): Promise<AudioRecordResult | null> => {
    return new Promise((resolve) => {
      clearTimer();
      cleanupAudioContext();
      resolvePromiseRef.current = resolve;

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        cleanupStream();
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  }, [clearTimer, cleanupAudioContext, cleanupStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio Analyser for real-time visual feedback
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(Math.round((avg / 40) * 100), 100);
            setAudioLevel(normalized);
            animFrameRef.current = requestAnimationFrame(checkLevel);
          };
          animFrameRef.current = requestAnimationFrame(checkLevel);
        }
      } catch (audioErr) {
        console.warn('AudioContext level meter initialization failed:', audioErr);
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        cleanupStream();
        const activeMime = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: activeMime });

        if (audioChunksRef.current.length === 0 || audioBlob.size === 0) {
          if (resolvePromiseRef.current) {
            resolvePromiseRef.current(null);
            resolvePromiseRef.current = null;
          }
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Audio = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          if (resolvePromiseRef.current) {
            resolvePromiseRef.current({
              audioBase64: base64Audio,
              audioMimeType: activeMime,
            });
            resolvePromiseRef.current = null;
          }
        };
        reader.onerror = () => {
          if (resolvePromiseRef.current) {
            resolvePromiseRef.current(null);
            resolvePromiseRef.current = null;
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording().then((res) => {
              if (res && onAutoStopRef.current) {
                onAutoStopRef.current(res);
              }
            });
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError')) {
        setError('Microphone access denied. Please enable microphone permissions in your browser.');
      } else {
        setError('Unable to access microphone.');
      }
      setIsRecording(false);
      cleanupStream();
    }
  }, [cleanupStream, maxDuration, stopRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
    };
  }, [clearTimer, cleanupStream]);

  return {
    isRecording,
    recordingSeconds,
    maxSeconds: maxDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    clearError: () => setError(null),
  };
}
