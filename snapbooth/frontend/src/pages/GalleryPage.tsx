import React, { useState, useCallback } from 'react';
import { useGallery } from '../hooks/useGallery';
import { GalleryToolbar } from '../components/Gallery/GalleryToolbar';
import { GalleryGrid } from '../components/Gallery/GalleryGrid';
import { ImagePreviewModal } from '../components/Gallery/ImagePreviewModal';
import { Pagination } from '../components/Gallery/Pagination';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { toast } from '../components/common/Toast';
import type { CapturedImage } from '../types';

export const GalleryPage: React.FC = () => {
  const {
    images, total, page, pageSize, loading, error,
    search, sort, favouritesOnly,
    setSearch, setSort, setFavouritesOnly, setPage,
    toggleFavourite, removeImage,
  } = useGallery();

  const [previewImage, setPreviewImage] = useState<CapturedImage | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      await removeImage(id);
      if (previewImage?.id === id) setPreviewImage(null);
      toast('Photo deleted', 'info');
    },
    [removeImage, previewImage]
  );

  const handleFavouriteToggle = useCallback(
    async (id: string) => {
      await toggleFavourite(id);
      if (previewImage?.id === id) {
        const updated = images.find((i) => i.id === id);
        if (updated) setPreviewImage(updated);
      }
    },
    [toggleFavourite, previewImage, images]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500">Your captured moments</p>
        </header>

        <GalleryToolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          favouritesOnly={favouritesOnly}
          onFavouritesToggle={setFavouritesOnly}
          total={total}
        />

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size={32} />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && images.length === 0 && (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title={favouritesOnly ? 'No favourite photos yet' : 'No photos yet'}
            description={favouritesOnly ? 'Favourite some photos to see them here.' : 'Capture your first photo to get started.'}
          />
        )}

        {!loading && images.length > 0 && (
          <>
            <GalleryGrid
              images={images}
              onImageClick={(id) => {
                const img = images.find((i) => i.id === id);
                if (img) setPreviewImage(img);
              }}
              onToggleFavourite={handleFavouriteToggle}
              onDelete={handleDelete}
            />
            <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}

        <ImagePreviewModal
          image={previewImage}
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          onFavouriteToggle={() => previewImage && handleFavouriteToggle(previewImage.id)}
          onDelete={() => previewImage && handleDelete(previewImage.id)}
        />
      </div>
    </div>
  );
};
