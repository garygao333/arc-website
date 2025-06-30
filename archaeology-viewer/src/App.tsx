import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import UniversalData from './pages/UniversalData';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Custom ARC Header */}
        <header className="app-header">
          <div className="header-container">
            <div className="arc-title">ARC</div>
            <nav className="app-nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/universal-data" className="nav-link">Data List</Link>
            </nav>
          </div>
        </header>
        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/universal-data" element={<UniversalData />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;