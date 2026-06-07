import { useCallback, useEffect, useState } from 'react';
import { adminApi, type ApiTheme, type ThemePatch } from '../../lib/api';

const krw = (n: number) => '₩' + n.toLocaleString('ko-KR');

interface EditState {
  price_krw: number;
  duration_min: number;
  popular: boolean;
  is_new: boolean;
  visible: boolean;
  badge: string;
}

export default function ThemesTab() {
  const [items, setItems] = useState<ApiTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [q, setQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await adminApi.listThemesAll();
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = items
    .filter((t) => {
      if (filter === 'visible') return t.visible;
      if (filter === 'hidden') return !t.visible;
      return true;
    })
    .filter((t) => {
      if (!q.trim()) return true;
      const k = q.toLowerCase();
      return (
        t.name.toLowerCase().includes(k) ||
        (t.cat_label ?? '').toLowerCase().includes(k) ||
        (t.description ?? '').toLowerCase().includes(k)
      );
    });

  const startEdit = (t: ApiTheme) => {
    setEditing(t.id);
    setDraft({
      price_krw: t.price_krw,
      duration_min: t.duration_min,
      popular: t.popular,
      is_new: t.is_new,
      visible: t.visible,
      badge: t.badge ?? '',
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async (id: number) => {
    if (!draft) return;
    setBusyId(id);
    try {
      const patch: ThemePatch = {
        price_krw: draft.price_krw,
        duration_min: draft.duration_min,
        popular: draft.popular,
        is_new: draft.is_new,
        visible: draft.visible,
        badge: draft.badge.trim() || undefined,
      };
      const upd = await adminApi.patchTheme(id, patch);
      setItems((prev) => prev.map((t) => (t.id === id ? upd : t)));
      setEditing(null);
      setDraft(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const quickToggle = async (t: ApiTheme, field: 'visible' | 'popular' | 'is_new') => {
    setBusyId(t.id);
    try {
      const patch: ThemePatch = { [field]: !t[field] };
      const upd = await adminApi.patchTheme(t.id, patch);
      setItems((prev) => prev.map((x) => (x.id === t.id ? upd : x)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="themes-tab">
      <div className="adm-tabs-wrap">
        <div className="adm-tabs">
          <button className={`adm-tab${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
            <span className="emoji">🎨</span> 전체 <span className="adm-tab-count">{items.length}</span>
          </button>
          <button className={`adm-tab${filter === 'visible' ? ' on' : ''}`} onClick={() => setFilter('visible')}>
            <span className="emoji">👁️</span> 공개 <span className="adm-tab-count">{items.filter((t) => t.visible).length}</span>
          </button>
          <button className={`adm-tab${filter === 'hidden' ? ' on' : ''}`} onClick={() => setFilter('hidden')}>
            <span className="emoji">🚫</span> 비공개 <span className="adm-tab-count">{items.filter((t) => !t.visible).length}</span>
          </button>
        </div>
      </div>

      <div className="adm-search-row">
        <input
          className="adm-search"
          placeholder="🔍 테마명·카테고리·설명 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button className="adm-btn" onClick={() => setQ('')}>
            초기화
          </button>
        )}
      </div>

      {err && <div className="adm-error">⚠️ {err}</div>}

      {loading ? (
        <div className="adm-empty">⏳ 불러오는 중...</div>
      ) : (
        <div className="themes-grid">
          {filtered.map((t) => {
            const isEditing = editing === t.id;
            const isBusy = busyId === t.id;
            return (
              <article key={t.id} className={`theme-card${!t.visible ? ' hidden' : ''}`}>
                <div
                  className="theme-thumb"
                  style={{ backgroundImage: `url('/images/${t.img}')` }}
                >
                  {!t.visible && <span className="hidden-badge">비공개</span>}
                  {t.badge && <span className="theme-badge">{t.badge}</span>}
                </div>
                <div className="theme-body">
                  <div className="theme-head">
                    <span className="theme-emoji">{t.emoji ?? '🎨'}</span>
                    <span className="theme-name">{t.name}</span>
                  </div>
                  <div className="theme-cat">{t.cat_label}</div>

                  {isEditing && draft ? (
                    <div className="theme-edit">
                      <label>
                        <span>가격 (원)</span>
                        <input
                          type="number"
                          value={draft.price_krw}
                          onChange={(e) =>
                            setDraft({ ...draft, price_krw: Number(e.target.value) })
                          }
                          step={1000}
                          min={0}
                        />
                      </label>
                      <label>
                        <span>소요 시간 (분)</span>
                        <input
                          type="number"
                          value={draft.duration_min}
                          onChange={(e) =>
                            setDraft({ ...draft, duration_min: Number(e.target.value) })
                          }
                          step={5}
                          min={5}
                          max={240}
                        />
                      </label>
                      <label>
                        <span>배지 텍스트</span>
                        <input
                          type="text"
                          value={draft.badge}
                          onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                          placeholder="예) HOT, NEW"
                          maxLength={20}
                        />
                      </label>
                      <div className="toggle-row">
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={draft.popular}
                            onChange={(e) => setDraft({ ...draft, popular: e.target.checked })}
                          />
                          <span>🔥 인기</span>
                        </label>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={draft.is_new}
                            onChange={(e) => setDraft({ ...draft, is_new: e.target.checked })}
                          />
                          <span>✨ NEW</span>
                        </label>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={draft.visible}
                            onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
                          />
                          <span>👁️ 공개</span>
                        </label>
                      </div>
                      <div className="theme-actions">
                        <button
                          className="adm-btn adm-btn-primary"
                          onClick={() => save(t.id)}
                          disabled={isBusy}
                        >
                          저장
                        </button>
                        <button className="adm-btn" onClick={cancelEdit} disabled={isBusy}>
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="theme-meta">
                        <span>⏱ {t.duration_min}분</span>
                        <span className="price">{krw(t.price_krw)}</span>
                      </div>
                      <div className="theme-flags">
                        {t.popular && <span className="flag popular">🔥 인기</span>}
                        {t.is_new && <span className="flag new">✨ NEW</span>}
                        {!t.visible && <span className="flag hide">🚫 비공개</span>}
                      </div>
                      <div className="theme-actions">
                        <button className="adm-btn" onClick={() => startEdit(t)} disabled={isBusy}>
                          ✏️ 수정
                        </button>
                        <button
                          className={`adm-btn ${t.visible ? 'adm-btn-reject' : 'adm-btn-approve'}`}
                          onClick={() => quickToggle(t, 'visible')}
                          disabled={isBusy}
                        >
                          {t.visible ? '🚫 비공개로' : '👁️ 공개로'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="adm-empty">
          <div className="emoji">📭</div>
          <div className="ttl">조건에 맞는 테마가 없습니다</div>
        </div>
      )}
    </div>
  );
}
