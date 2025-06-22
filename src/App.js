import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Whiteboard from './components/Whiteboard';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const WhiteboardPage = () => {
  const { roomId } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState(() => query.get('username'));
  const [showNamePrompt, setShowNamePrompt] = useState(() => !query.get('username'));
  const [tempName, setTempName] = useState('');

  const permission = query.get('permission') || 'view';

  const handleNameSubmit = () => {
    const trimmedName = tempName.trim();
    if (trimmedName) {
      setUsername(trimmedName);
      setShowNamePrompt(false);
      // Update the URL with the new username for bookmarking/reloading
      const newSearch = new URLSearchParams(location.search);
      newSearch.set('username', trimmedName);
      navigate(`${location.pathname}?${newSearch.toString()}`, { replace: true });
    }
  };

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white">
        <div className="glass-effect rounded-2xl p-8 w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-4">Join Whiteboard</h2>
          <p className="text-gray-300 mb-6">Please enter your name to continue.</p>
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Your name..."
            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            className="w-full mt-4 bg-purple-600 py-3 px-4 rounded-lg hover:bg-purple-700 transition-all font-semibold shadow-lg"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  if (!username) {
    // This state can be reached if the user dismisses the prompt somehow,
    // or if the initial state is otherwise invalid.
    return <LoadingScreen />;
  }

  return <Whiteboard roomId={roomId} username={username} sharePermission={permission} />;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h2 className="text-2xl font-bold text-white mb-2">CollabBoard</h2>
      <p className="text-gray-300">Loading amazing things...</p>
    </div>
  </div>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/whiteboard/:roomId" element={<WhiteboardPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
