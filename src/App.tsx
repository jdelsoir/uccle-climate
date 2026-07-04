import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Nav from './components/Nav'
import Today from './tabs/Today'
import Records from './tabs/Records'
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
            <Route path="/day" element={<Today key="day" mode="day" />} />
            <Route path="/month" element={<Today key="month" mode="month" />} />
            <Route path="/year" element={<Today key="year" mode="year" />} />
            <Route path="/records" element={<Records />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/day" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
