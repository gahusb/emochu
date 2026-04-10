'use client';

import { useState, useRef } from 'react';

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

  const CONTENT_TYPE_LABELS: Record<number, string> = {
    12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
  };

  return (
    <div className="relative">
      {/* 검색 입력 */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소나 키워드로 검색해보세요"
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-orange-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 shadow-sm transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* 인기 키워드 태그 */}
      {!showResults && (
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_KEYWORDS.map(kw => (
            <button
              key={kw}
              onClick={() => handleTagClick(kw)}
              className="px-3 py-1.5 bg-white border border-orange-100 rounded-full text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-orange-100 shadow-lg max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-sm text-slate-400">검색 중...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-slate-400">
              검색 결과가 없어요 😅
            </div>
          )}
          {!loading && results.map(r => (
            <button
              key={r.contentId}
              onClick={() => {
                onSelectSpot?.(r.contentId);
                setShowResults(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-xs">📍</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">{r.title}</p>
                <p className="text-[11px] text-slate-400 truncate">
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
