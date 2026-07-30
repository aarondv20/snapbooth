import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';
import { ImagePreview } from '../common/ImagePreview';
import type { CapturedImage } from '../../types';
import * as api from '../../services/api';

interface ImagePreviewModalProps {
  image: CapturedImage | null;
  open: boolean;
  onClose: () => void;
  onFavouriteToggle: () => void;
  onDelete: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  open,
  onClose,
  onFavouriteToggle,
  onDelete,
}) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && image) {
      api.getImageQrCode(image.id).then((r) => setQrCode(r.qr_code)).catch(() => {});
    } else {
      setQrCode(null);
    }
  }, [open, image]);

  if (!image) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await api.getImageDownloadUrl(image.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapbooth_${image.id.slice(0, 8)}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Download started', 'success');
    } catch {
      toast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <ImagePreview src={image.image_url} alt="Captured" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={image.is_favourite ? 'primary' : 'secondary'}
            size="sm"
            onClick={onFavouriteToggle}
            icon={
              <svg className="w-4 h-4" fill={image.is_favourite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
          >
            {image.is_favourite ? 'Favourited' : 'Favourite'}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleDownload} loading={downloading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Download
          </Button>

          <Button variant="danger" size="sm" onClick={onDelete}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Delete
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Filter:</span>{' '}
            <span className="font-medium capitalize">{image.filter_applied}</span>
          </div>
          <div>
            <span className="text-gray-400">Size:</span>{' '}
            <span className="font-medium">
              {image.width}×{image.height}
            </span>
          </div>
          <div>
            <span className="text-gray-400">File size:</span>{' '}
            <span className="font-medium">
              {image.file_size ? `${(image.file_size / 1024).toFixed(1)} KB` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Date:</span>{' '}
            <span className="font-medium">
              {new Date(image.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {qrCode && (
          <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500">Share via QR code</span>
            <img src={qrCode} alt="QR Code" className="w-24 h-24" />
          </div>
        )}
      </div>
    </Modal>
  );
};
