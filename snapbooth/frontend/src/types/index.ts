export interface CapturedImage {
  id: string;
  session_id: string;
  filename: string;
  thumbnail_url: string;
  image_url: string;
  filter_applied: string;
  is_favourite: boolean;
  layout: string | null;
  custom_text: string | null;
  stickers_data: Sticker[] | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
}

export interface CaptureResponse {
  id: string;
  session_id: string;
  filename: string;
  thumbnail_url: string;
  image_url: string;
  filter_applied: string;
  created_at: string;
}

export interface GalleryResponse {
  images: CapturedImage[];
  total: number;
  page: number;
  page_size: number;
}

export interface FilterInfo {
  id: string;
  name: string;
  description: string;
}

export interface Sticker {
  id: string;
  emoji: string;
  label?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface StickerPreset {
  id: string;
  emoji: string;
  label: string;
}

export type LayoutType = 'single' | 'strip' | '2x2' | '2x1_side';
export type FrameType = 'none' | 'simple' | 'instax' | 'polaroid' | 'film';
export type CountdownDuration = 0 | 3 | 5 | 10;
export type SortOption = 'newest' | 'oldest' | 'size';
export type ExportFormat = 'png' | 'jpeg' | 'pdf';
