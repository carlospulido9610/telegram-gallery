'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MediaCard from '@/components/MediaCard';

interface Content {
  id: string;
  grupo: string;
  fecha: string;
  tipo: string;
  sender: string;
  texto_limpio: string | null;
  media_urls: string[];
  thumbnail_urls?: string[] | null;
  created_at: string;
}

type FilterType = 'todo' | 'fotos' | 'videos' | 'albums';

const PAGE_SIZE = 24;

export default function GrupoPage() {
  const params = useParams();
  const grupoSlug = params.grupo as string;

  const [allContents, setAllContents] = useState<Content[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todo');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured.');
      setLoading(false);
      return;
    }
    const client = supabase;
    async function fetchContents() {
      const { data: groupData } = await client
        .from('groups')
        .select('name')
        .eq('slug', grupoSlug)
        .single();

      if (groupData) setGroupName(groupData.name);

      // Fetch total count
      const { count } = await client
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('telegram_group', grupoSlug);

      setTotalCount(count || 0);

      // Fetch all content (we paginate client-side for instant filter switching)
      const { data, error: fetchError } = await client
        .from('contents')
        .select('*')
        .eq('telegram_group', grupoSlug)
        .order('fecha', { ascending: false })
        .limit(500);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setAllContents(data || []);
      setLoading(false);
    }
    fetchContents();
  }, [grupoSlug]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'fotos':
        return allContents.filter(
          (c) => c.tipo === 'foto' || (c.tipo === 'album' && c.media_urls.length > 1)
        );
      case 'videos':
        return allContents.filter((c) => c.tipo === 'video');
      case 'albums':
        return allContents.filter((c) => c.tipo === 'album' && c.media_urls.length > 1);
      default:
        return allContents;
    }
  }, [allContents, filter]);

  const visible = filtered.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    // Small delay to show loading state
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    }, 200);
  }, []);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
          &larr; Back
        </Link>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 max-w-md text-center">
            <p className="text-red-300 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'todo', label: 'Todo' },
    { key: 'fotos', label: 'Fotos' },
    { key: 'videos', label: 'Videos' },
    { key: 'albums', label: 'Albums' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">{groupName || grupoSlug}</h1>
        <p className="text-gray-400 mt-1">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          {totalCount > filtered.length && ` of ${totalCount}`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No content found</div>
      ) : (
        <>
          <div className="masonry">
            {visible.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onDeleted={(id) => setAllContents((prev) => prev.filter((c) => c.id !== id))}
              />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-8 mb-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Load more (${filtered.length - visibleCount} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
