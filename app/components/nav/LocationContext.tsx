'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  name: string;
}

interface LocationContextValue {
  location: UserLocation | null;
  setLocation: (loc: UserLocation) => void;
  recentLocations: UserLocation[];
  requestGPS: () => Promise<boolean>;  // true: 성공, false: 거부/실패
  gpsPermissionDenied: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const DEFAULT_SEOUL: UserLocation = { lat: 37.5665, lng: 126.978, name: '서울' };
const STORAGE_KEY = 'emochu.recent_locations';
const MAX_RECENT = 5;

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<UserLocation | null>(null);
  const [recentLocations, setRecentLocations] = useState<UserLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecentLocations(JSON.parse(raw));
    } catch {
      /* ignore */
    }

    if (!navigator.geolocation) {
      setLocationState(DEFAULT_SEOUL);
      return;
    }

    // 콜드 프롬프트 제거 — Permissions API로 분기.
    // granted: 끊김 없이 위치 / 그 외(prompt·denied·미지원): 서울 소프트 기본
    // (실제 권한 요청은 LocationPermissionToast가 맥락과 함께 유도)
    if (!navigator.permissions?.query) {
      setLocationState(DEFAULT_SEOUL);
      return;
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setLocationState({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: '내 근처' }),
            () => setLocationState(DEFAULT_SEOUL),
            { timeout: 5000 },
          );
        } else {
          setLocationState(DEFAULT_SEOUL);
        }
      })
      .catch(() => setLocationState(DEFAULT_SEOUL));
  }, []);

  const setLocation = (loc: UserLocation) => {
    setLocationState(loc);
    setRecentLocations((prev) => {
      const filtered = prev.filter(
        (p) => !(p.lat === loc.lat && p.lng === loc.lng),
      );
      const next = [loc, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const requestGPS = (): Promise<boolean> => {
    if (!navigator.geolocation) return Promise.resolve(false);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermissionDenied(false);
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: '내 근처',
          });
          resolve(true);
        },
        (err) => {
          if (err.code === 1) setGpsPermissionDenied(true);
          resolve(false);
        },
        { timeout: 5000 },
      );
    });
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        recentLocations,
        requestGPS,
        gpsPermissionDenied,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
