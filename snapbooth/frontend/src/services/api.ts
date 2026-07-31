import axios from 'axios';
import type {
  CaptureResponse,
  GalleryResponse,
  CapturedImage,
  FilterInfo,
  ExportFormat,
  Sticker,
} from '../types';
import { getAnonymousId } from '../utils/anonymousId';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.headers['X-Anonymous-ID'] = getAnonymousId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function captureImage(
  imageData: string,
  filter: string,
  layout: string,
  layoutPosition: number,
  sessionId?: string,
  customText?: string,
  stickers?: Sticker[],
  frameType = 'simple'
): Promise<CaptureResponse> {
  const { data } = await api.post('/capture/', {
    image_data: imageData,
    filter,
    layout,
    layout_position: layoutPosition,
    session_id: sessionId,
    custom_text: customText,
    stickers_data: stickers,
    frame_type: frameType,
  });
  return data;
}

export async function getGallery(
  page = 1,
  pageSize = 20,
  search?: string,
  sort = 'newest',
  favouritesOnly = false
): Promise<GalleryResponse> {
  const { data } = await api.get('/gallery/', {
    params: { page, page_size: pageSize, search, sort, favourites_only: favouritesOnly },
  });
  return data;
}

export async function getImage(imageId: string): Promise<CapturedImage> {
  const { data } = await api.get(`/gallery/${imageId}`);
  return data;
}

export async function updateImage(
  imageId: string,
  updates: { is_favourite?: boolean; custom_text?: string; filter_applied?: string }
): Promise<CapturedImage> {
  const { data } = await api.patch(`/gallery/${imageId}`, updates);
  return data;
}

export async function deleteImage(imageId: string): Promise<void> {
  await api.delete(`/gallery/${imageId}`);
}

export async function exportImages(imageIds: string[], format: ExportFormat): Promise<Blob> {
  const { data } = await api.post(
    '/gallery/export',
    { image_ids: imageIds, format },
    { responseType: 'blob' }
  );
  return data;
}

export async function getImageDownloadUrl(imageId: string, fmt = 'jpg'): Promise<string> {
  const { data } = await api.get(`/gallery/${imageId}/download`, {
    params: { fmt },
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}

export async function getImageQrCode(imageId: string): Promise<{ qr_code: string; share_url: string }> {
  const { data } = await api.get(`/gallery/${imageId}/qr`);
  return data;
}

export async function getFilters(): Promise<FilterInfo[]> {
  const { data } = await api.get('/filters/');
  return data;
}

export async function previewFilter(imageData: string, filter: string): Promise<string> {
  const { data } = await api.post('/filters/preview', { image_data: imageData, filter });
  return data.preview_data;
}

export async function getSession(sessionId: string): Promise<{
  id: string; layout: string; images: { id: string; image_url: string; thumbnail_url: string; filter_applied: string; layout_position: number }[]
}> {
  const { data } = await api.get(`/capture/sessions/${sessionId}`);
  return data;
}

export async function getSessionShare(sessionId: string): Promise<{ share_url: string; qr_code: string; session_id: string }> {
  const { data } = await api.get(`/gallery/sessions/${sessionId}/share`);
  return data;
}

export async function captureComposite(
  images: string[],
  filter: string,
  layout: string,
  frameType = 'simple'
): Promise<CaptureResponse> {
  const { data } = await api.post('/capture/composite', {
    images,
    filter,
    layout,
    frame_type: frameType,
  });
  return data;
}

export async function generateComposite(sessionId: string, frameType = 'simple'): Promise<{ session_id: string; composite_url: string; layout: string; frame_type: string; image_count: number }> {
  const { data } = await api.post(`/capture/sessions/${sessionId}/composite`, null, { params: { frame_type: frameType } });
  return data;
}

export async function createSharedSession(layout: string, frameType: string, filterName: string): Promise<{
  session_id: string; invite_token: string; invite_link: string; expires_at: string; max_participants: number; layout: string
}> {
  const { data } = await api.post('/sessions/create', { layout, frame_type: frameType, filter_name: filterName });
  return data;
}

export async function getSessionInfo(token: string): Promise<{
  session_id: string; invite_token: string; layout: string; frame_type: string; filter_name: string;
  max_participants: number; participant_count: number; expires_at: string; status: string;
  composite_url: string | null; participants: { slot: number; image_url: string; thumbnail_url: string; created_at: string }[]
}> {
  const { data } = await api.get(`/sessions/${token}`);
  return data;
}

export async function captureToSession(token: string, imageData: string): Promise<any> {
  const { data } = await api.post(`/sessions/${token}/capture`, { image_data: imageData });
  return data;
}

export async function finalizeSession(token: string): Promise<any> {
  const { data } = await api.post(`/sessions/${token}/finalize`);
  return data;
}

export const SHARE_BASE = window.location.origin;

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get('/health');
  return data;
}
