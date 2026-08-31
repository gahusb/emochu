'use client';

// 로그인 진입점.
//
// 🔴 로그인이 꺼져 있으면 **아무것도 렌더링하지 않는다.** Supabase 대시보드에서
//    카카오 OAuth 설정이 끝나기 전에 버튼만 띄우면, 눌렀을 때 에러만 나는
//    「고장난 버튼」이 된다. 그건 로그인이 없는 것보다 나쁘다.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogIn, LogOut, BookMarked, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AUTH_ENABLED, AUTH_PROVIDER } from '@/lib/auth-provider';

interface Props {
  /** 모바일 헤더처럼 자리가 좁은 곳에서 쓰는 아이콘 전용 변형. */
  variant?: 'default' | 'compact';
}

export default function AuthButton({ variant = 'default' }: Props) {
  const compact = variant === 'compact';
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = createClient();

    supabase.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null))
      .finally(() => setReady(true));

    // 다른 탭에서 로그인/로그아웃해도 이 화면이 따라가야 한다.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!AUTH_ENABLED) return null;

  const handleLogin = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: AUTH_PROVIDER,
        options: {
          // 로그인 뒤 보던 화면으로 돌아온다. 홈으로 튕기면 하던 일이 끊긴다.
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`,
        },
      });
    } catch {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      setUserId(null);
    } finally {
      setBusy(false);
    }
  };

  // 🔴 예전엔 세션 확인이 끝날 때까지 빈 div 를 그렸다(깜빡임을 피하려고).
  //    그런데 확인이 어떤 이유로든 안 끝나면 **버튼이 영영 안 보인다** —
  //    로그인할 방법 자체가 사라진다. 깜빡임보다 훨씬 나쁘다.
  //    그래서 기본값을 「로그인」으로 두고, 세션이 확인되면 「내 코스」로 바꾼다.
  //    최악의 경우에도 사용자는 누를 수 있는 버튼을 본다.
  if (!userId) {
    return (
      <button
        type="button"
        onClick={handleLogin}
        disabled={busy}
        aria-label={compact ? '로그인' : undefined}
        className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold text-ink-2 hover:bg-surface-sunken disabled:opacity-60 transition-colors ${compact ? 'w-9' : 'px-3'}`}
      >
        {busy || !ready
          ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          : <LogIn size={15} aria-hidden="true" />}
        {!compact && '로그인'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/my"
        aria-label={compact ? '내 코스' : undefined}
        className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold text-ink-2 hover:bg-surface-sunken transition-colors ${compact ? 'w-9' : 'px-3'}`}
      >
        <BookMarked size={15} aria-hidden="true" />
        {!compact && '내 코스'}
      </Link>
      {/* 좁은 화면에서는 로그아웃까지 넣으면 헤더가 터진다. 내 코스 화면에서 하도록 둔다. */}
      {!compact && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          aria-label="로그아웃"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-3 hover:bg-surface-sunken disabled:opacity-60 transition-colors"
        >
          <LogOut size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
