import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Nav from './components/Nav'
import Today from './tabs/Today'
import Trends from './tabs/Trends'
import Records from './tabs/Records'
import Climate from './tabs/Climate'
import Me from './tabs/Me'
import About from './tabs/About'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-dvh bg-bg text-fg">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-fg">Skip to content</a>
        <Header />
        <Nav />
        <main id="main" className="mx-auto max-w-[680px] px-4 pb-28 pt-4 lg:pb-12">
          <Routes>
            <Route path="/today" element={<Today />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/records" element={<Records />} />
            <Route path="/climate" element={<Climate />} />
            <Route path="/me" element={<Me />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
