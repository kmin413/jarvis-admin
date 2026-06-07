/**
 * 백엔드 API 클라이언트 (FastAPI + SQLite, localhost:8200).
 * Vite proxy로 /api/* → 백엔드.
 * Authorization 헤더는 tokenStore에서 자동 첨부.
 */
const BASE = '';
const TOKEN_KEY = 'ogam.token';

// ─── 토큰 저장 ───
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ─── 타입 ───
export interface ApiTheme {
  id: number;
  name: string;
  category: string;
  cat_label: string;
  emoji: string | null;
  duration_min: number;
  price_krw: number;
  img: string;
  description: string | null;
  popular: boolean;
  is_new: boolean;
  badge: string | null;
  visible: boolean;
}

export interface ReservationPayload {
  theme_id: number;
  reservation_date: string;
  time_slot: string;
  child_count: string;
  class_count: string;
  kindergarten_name: string;
  contact_name: string;
  contact_phone: string;
  note?: string | null;
}

export interface Reservation {
  id: number;
  theme_id: number;
  theme_name: string;
  theme_emoji: string;
  theme_img: string;
  reservation_date: string;
  time_slot: string;
  child_count: string;
  class_count: string;
  kindergarten_name: string;
  contact_name: string;
  contact_phone: string;
  note: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'done';
  admin_memo: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityDay {
  date: string;
  booked_count: number;
  blocked: boolean;
  status: 'available' | 'limited' | 'full';
}

export interface DateAvailability {
  theme: ApiTheme;
  available_slots: string[];
}

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type UserRole = 'customer' | 'admin';

export interface User {
  id: number;
  email: string;
  kindergarten_name: string;
  contact_name: string;
  contact_phone: string;
  role: UserRole;
  status: UserStatus;
  admin_memo: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  token: string;
  user: User;
}

export interface SignupPayload {
  email: string;
  password: string;
  kindergarten_name: string;
  contact_name: string;
  contact_phone: string;
}

export interface BlockedSlot {
  id: number;
  block_date: string;
  time_slot: string | null;
  reason: string | null;
  created_at: string;
}

export interface AdminStats {
  today: string;
  totals: {
    all_reservations: number;
    this_week: number;
    this_month: number;
    this_month_revenue_krw: number;
  };
  by_status: Record<string, number>;
  top_themes: { id: number; name: string; emoji: string | null; cnt: number }[];
  users: { pending: number; approved: number };
}

// ─── 에러 ───
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// 401 발생 시 호출되는 핸들러 (AuthContext에서 등록)
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const tok = tokenStore.get();
  if (tok && !headers.Authorization) headers.Authorization = `Bearer ${tok}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch (e) {
    // 네트워크 오류 (fetch failed): DNS, 인터넷 끊김, CORS 등
    throw new ApiError(
      0,
      '네트워크 연결을 확인해주세요. (서버에 연결할 수 없습니다)',
      e,
    );
  }

  if (res.status === 401) {
    tokenStore.set(null);
    if (unauthorizedHandler) unauthorizedHandler();
  }

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      try { detail = await res.text(); } catch { /* ignore */ }
    }
    let msg: string;
    if (detail && typeof detail === 'object' && 'detail' in detail) {
      const d = (detail as { detail: unknown }).detail;
      msg = Array.isArray(d) ? d.map((x) => (x && typeof x === 'object' && 'msg' in x ? String((x as { msg: unknown }).msg) : String(x))).join(', ') : String(d);
    } else if (res.status >= 500) {
      msg = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      msg = `${res.status} ${res.statusText}`;
    }
    throw new ApiError(res.status, msg, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── 공개 API ───
export const api = {
  // 헬스/공개
  health: () => request<{ ok: boolean; ts: string }>('/api/health'),

  // 인증
  signup: (payload: SignupPayload) =>
    request<User>('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminLogin: (email: string, password: string) =>
    request<TokenResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/api/auth/me'),

  // 테마
  themes: () => request<ApiTheme[]>('/api/themes'),

  // 가용성
  availability: (year: number, month: number) =>
    request<AvailabilityDay[]>(`/api/availability?year=${year}&month=${month}`),
  availabilityDate: (date: string) => request<DateAvailability[]>(`/api/availability/${date}`),

  // 예약 (고객)
  createReservation: (payload: ReservationPayload) =>
    request<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  myReservations: () => request<Reservation[]>('/api/reservations/mine'),
  cancelMyReservation: (id: number) =>
    request<Reservation>(`/api/reservations/mine/${id}`, { method: 'PATCH' }),
};

export interface ThemePatch {
  name?: string;
  cat_label?: string;
  emoji?: string;
  duration_min?: number;
  price_krw?: number;
  description?: string;
  popular?: boolean;
  is_new?: boolean;
  badge?: string;
  visible?: boolean;
}

// ─── 관리자 API ───
export const adminApi = {
  // 테마
  listThemesAll: () => request<ApiTheme[]>('/api/admin/themes'),
  patchTheme: (id: number, data: ThemePatch) =>
    request<ApiTheme>(`/api/admin/themes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 회원
  listUsers: (params?: { status?: string; q?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.q) q.set('q', params.q);
    const qs = q.toString();
    return request<User[]>(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },
  patchUser: (id: number, data: { status?: UserStatus; admin_memo?: string }) =>
    request<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // 예약
  listReservations: (params?: { date?: string; status?: string; q?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set('date', params.date);
    if (params?.status) q.set('status', params.status);
    if (params?.q) q.set('q', params.q);
    const qs = q.toString();
    return request<Reservation[]>(`/api/admin/reservations${qs ? `?${qs}` : ''}`);
  },
  getReservation: (id: number) => request<Reservation>(`/api/admin/reservations/${id}`),
  patchReservation: (id: number, data: { status?: string; admin_memo?: string }) =>
    request<Reservation>(`/api/admin/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 통계
  stats: () => request<AdminStats>('/api/admin/stats'),

  // 블락 슬롯
  listBlocked: (params?: { year?: number; month?: number }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    if (params?.month) q.set('month', String(params.month));
    const qs = q.toString();
    return request<BlockedSlot[]>(`/api/admin/blocked-slots${qs ? `?${qs}` : ''}`);
  },
  addBlocked: (data: { block_date: string; time_slot?: string | null; reason?: string }) =>
    request<BlockedSlot>('/api/admin/blocked-slots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBlocked: (id: number) =>
    request<void>(`/api/admin/blocked-slots/${id}`, { method: 'DELETE' }),
};
