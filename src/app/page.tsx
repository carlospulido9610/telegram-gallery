'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Grupo {
  id: string;
  name: string;
  slug: string;
  content_count: number;
}

export default function HomePage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured.');
      setLoading(false);
      return;
    }
    const client = supabase;
    async function fetchGrupos() {
      const { data, error: fetchError } = await client
        .from('groups')
        .select('id, name, slug, contents(count)')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const gruposWithCount = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        content_count: g.contents[0]?.count || 0,
      }));

      setGrupos(gruposWithCount);
      setLoading(false);
    }
    fetchGrupos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-300 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">{'\uD83D\uDCF8'} Telegram Gallery</h1>
        <p className="text-gray-400 text-lg">Browse photos &amp; videos from Telegram groups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grupos.map((grupo) => (
          <Link
            key={grupo.id}
            href={`/${grupo.slug}`}
            className="group bg-gray-900 rounded-2xl p-6 hover:bg-gray-800 transition-all hover:scale-[1.02]"
          >
            <div className="text-3xl mb-4">{'\uD83D\uDCAC'}</div>
            <h2 className="text-xl font-semibold text-white mb-2">{grupo.name}</h2>
            <p className="text-gray-400">
              {grupo.content_count} {grupo.content_count === 1 ? 'item' : 'items'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
