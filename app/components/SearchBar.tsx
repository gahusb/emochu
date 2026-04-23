'use client';

import { useState, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';

interface SearchResult {
  contentId: string;
  title: string;
  addr1: string;
  firstImage: string;
  contentTypeId: number;
  cat2: string;
}

interface Props {
  onSelectSpot?: (contentId: string) => void;
}

const POPULAR_KEYWORDS = ['벚꽃', '야경', '맛집', '카페', '전시', '바다'];

const CONTENT_TYPE_LABELS: Record<number, string> = {
  12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
};

export default function SearchBar({ onSelectSpot }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = async (keyword: string) => {
    if (keyword.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&numOfRows=8`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleTagClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소·축제 검색"
          className="w-full pl-10 pr-10 h-12 rounded-lg bg-surface-elevated border border-line text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-1 transition-colors"
            aria-label="지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!showResults && (
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => handleTagClick(kw)}
              className="px-3 h-8 rounded-md bg-surface-elevated border border-line text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated rounded-lg border border-line shadow-[var(--shadow-raised)] max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-sm text-ink-3">검색 중...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-ink-3">
              검색 결과가 없어요
            </div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.contentId}
              onClick={() => {
                onSelectSpot?.(r.contentId);
                setShowResults(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-surface-sunken transition-colors border-b border-line last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-ink-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1 truncate">{r.title}</p>
                <p className="text-xs text-ink-3 truncate">
                  {CONTENT_TYPE_LABELS[r.contentTypeId] ?? ''} · {r.addr1}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
