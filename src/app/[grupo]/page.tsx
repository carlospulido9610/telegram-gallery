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

type FilterType = 'todo' | 'fotos' | 'videos' | 'albums' | 'duplicados';

// Grupos protegidos: se necesita el código numérico para ver el contenido
const PROTECTED_SLUGS = new Set(['content-of']);
const ACCESS_CODE = '4522';

const PAGE_SIZE = 24;

export default function GrupoPage() {
  const params = useParams();
  const grupoSlug = params.grupo as string;

  const [allContents, setAllContents] = useState<Content[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todo');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateFilter, setDateFilter] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Gate de código para grupos protegidos
  const protegido = PROTECTED_SLUGS.has(grupoSlug);
  const [codeOk, setCodeOk] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (protegido && typeof window !== 'undefined') {
      if (sessionStorage.getItem('gallery_code_ok') === '1') setCodeOk(true);
    }
  }, [protegido]);

  useEffect(() => {
    if (protegido && !codeOk) return; // no cargar nada hasta ingresar el código
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
  }, [grupoSlug, protegido, codeOk]);

  // Fechas únicas disponibles para el filtro por fecha
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(allContents.map((c) => (c.fecha || '').slice(0, 10))));
    return dates.filter(Boolean).sort((a, b) => (a < b ? 1 : -1));
  }, [allContents]);

  const filtered = useMemo(() => {
    let result: Content[];
    switch (filter) {
      case 'fotos':
        result = allContents.filter(
          (c) => c.tipo === 'foto' || (c.tipo === 'album' && c.media_urls.length > 1)
        );
        break;
      case 'videos':
        result = allContents.filter((c) => c.tipo === 'video');
        break;
      case 'albums':
        result = allContents.filter((c) => c.tipo === 'album' && c.media_urls.length > 1);
        break;
      case 'duplicados': {
        // Mismo grupo + mismos archivos = duplicado
        const seen = new Map<string, number>();
        for (const c of allContents) {
          const key = c.media_urls.join('|');
          seen.set(key, (seen.get(key) || 0) + 1);
        }
        result = allContents.filter((c) => (seen.get(c.media_urls.join('|')) || 0) > 1);
        break;
      }
      default:
        result = allContents;
    }

    if (dateFilter) {
      result = result.filter((c) => (c.fecha || '').slice(0, 10) === dateFilter);
    }

    return [...result].sort((a, b) => {
      const fa = a.fecha || '';
      const fb = b.fecha || '';
      return sortOrder === 'desc' ? (fa < fb ? 1 : -1) : (fa > fb ? 1 : -1);
    });
  }, [allContents, filter, dateFilter, sortOrder]);

  const visible = filtered.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    // Small delay to show loading state
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    }, 200);
  }, []);

  // Reset visible count when filter/date/order changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, dateFilter, sortOrder]);

  // Pantalla de código para grupos protegidos
  if (protegido && !codeOk) {
    const submitCode = () => {
      if (codeInput.trim() === ACCESS_CODE) {
        sessionStorage.setItem('gallery_code_ok', '1');
        setCodeOk(true);
        setCodeError('');
      } else {
        setCodeError('Código incorrecto');
      }
    };
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Contenido privado</h1>
          <p className="text-gray-400 text-sm mb-6">
            Ingresa el código numérico para acceder.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCode()}
            placeholder="••••"
            autoFocus
            className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 rounded-xl bg-black border border-gray-700 text-white focus:border-purple-500 focus:outline-none mb-3"
          />
          {codeError && <p className="text-red-400 text-sm mb-3">{codeError}</p>}
          <button
            onClick={submitCode}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Entrar
          </button>
          <Link href="/" className="block text-gray-500 hover:text-gray-300 text-sm mt-4">
            &larr; Volver
          </Link>
        </div>
      </div>
    );
  }

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
    { key: 'duplicados', label: 'Duplicados' },
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

      <div className="flex flex-wrap items-center gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}

        {/* Filtro por fecha */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filtrar por fecha"
          className="px-3 py-2 rounded-full text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 cursor-pointer"
        >
          <option value="">Todas las fechas</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>
              {new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </option>
          ))}
        </select>

        {/* Orden: recientes / antiguos */}
        <button
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="filter-btn"
          title="Cambiar orden"
        >
          {sortOrder === 'desc' ? '↓ Recientes' : '↑ Antiguos'}
        </button>

        {(dateFilter || filter !== 'todo') && (
          <button
            onClick={() => {
              setDateFilter('');
              setFilter('todo');
            }}
            className="px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-300"
          >
            ✕ Limpiar
          </button>
        )}
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
