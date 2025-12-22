import ReservationPage from './pages/ReservationPage'
import { Sparkles } from 'lucide-react'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-inner">
          <div className="logo-wrapper">
            <Sparkles className="logo-icon" size={24} />
            <span className="logo-text">OGAM MONSTER</span>
          </div>
        </div>
      </header>
      <main>
        <ReservationPage />
      </main>
    </div>
  )
}

export default App

