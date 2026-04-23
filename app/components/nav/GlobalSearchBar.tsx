'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  contentId: string;
  title: string;
  addr1: string;
  firstImage: string;
  contentTypeId: number;
  cat2: string;
}

const CONTENT_TYPE_LABELS: Record<number, string> = {
  12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`relative flex items-center transition-all duration-200 ${
          focused ? 'w-[400px]' : 'w-72'
        }`}
      >
        <Search size={16} className="absolute left-3 text-ink-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setShowResults(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="장소·축제 검색"
          className="w-full h-10 pl-9 pr-9 rounded-md border border-line bg-surface-elevated text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-2 text-ink-4 hover:text-ink-1 transition-colors"
            aria-label="지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full right-0 mt-2 w-[400px] bg-surface-elevated rounded-lg border border-line shadow-[var(--shadow-raised)] max-h-96 overflow-y-auto z-50">
          {loading && <div className="p-4 text-center text-sm text-ink-3">검색 중...</div>}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-ink-3">검색 결과 없음</div>
          )}
          {!loading && results.map((r) => (
            <Link
              key={r.contentId}
              href={`/?spot=${r.contentId}`}
              onClick={() => setShowResults(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken transition-colors border-b border-line last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1 truncate">{r.title}</p>
                <p className="text-xs text-ink-3 truncate">
                  {CONTENT_TYPE_LABELS[r.contentTypeId] ?? ''} · {r.addr1}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
