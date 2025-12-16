import { useMemo, useRef, useState } from 'react'
import { ExternalLink, RefreshCw, Columns2 } from 'lucide-react'
import './MultiView.css'

type Props = {
  adminUrl?: string
  clientUrl?: string
}

export default function MultiView({ adminUrl, clientUrl }: Props) {
  const defaultAdmin = 'http://localhost:3000'
  const defaultClient = 'http://localhost:3001'

  const leftUrl = useMemo(() => adminUrl || `${defaultAdmin}/?tab=reservation`, [adminUrl, defaultAdmin])
  const rightUrl = useMemo(() => clientUrl || defaultClient, [clientUrl])

  const [split, setSplit] = useState(50)
  const [leftKey, setLeftKey] = useState(0)
  const [rightKey, setRightKey] = useState(0)
  const draggingRef = useRef(false)

  const onStartDrag = () => {
    draggingRef.current = true
  }

  const onEndDrag = () => {
    draggingRef.current = false
  }

  const onMove = (clientX: number, container: HTMLDivElement | null) => {
    if (!draggingRef.current || !container) return
    const rect = container.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setSplit(Math.min(80, Math.max(20, pct)))
  }

  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      className="multiview"
      ref={containerRef}
      onMouseMove={(e) => onMove(e.clientX, containerRef.current)}
      onMouseUp={onEndDrag}
      onMouseLeave={onEndDrag}
      onTouchMove={(e) => onMove(e.touches[0]?.clientX ?? 0, containerRef.current)}
      onTouchEnd={onEndDrag}
    >
      <div className="multiview-header">
        <div className="multiview-title">
          <Columns2 size={18} />
          <span>통합 뷰 (관리자 & 고객)</span>
        </div>
        <div className="multiview-hint">가운데 바를 드래그하면 화면 비율을 조절할 수 있어요.</div>
      </div>

      <div className="multiview-body">
        <section className="panel" style={{ width: `${split}%` }}>
          <div className="panel-head">
            <div className="panel-name">
              관리자(예약 시스템) <span className="badge admin">Admin</span>
            </div>
            <div className="panel-actions">
              <button className="icon-btn" onClick={() => setLeftKey((v) => v + 1)} title="새로고침">
                <RefreshCw size={16} />
              </button>
              <a className="icon-btn" href={leftUrl} target="_blank" rel="noreferrer" title="새 창에서 열기">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
          <div className="panel-iframe-wrapper">
            <iframe key={leftKey} className="panel-iframe" src={leftUrl} title="Admin View" />
          </div>
        </section>

        <div className="divider" onMouseDown={onStartDrag} onTouchStart={onStartDrag} />

        <section className="panel" style={{ width: `${100 - split}%` }}>
          <div className="panel-head">
            <div className="panel-name">
              고객용 예약 <span className="badge client">Client</span>
            </div>
            <div className="panel-actions">
              <button className="icon-btn" onClick={() => setRightKey((v) => v + 1)} title="새로고침">
                <RefreshCw size={16} />
              </button>
              <a className="icon-btn" href={rightUrl} target="_blank" rel="noreferrer" title="새 창에서 열기">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
          <div className="panel-iframe-wrapper">
            <iframe key={rightKey} className="panel-iframe" src={rightUrl} title="Client View" />
          </div>
        </section>
      </div>
    </div>
  )
}


