import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useCountdown } from '../hooks/useCountdown';
import { CameraPreview } from '../components/Camera/CameraPreview';
import { CountdownOverlay } from '../components/Camera/CountdownOverlay';
import { CameraControls } from '../components/Camera/CameraControls';
import { FilterPreview } from '../components/Filters/FilterPreview';
import { LayoutSelector } from '../components/Layout/LayoutSelector';
import { FrameSelector } from '../components/Layout/FrameSelector';
import { LayoutGrid } from '../components/Layout/LayoutGrid';
import { StickerPanel } from '../components/Stickers/StickerPanel';
import { TextOverlay } from '../components/Stickers/TextOverlay';
import { Button } from '../components/common/Button';
import { toast } from '../components/common/Toast';
import { Spinner } from '../components/common/Spinner';
import { ImagePreview } from '../components/common/ImagePreview';
import { InviteModal } from '../components/SharedSession/InviteModal';
import { CSS_FILTERS } from '../utils/filters';
import type { LayoutType, FrameType, CountdownDuration, FilterInfo, Sticker } from '../types';
import * as api from '../services/api';

const SLOT_MAP: Record<string, number> = {
  single: 1, strip: 4, '2x2': 4, '2x1_side': 3,
};

export const CapturePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { videoRef, isStreaming, error: camError, startCamera, stopCamera, captureFrame } = useCamera();
  const { countdown, isRunning: isCountingDown, start: startCountdown, stop: stopCountdown } = useCountdown();

  const [layout, setLayout] = useState<LayoutType>('single');
  const [frameType, setFrameType] = useState<FrameType>('simple');
  const [countdownDuration, setCountdownDuration] = useState<CountdownDuration>(3);
  const [filters, setFilters] = useState<FilterInfo[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [filterPreviews, setFilterPreviews] = useState<Record<string, string>>({});
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [sessionLabel, setSessionLabel] = useState<string | undefined>();
  const [customText, setCustomText] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showText, setShowText] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  const [sharedSession, setSharedSession] = useState<{
    token: string; link: string; max: number; status: string;
    participantCount: number; compositeUrl: string | null;
    participants: { slot: number; thumbnail_url: string }[];
  } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slotCount = SLOT_MAP[layout] || 1;

  useEffect(() => {
    api.getFilters().then(setFilters).catch(() => {});
  }, []);

  useEffect(() => {
    const sid = searchParams.get('session');
    if (sid) {
      setSessionId(sid);
      api.getSession(sid).then((s) => {
        setLayout((s.layout as LayoutType) || 'single');
        const urls = s.images.map((img) => img.image_url);
        setSessionImages(urls);
        if (urls.length > 0) toast(`Joined session with ${urls.length} existing photo(s)`, 'info');
      }).catch(() => toast('Could not load shared session', 'error'));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isStreaming || filters.length === 0) return;
    const timeout = setTimeout(async () => {
      const frame = captureFrame();
      if (!frame) return;
      const previews: Record<string, string> = { normal: frame };
      for (const f of filters) {
        if (f.id === 'normal') continue;
        try {
          previews[f.id] = await api.previewFilter(frame, f.id);
        } catch { /* skip */ }
      }
      setFilterPreviews(previews);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isStreaming, filters, captureFrame]);

  // Poll shared session status
  useEffect(() => {
    if (!sharedSession || sharedSession.status === 'complete') return;
    pollRef.current = setInterval(async () => {
      try {
        const info = await api.getSessionInfo(sharedSession.token);
        setSharedSession((prev) => prev ? {
          ...prev,
          status: info.status,
          participantCount: info.participant_count,
          compositeUrl: info.composite_url,
          participants: info.participants.map((p: any) => ({ slot: p.slot, thumbnail_url: p.thumbnail_url })),
        } : prev);
        if (info.status === 'complete' && info.composite_url) {
          setCompositeUrl(info.composite_url);
          toast('Session complete! All photos have been merged.', 'success');
        }
      } catch { /* ignore poll errors */ }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sharedSession?.token, sharedSession?.status]);

  const handleCreateSharedSession = useCallback(async () => {
    setCreatingSession(true);
    try {
      const result = await api.createSharedSession(layout, frameType, selectedFilter);
      setSharedSession({
        token: result.invite_token,
        link: result.invite_link,
        max: result.max_participants,
        status: 'waiting',
        participantCount: 0,
        compositeUrl: null,
        participants: [],
      });
      setSessionId(result.session_id);
      setShowInviteModal(true);
    } catch (err: any) {
      toast(err.message || 'Failed to create session', 'error');
    } finally {
      setCreatingSession(false);
    }
  }, [layout, frameType, selectedFilter]);

  const captureOne = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) {
      toast('Failed to capture frame', 'error');
      return null;
    }
    return frame;
  }, [captureFrame]);

  const handleCapture = useCallback(async () => {
    if (!isStreaming || isCountingDown) return;
    if (!sharedSession && capturedFrames.length >= slotCount) {
      toast(`Layout full (${slotCount} photos). Save or reset.`, 'info');
      return;
    }
    if (sharedSession && hasSubmitted) {
      toast('You already submitted your photo. Waiting for others...', 'info');
      return;
    }
    if (countdownDuration > 0) {
      await startCountdown(countdownDuration);
    }
    const frame = await captureOne();
    if (!frame) return;

    if (sharedSession) {
      setSaving(true);
      try {
        const result = await api.captureToSession(sharedSession.token, frame);
        setHasSubmitted(true);
        setSharedSession((prev) => prev ? {
          ...prev,
          status: result.status,
          participantCount: result.participant_count,
          compositeUrl: result.composite_url,
          participants: result.participants.map((p: any) => ({ slot: p.slot, thumbnail_url: p.thumbnail_url })),
        } : prev);
        toast('Photo submitted! Share the link for others to join.', 'success');
        if (result.status === 'complete' && result.composite_url) {
          setCompositeUrl(result.composite_url);
          toast('Session complete!', 'success');
        }
      } catch (err: any) {
        toast(err.message || 'Failed to submit', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      setCapturedFrames((prev) => [...prev, frame]);
    }
  }, [isStreaming, isCountingDown, capturedFrames.length, slotCount, countdownDuration, startCountdown, captureOne, sharedSession, hasSubmitted]);

  const handleSave = useCallback(async () => {
    if (capturedFrames.length === 0) return;
    setSaving(true);
    try {
      await api.captureComposite(capturedFrames, selectedFilter, layout, frameType);
      toast('Photo saved to gallery!', 'success');
      setCapturedFrames([]);
      setTimeout(() => navigate('/gallery'), 800);
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [capturedFrames, selectedFilter, layout, frameType, navigate]);

  const resetAll = useCallback(() => {
    setCapturedFrames([]);
    setSessionId(undefined);
    setSharedSession(null);
    setHasSubmitted(false);
    setCompositeUrl(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const canCreateShared = slotCount > 1 && !sharedSession;
  const isSharedActive = !!sharedSession;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SnapBooth</h1>
            <p className="text-sm text-gray-500">
              {sharedSession ? `Shared Session · ${sharedSession.participantCount}/${sharedSession.max}` :
               sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Capture your moments'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FrameSelector selected={frameType} onChange={setFrameType} />
            <LayoutSelector selected={layout} onChange={setLayout} />
            {canCreateShared && (
              <Button
                onClick={handleCreateSharedSession}
                loading={creatingSession}
                disabled={creatingSession}
                size="sm"
                className="!bg-purple-600 hover:!bg-purple-700 text-white"
              >
                Create Shared Session
              </Button>
            )}
          </div>
        </header>

        {camError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {camError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <CameraPreview
                videoRef={videoRef}
                mirrored={true}
                isStreaming={isStreaming}
                filter={selectedFilter}
                className="aspect-[1386/1266] w-full"
              />
              <CountdownOverlay countdown={countdown} />
            </div>

            <CameraControls
              onCapture={handleCapture}
              onStartCamera={startCamera}
              onStopCamera={stopCamera}
              isStreaming={isStreaming}
              countdownDuration={countdownDuration}
              onCountdownChange={setCountdownDuration}
              isCountingDown={isCountingDown}
              disabled={(!sharedSession && capturedFrames.length >= slotCount) || (isSharedActive && hasSubmitted)}
            />

            {filters.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Filters</h3>
                <FilterPreview
                  filters={filters}
                  selectedFilter={selectedFilter}
                  onSelect={setSelectedFilter}
                  previews={filterPreviews}
                  loading={false}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Tools: Text / Stickers */}
            {!isSharedActive && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowText(!showText)}
                  className={showText ? 'bg-gray-100' : ''}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h12M3 12h18M3 16h6" />
                    </svg>
                  }
                >Text</Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowStickers(!showStickers)}
                  className={showStickers ? 'bg-gray-100' : ''}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  }
                >Stickers</Button>
              </div>
            )}

            <TextOverlay text={customText} onChange={setCustomText} active={showText} />
            <StickerPanel
              stickers={stickers}
              onAdd={(s) => setStickers((prev) => [...prev, s])}
              onRemove={(i) => setStickers((prev) => prev.filter((_, idx) => idx !== i))}
              onUpdate={(i, s) => setStickers((prev) => prev.map((p, idx) => (idx === i ? s : p)))}
              active={showStickers}
            />

            {/* Shared Session — after submit: share panel */}
            {isSharedActive && hasSubmitted && sharedSession.status !== 'complete' && (
              <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900">Session Created!</h3>
                  <p className="text-sm text-gray-500 mt-1">Share the link so others can add their photos</p>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  {Array.from({ length: sharedSession.max }, (_, i) => {
                    const p = sharedSession.participants.find((x) => x.slot === i);
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${p ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {p ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm ${p ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                          {p ? `Participant ${i + 1}` : 'Waiting for someone...'}
                        </span>
                        {p && (
                          <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover ml-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center text-xs text-gray-400">
                  {sharedSession.participantCount}/{sharedSession.max} joined
                </div>

                {/* Invite link */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Invite link</p>
                  <p className="text-sm font-mono text-gray-700 break-all">{sharedSession.link}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm" className="flex-1"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sharedSession.link);
                        toast('Link copied!', 'success');
                      } catch { toast('Failed to copy', 'error'); }
                    }}
                  >
                    Copy Invite Link
                  </Button>
                  <Button
                    size="sm" variant="secondary" className="flex-1"
                    onClick={async () => {
                      try {
                        const qrResp = await api.getImageQrCode(sessionId || '');
                        if (qrResp.qr_code) {
                          const link = document.createElement('a');
                          link.href = `data:image/png;base64,${qrResp.qr_code}`;
                          link.download = 'session-qr.png';
                          link.click();
                          toast('QR code downloaded!', 'success');
                        }
                      } catch { toast('QR generation failed', 'error'); }
                    }}
                  >
                    Download QR
                  </Button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Waiting for participants... This page updates automatically.
                </p>
              </div>
            )}

            {/* Shared Session — after submit + complete */}
            {isSharedActive && sharedSession.status === 'complete' && compositeUrl && (
              <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm space-y-3">
                <h3 className="text-lg font-bold text-green-700 text-center">Session Complete!</h3>
                <ImagePreview src={compositeUrl} alt="Final composite" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate('/gallery')}>
                    View in Gallery
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => resetAll()}>
                    New Session
                  </Button>
                </div>
              </div>
            )}

            {/* Normal capture preview (no shared session) */}
            {!isSharedActive && (capturedFrames.length > 0 || sessionImages.length > 0) && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  <span>Captured ({capturedFrames.length}/{slotCount})</span>
                  {sessionId && !capturedFrames.length && (
                    <button onClick={() => {
                      const link = `${window.location.origin}/?session=${sessionId}`;
                      navigator.clipboard.writeText(link).then(() => toast('Session link copied!', 'success')).catch(() => {});
                    }} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share Session
                    </button>
                  )}
                </h3>
                {sessionImages.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Session photos:</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {sessionImages.map((url, i) => (
                        <img key={i} src={url} alt={`Session ${i}`} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                      ))}
                    </div>
                  </div>
                )}
                <LayoutGrid layout={layout} capturedCount={capturedFrames.length} totalSlots={slotCount} frameType={frameType}>
                  {capturedFrames.map((frame, i) => (
                    <img key={i} src={frame} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" style={{ filter: CSS_FILTERS[selectedFilter] || 'none' }} />
                  ))}
                </LayoutGrid>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSave} loading={saving} disabled={saving} size="sm" className="flex-1">
                    Save to Gallery
                  </Button>
                  <Button variant="secondary" onClick={resetAll} size="sm">
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <InviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteLink={sharedSession?.link || ''}
        maxParticipants={sharedSession?.max || 2}
        expiresAt=""
      />

      {compositeUrl && !isSharedActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCompositeUrl(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Session Complete!</h2>
            <ImagePreview src={compositeUrl} alt="Final composite" />
            <p className="text-sm text-gray-500 text-center">Share this final photo with everyone in the session.</p>
            <div className="flex gap-3">
              <Button size="sm" className="flex-1" onClick={() => {
                const a = document.createElement('a');
                a.href = compositeUrl;
                a.download = 'snapbooth-final.jpg';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}>Download</Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}${compositeUrl}`);
                  toast('Link copied!', 'success');
                } catch { toast('Failed to copy', 'error'); }
              }}>Copy Link</Button>
              <Button size="sm" variant="ghost" onClick={() => setCompositeUrl(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
