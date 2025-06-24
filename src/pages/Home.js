import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// API base URL - use environment variable or default to production
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://white-collab-board.onrender.com';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('join');
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const navigate = useNavigate();

  // Generate random room ID
  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(result);
  };

  // Don't auto-generate room ID on mount anymore
  useEffect(() => {
    // Intentionally left blank
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId || !username) return;
    
    setIsLoading(true);

    // If creating a room, create it first
    if (activeTab === 'create') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: roomName || `Room ${roomId}`,
            description: roomDescription,
            is_public: isPublic,
            max_participants: maxParticipants,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create room');
        }
        
        // Get the created room data
        const roomData = await response.json();
        console.log('🔍 Debug - Room creation response:', roomData);
        console.log('🔍 Debug - Response status:', response.status);
        console.log('🔍 Debug - Response headers:', response.headers);
        console.log('🔍 Debug - Full response object:', response);
        
        const actualRoomId = roomData.room_code || roomData.id;
        console.log('🔍 Debug - Using room ID:', actualRoomId);
        console.log('🔍 Debug - roomData.room_code:', roomData.room_code);
        console.log('🔍 Debug - roomData.id:', roomData.id);
        console.log('🔍 Debug - roomData keys:', Object.keys(roomData));
        
        // Navigate to whiteboard with the actual room ID
        const navigateUrl = `/whiteboard/${actualRoomId}?username=${encodeURIComponent(username)}&permission=edit`;
        console.log('✅ Navigating to new room with edit permission:', navigateUrl);
        
        // Add a small delay to ensure database transaction is committed
        setTimeout(() => {
            navigate(navigateUrl);
        }, 100);
        return;
        
      } catch (error) {
        console.error('Error creating room:', error);
        alert(error.message || 'Could not create room. Please try again.');
        setIsLoading(false);
        return;
      }
    } else {
      // If joining, check if room exists first
      try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/check_access/`);
        const data = await response.json();
        if (!data.can_access) {
          alert(data.message || 'Access denied to this room.');
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking room:', error);
        alert('Could not verify room. Please try again.');
        setIsLoading(false);
        return;
      }
    }
    
    // Navigate to whiteboard for joining existing room
    setTimeout(() => {
      navigate(`/whiteboard/${roomId}?username=${encodeURIComponent(username)}`);
    }, 800);
  };

  const handleCreateRoom = () => {
    generateRoomId();
    setActiveTab('create');
  };

  const handleJoinRoom = () => {
    setRoomId('');
    setActiveTab('join');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-2xl opacity-30 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-1/3 w-20 h-20 bg-gradient-to-r from-pink-400 to-red-400 rounded-full blur-2xl opacity-25 animate-float" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-6 p-3 glass-effect rounded-2xl">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-300">Real-time Collaboration</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-extrabold mb-6 gradient-text">
              CollabBoard
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Create, collaborate, and innovate together in real-time. 
              The ultimate digital whiteboard experience.
            </p>
          </div>

          {/* Main Card */}
          <div className="card animate-scale-in" style={{ animationDelay: '0.3s' }}>
            {/* Tab Navigation */}
            <div className="flex mb-8 p-1 bg-gray-800 rounded-xl">
              <button
                onClick={handleJoinRoom}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  activeTab === 'join'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
              <button
                onClick={handleCreateRoom}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Room ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      className="input text-lg font-mono text-center"
                      placeholder="Enter Room ID"
                      maxLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={generateRoomId}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                      title="Generate new room ID"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input text-lg"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              {/* Room Creation Options */}
              {activeTab === 'create' && (
                <div className="space-y-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">Room Settings</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Room Name
                      </label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="input"
                        placeholder="Enter room name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Max Participants
                      </label>
                      <select
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                        className="input"
                      >
                        <option value={5}>5 participants</option>
                        <option value={10}>10 participants</option>
                        <option value={15}>15 participants</option>
                        <option value={20}>20 participants</option>
                        <option value={50}>50 participants</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Room Description
                    </label>
                    <textarea
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      className="input resize-none"
                      rows={3}
                      placeholder="Describe what this room is for..."
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-gray-300">Public Room</span>
                    </label>
                    <div className="text-sm text-gray-400">
                      {isPublic ? 'Anyone can join' : 'Only invited users can join'}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !roomId || !username}
                className="w-full btn btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{activeTab === 'create' ? 'Create & Join Room' : 'Join Room'}</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="card text-center animate-slide-left" style={{ animationDelay: '0.6s' }}>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-time Sync</h3>
              <p className="text-gray-400">See everyone's drawings instantly as they happen</p>
            </div>

            <div className="card text-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Creative Tools</h3>
              <p className="text-gray-400">Powerful drawing tools with endless possibilities</p>
            </div>

            <div className="card text-center animate-slide-right" style={{ animationDelay: '1s' }}>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
              <p className="text-gray-400">Your sessions are private and secure by default</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <p className="text-sm">
              Built with ❤️ using React & Django Channels
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 