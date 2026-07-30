import { useState, useCallback, useEffect } from 'react';
import type { CapturedImage, SortOption } from '../types';
import * as api from '../services/api';

interface UseGalleryReturn {
  images: CapturedImage[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  search: string;
  sort: SortOption;
  favouritesOnly: boolean;
  setSearch: (v: string) => void;
  setSort: (v: SortOption) => void;
  setFavouritesOnly: (v: boolean) => void;
  setPage: (v: number) => void;
  refresh: () => Promise<void>;
  toggleFavourite: (id: string) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
}

export function useGallery(): UseGalleryReturn {
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getGallery(page, pageSize, search || undefined, sort, favouritesOnly);
      setImages(result.images);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sort, favouritesOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleFavourite = useCallback(
    async (id: string) => {
      const img = images.find((i) => i.id === id);
      if (!img) return;
      try {
        const updated = await api.updateImage(id, { is_favourite: !img.is_favourite });
        setImages((prev) => prev.map((i) => (i.id === id ? updated : i)));
      } catch (err: any) {
        setError(err.message);
      }
    },
    [images]
  );

  const removeImage = useCallback(
    async (id: string) => {
      try {
        await api.deleteImage(id);
        setImages((prev) => prev.filter((i) => i.id !== id));
        setTotal((prev) => prev - 1);
      } catch (err: any) {
        setError(err.message);
      }
    },
    []
  );

  return {
    images,
    total,
    page,
    pageSize,
    loading,
    error,
    search,
    sort,
    favouritesOnly,
    setSearch,
    setSort,
    setFavouritesOnly,
    setPage,
    refresh,
    toggleFavourite,
    removeImage,
  };
}
