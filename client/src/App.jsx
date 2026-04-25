import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SharePage from './pages/SharePage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/share/:sessionId" element={<SharePage />} />
          <Route path="/dashboard/:sessionId" element={<DashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
