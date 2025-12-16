import ReservationPage from './pages/ReservationPage'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-inner">
          <h1>오감몬스터 예약 시스템</h1>
          <nav>
            <button className="nav-link active">예약하기</button>
            <button className="nav-link">예약확인</button>
            <button className="nav-link">관리자</button>
          </nav>
        </div>
      </header>
      <main>
        <ReservationPage />
      </main>
    </div>
  )
}

export default App

