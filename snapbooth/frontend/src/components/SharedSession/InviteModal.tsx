import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  inviteLink: string;
  maxParticipants: number;
  expiresAt?: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  open, onClose, inviteLink, maxParticipants, expiresAt,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast('Link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5 text-center">
        <div className="text-5xl">🔗</div>
        <h2 className="text-xl font-bold text-gray-900">Shared Session Created!</h2>
        <p className="text-sm text-gray-500">
          Share this link with up to {maxParticipants - 1} friend{maxParticipants - 1 > 1 ? 's' : ''} so they can add their photos.
        </p>

        <div className="bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-700 break-all border border-gray-200">
          {inviteLink}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1">
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>👥 {maxParticipants} slots</span>
          {expiresAt && <span>⏱️ Expires in 24h</span>}
        </div>

        <p className="text-xs text-gray-400">
          Now capture your photo — it will be automatically added as the first participant.
        </p>

        <Button variant="secondary" onClick={onClose} className="w-full">
          Got it — Capture My Photo
        </Button>
      </div>
    </Modal>
  );
};
