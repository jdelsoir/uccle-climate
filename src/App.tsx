import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Today from './tabs/Today'; import Trends from './tabs/Trends'
import Climate from './tabs/Climate'; import Me from './tabs/Me'; import About from './tabs/About'

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/today" element={<Today />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/climate" element={<Climate />} />
          <Route path="/me" element={<Me />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
