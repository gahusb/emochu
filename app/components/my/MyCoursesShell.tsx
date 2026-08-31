'use client';

// 「내 코스」 — 로그인의 존재 이유.
//
// 이게 없으면 로그인은 사용자에게 아무것도 해주지 않는다.
// 기기를 바꿔도 내가 만든 코스가 남아 있는 것, 그게 로그인의 전부다.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookMarked, Loader2, MapPin, LogIn } from 'lucide-react';
import Container from '@/app/components/ui/Container';
import { createClient } from '@/lib/supabase/client';
import { AUTH_ENABLED, AUTH_PROVIDER, AUTH_PROVIDER_LABEL } from '@/lib/auth-provider';

interface MyCourse {
  slug: string;
  title: string;
  summary: string;
  stopCount: number;
  totalDistanceKm: number;
  imageUrl?: string;
  createdAt: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'ready'; courses: MyCourse[] }
  | { kind: 'error'; message: string };

export default function MyCoursesShell() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!AUTH_ENABLED) { setState({ kind: 'anonymous' }); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my/courses');
        if (cancelled) return;
        if (res.status === 401) { setState({ kind: 'anonymous' }); return; }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? '목록을 불러오지 못했어요.');
        setState({ kind: 'ready', courses: json.courses as MyCourse[] });
      } catch (err) {
        if (!cancelled) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : '목록을 불러오지 못했어요.' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    await createClient().auth.signInWithOAuth({
      provider: AUTH_PROVIDER,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/my` },
    });
  };

  return (
    <Container>
      <div className="py-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-1 mb-1">
          <BookMarked size={20} className="text-brand" aria-hidden="true" />
          내 코스
        </h1>
        <p className="text-sm text-ink-3 mb-6">기기를 바꿔도 남아 있어요.</p>

        {state.kind === 'loading' && (
          <p className="py-16 flex items-center justify-center gap-2 text-sm text-ink-3">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            불러오는 중…
          </p>
        )}

        {state.kind === 'anonymous' && (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-3 break-keep mb-5">
              {AUTH_ENABLED
                ? '로그인하면 만든 코스가 기기를 바꿔도 남아요.'
                : '로그인 기능은 아직 준비 중이에요. 만든 코스는 이 브라우저에 저장돼 있어요.'}
            </p>
            {AUTH_ENABLED && (
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
              >
                <LogIn size={16} aria-hidden="true" />
                {AUTH_PROVIDER_LABEL[AUTH_PROVIDER]}로 시작하기
              </button>
            )}
          </div>
        )}

        {state.kind === 'error' && (
          <p role="alert" className="py-16 text-sm text-red-500 text-center">{state.message}</p>
        )}

        {state.kind === 'ready' && state.courses.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-3 break-keep mb-5">아직 저장된 코스가 없어요.</p>
            <Link
              href="/course"
              className="inline-flex items-center h-11 px-5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
            >
              첫 코스 만들기
            </Link>
          </div>
        )}

        {state.kind === 'ready' && state.courses.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {state.courses.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/course/${c.slug}`}
                  className="flex gap-3 p-3 rounded-xl border border-line bg-surface-elevated hover:border-brand transition-colors"
                >
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-sunken">
                    {c.imageUrl
                      ? <Image src={c.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-ink-4"><MapPin size={20} /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-1 line-clamp-2">{c.title}</p>
                    <p className="text-xs text-ink-3 line-clamp-2 mt-0.5">{c.summary}</p>
                    <p className="text-xs text-ink-4 mt-1">
                      📍 {c.stopCount}곳
                      {c.totalDistanceKm > 0 && ` · 🚗 ${c.totalDistanceKm}km`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
