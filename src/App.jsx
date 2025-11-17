import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatInterface from './ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
