import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { CameraPreview } from '../components/Camera/CameraPreview';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { toast } from '../components/common/Toast';
import { ImagePreview } from '../components/common/ImagePreview';
import * as api from '../services/api';

export const SharedSessionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { videoRef, isStreaming, startCamera, stopCamera, captureFrame } = useCamera();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSession = useCallback(async () => {
    if (!token) return;
    try {
      const info = await api.getSessionInfo(token);
      setSession(info);
      if (info.status === 'complete' || info.status === 'expired') {
        setHasSubmitted(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Poll for updates
  useEffect(() => {
    if (!token || loading) return;
    pollRef.current = setInterval(loadSession, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [token, loading, loadSession]);

  const handleCapture = useCallback(() => {
    const frame = captureFrame();
    if (frame) setCaptured(frame);
  }, [captureFrame]);

  const handleSubmit = useCallback(async () => {
    if (!captured || !token) return;
    setSaving(true);
    try {
      const result = await api.captureToSession(token, captured);
      setSession(result);
      setCaptured(null);
      setHasSubmitted(true);
      stopCamera();
      toast('Photo added!', 'success');
      if (result.status === 'complete') {
        toast('Session is complete!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  }, [captured, token, stopCamera]);

  const handleRetake = useCallback(() => {
    setCaptured(null);
    startCamera();
  }, [startCamera]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center space-y-4">
          <div className="text-5xl">🔗</div>
          <h2 className="text-xl font-bold text-gray-900">Session Not Found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isFull = session.participant_count >= session.max_participants;
  const canJoin = session.status === 'waiting' && !isFull;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Shared Photo Session</h1>
          <p className="text-sm text-gray-500 capitalize">Layout: {session.layout}</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">Participants</span>
            <span className="text-xs text-gray-400">{session.participant_count}/{session.max_participants} joined</span>
          </div>
          <div className="space-y-2">
            {Array.from({ length: session.max_participants }, (_, i) => {
              const participant = session.participants?.find((p: any) => p.slot === i);
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${participant ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${participant ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {participant ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${participant ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                    {participant ? `Participant ${i + 1}` : 'Waiting for someone...'}
                  </span>
                  {participant && (
                    <img src={participant.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Session complete */}
        {(session.status === 'complete' || session.status === 'expired') && (
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm space-y-3">
            <h3 className="text-lg font-bold text-green-700 text-center">Session Complete!</h3>
            {session.composite_url && (
              <ImagePreview src={session.composite_url} alt="Final composite" />
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/gallery')}>View in Gallery</Button>
              <Button variant="secondary" onClick={() => {
                const a = document.createElement('a');
                a.href = session.composite_url;
                a.download = 'snapbooth-final.jpg';
                a.click();
              }}>Download</Button>
            </div>
          </div>
        )}

        {/* Already submitted — waiting */}
        {hasSubmitted && session.status === 'waiting' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center space-y-3">
            <div className="text-4xl">⏳</div>
            <p className="text-purple-700 font-medium">You're in! Photo submitted.</p>
            <p className="text-sm text-purple-500">
              Waiting for {session.max_participants - session.participant_count} more participant(s) to join...
            </p>
            <p className="text-xs text-purple-400">This page updates automatically.</p>
          </div>
        )}

        {/* Capture area — only if session is open and user hasn't submitted */}
        {!hasSubmitted && session.status === 'waiting' && (
          <>
            {!captured && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Session Filter: <strong className="capitalize">{session.filter_name}</strong> — this filter is locked for all participants</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <CameraPreview videoRef={videoRef} mirrored={true} isStreaming={isStreaming} className="w-full aspect-[1386/1266]" filter={session.filter_name} />
                </div>
                <div className="flex gap-2">
                  {!isStreaming ? (
                    <Button onClick={startCamera} className="flex-1">Start Camera</Button>
                  ) : (
                    <Button onClick={handleCapture} className="flex-1">Capture Your Photo</Button>
                  )}
                </div>
              </div>
            )}

            {captured && (
              <div className="space-y-3">
                <img src={captured} alt="Captured" className="w-full rounded-xl border border-gray-200" />
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} loading={saving} disabled={saving} className="flex-1">
                    Submit My Photo
                  </Button>
                  <Button variant="secondary" onClick={handleRetake}>Retake</Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Session is full but not yet complete */}
        {!hasSubmitted && isFull && session.status === 'waiting' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center space-y-3">
            <div className="text-4xl">👥</div>
            <p className="text-yellow-700 font-medium">Session is full</p>
            <p className="text-sm text-yellow-500">All slots are filled. The final photo will be ready shortly.</p>
          </div>
        )}

        {/* Session expired */}
        {session.status === 'expired' && !hasSubmitted && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center space-y-3">
            <div className="text-4xl">⏰</div>
            <p className="text-gray-700 font-medium">This session has expired</p>
            <Button variant="secondary" onClick={() => navigate('/')}>Create Your Own</Button>
          </div>
        )}
      </div>
    </div>
  );
};
