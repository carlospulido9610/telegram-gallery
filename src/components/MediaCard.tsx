'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ContentItem {
  id: string;
  fecha: string;
  tipo: string;
  sender: string;
  texto_limpio: string | null;
  media_urls: string[];
  thumbnail_urls?: string[] | null;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

/* ---------- Download helper ---------- */
function downloadUrl(url: string, filename?: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || url.split('/').pop()?.split('?')[0] || 'download';
  // For cross-origin URLs, open in new tab as fallback (a.download only works same-origin)
  if (new URL(url, location.origin).origin !== location.origin) {
    window.open(url, '_blank');
  } else {
    a.click();
  }
}

function downloadAll(urls: string[]) {
  urls.forEach((url, i) => {
    setTimeout(() => downloadUrl(url), i * 300);
  });
}

function getFilename(url: string) {
  return url.split('/').pop()?.split('?')[0] || 'download';
}

/* ---------- Video: show first frame as poster via preload="metadata" ---------- */
function VideoMedia({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);

  // Before playing: show video paused at first frame with play button overlay.
  // preload="metadata" tells the browser to download only enough to show the poster frame.
  if (!playing) {
    return (
      <div className="relative bg-black">
        <video
          src={url}
          preload="metadata"
          muted
          playsInline
          className="w-full block"
          // Pause at first frame — the browser renders the poster automatically
          onLoadedData={(e) => {
            const vid = e.currentTarget;
            vid.currentTime = 0.5; // seek slightly in for a better preview frame
          }}
        />
        {/* Dark gradient + play button overlay */}
        <button
          onClick={() => setPlaying(true)}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/15 transition-colors"
        >
          <span className="w-16 h-16 rounded-full bg-purple-600/90 hover:bg-purple-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[11px] font-medium">
          ▶ Video
        </span>
      </div>
    );
  }

  return (
    <video
      src={url}
      preload="auto"
      controls
      autoPlay
      playsInline
      className="w-full block bg-black"
    />
  );
}

/* ---------- Album carousel: ONE photo visible at a time ---------- */
function AlbumCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  const total = urls.length;
  const go = (dir: number) => setIndex((i) => (i + dir + total) % total);

  return (
    <div className="relative bg-black select-none">
      <div className="relative aspect-[3/4] bg-gray-900 overflow-hidden">
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
            draggable={false}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${
              i === index ? 'opacity-100 z-10' : 'opacity-0'
            }`}
          />
        ))}

        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/65 text-white text-xs font-medium backdrop-blur-sm">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-black/40">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-purple-500' : 'w-1.5 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Single media ---------- */
function SingleMedia({ url }: { url: string }) {
  if (isVideo(url)) return <VideoMedia url={url} />;
  return (
    <div className="bg-black">
      <img src={url} alt="" loading="lazy" className="w-full block" />
    </div>
  );
}

/* ---------- Main card with delete ---------- */
export default function MediaCard({
  item,
  onDeleted,
}: {
  item: ContentItem;
  onDeleted?: (id: string) => void;
}) {
  const isAlbum = item.tipo === 'album' && item.media_urls.length > 1;
  const onlyVideos = item.media_urls.length > 0 && item.media_urls.every(isVideo);

  let badge = '';
  if (isAlbum) badge = 'Album';
  else if (onlyVideos) badge = 'Video';
  else if (item.tipo === 'video') badge = 'Video';

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!supabase) return;
    setDeleting(true);
    const { error } = await supabase.from('contents').delete().eq('id', item.id);
    setDeleting(false);
    if (!error) {
      onDeleted?.(item.id);
    } else {
      alert('Error: ' + error.message);
      setConfirming(false);
    }
  };

  return (
    <div className="masonry-item bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
      {isAlbum ? (
        <AlbumCarousel urls={item.media_urls} />
      ) : (
        <SingleMedia url={item.media_urls[0]} />
      )}

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {badge && (
              <span className="px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-300 text-[11px] font-semibold uppercase tracking-wide">
                {badge}
              </span>
            )}
            {item.fecha && (
              <span className="text-xs text-gray-500">
                {new Date(item.fecha).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {item.sender && <span className="text-xs text-purple-400">@{item.sender}</span>}
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-1">
            {/* Download button */}
            <button
              onClick={() =>
                isAlbum
                  ? downloadAll(item.media_urls)
                  : downloadUrl(item.media_urls[0])
              }
              aria-label="Download"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
              title={isAlbum ? `Download all ${item.media_urls.length} files` : 'Download'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                aria-label="Delete"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {item.texto_limpio && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
            {item.texto_limpio}
          </p>
        )}
      </div>
    </div>
  );
}
