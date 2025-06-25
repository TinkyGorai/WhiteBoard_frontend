import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// WebSocket base URL - use environment variable or default to production
const WS_BASE = process.env.REACT_APP_WS_URL || 'wss://white-collab-board.onrender.com/ws/whiteboard';

const Whiteboard = ({ roomId, username, sharePermission = 'view' }) => {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();
  
  // Drawing state
  const [color, setColor] = useState('#667eea');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen');
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  
  // Shape drawing state
  const [shapeStart, setShapeStart] = useState(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [fillColor, setFillColor] = useState('transparent');
  
  // Text tool state
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Local drawing history for preview
  const [localHistory, setLocalHistory] = useState([]);
  
  // UI state
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [userPermission, setUserPermission] = useState('view');
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState('');
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedSharePermission, setSelectedSharePermission] = useState('view');
  const [shareLink, setShareLink] = useState('');

  // Use an effect to regenerate the link whenever the permission or room changes.
  useEffect(() => {
    const baseUrl = `${window.location.origin}/whiteboard/${roomId}`;
    const shareUrl = `${baseUrl}?permission=${selectedSharePermission}`;
    setShareLink(shareUrl);
  }, [roomId, selectedSharePermission]);

  // Predefined colors
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
    '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#a8edea', '#fed6e3',
    '#ff9a9e', '#fecfef', '#fecfef', '#fad0c4', '#ffd1ff', '#a1c4fd',
    '#d299c2', '#fef9d7', '#89f7fe', '#66a6ff', '#f093fb', '#f5576c'
  ];

  // Brush sizes
  const brushSizes = [1, 2, 3, 5, 8, 12, 16, 20];

  // Drawing functions
  const drawLine = useCallback((points, color, width, emit = true) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.closePath();
    
    if (emit && wsRef.current && wsRef.current.readyState === 1) {
      const message = {
        type: 'draw',
        tool_type: tool,
        color,
        stroke_width: width,
        data: points,
      };
      console.log('📤 Sending draw message:', message);
      wsRef.current.send(JSON.stringify(message));
    }
  }, [tool]);

  // Shape drawing functions
  const drawShape = useCallback((shapeType, startPoint, endPoint, color, strokeWidth, fillColor, emit = true) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = fillColor;
    
    const width = endPoint.x - startPoint.x;
    const height = endPoint.y - startPoint.y;
    
    ctx.beginPath();
    
    switch (shapeType) {
      case 'rectangle':
        ctx.rect(startPoint.x, startPoint.y, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(width * width + height * height);
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        break;
      case 'line':
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        break;
      default:
        return;
    }
    
    if (fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
    ctx.closePath();
    
    if (emit && wsRef.current && wsRef.current.readyState === 1) {
      const message = {
        type: 'shape',
        shape_type: shapeType,
        color,
        stroke_width: strokeWidth,
        fill_color: fillColor,
        data: { start: startPoint, end: endPoint },
      };
      console.log('📤 Sending shape message:', message);
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Text drawing function
  const drawText = useCallback((text, position, color, fontSize = 16, emit = true) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, position.x, position.y);
    
    if (emit && wsRef.current && wsRef.current.readyState === 1) {
      const message = {
        type: 'text',
        text,
        color,
        font_size: fontSize,
        position,
      };
      console.log('📤 Sending text message:', message);
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    console.log('🔍 Debug - roomId:', roomId, 'sharePermission:', sharePermission);
    
    if (!roomId) {
      console.log('❌ No roomId provided, cannot connect to WebSocket');
      return;
    }
    
    // Include permission parameter in WebSocket URL
    const wsUrl = `${WS_BASE}/${roomId}/?permission=${sharePermission}`;
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    wsRef.current = new window.WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('✅ WebSocket connected successfully!');
      setConnectionStatus('connected');
    };
    
    wsRef.current.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setConnectionStatus('disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    wsRef.current.onmessage = (event) => {
      console.log('📨 Received message:', event.data);
      const data = JSON.parse(event.data);

      if (data.type === 'board_state') {
        setLocalHistory(data.history || []);
        setUserPermission(data.user_permission || 'view');
        redrawCanvas(data.history);
      } else if (data.type === 'draw') {
        drawLine(data.drawing.data, data.drawing.color, data.drawing.stroke_width, false);
        setLocalHistory(prev => [...prev, { type: 'draw', drawing: data.drawing }]);
      } else if (data.type === 'shape') {
        drawShape(
          data.shape.shape_type,
          data.shape.data.start,
          data.shape.data.end,
          data.shape.color,
          data.shape.stroke_width,
          data.shape.fill_color,
          false
        );
        setLocalHistory(prev => [...prev, { type: 'shape', shape: data.shape }]);
      } else if (data.type === 'text') {
        // Handle text data with safety checks
        const textData = data.text;
        if (textData && textData.text && textData.position && 
            textData.position.x !== undefined && textData.position.y !== undefined) {
          drawText(textData.text, textData.position, textData.color, textData.font_size, false);
          setLocalHistory(prev => [...prev, { type: 'text', text: textData }]);
        }
      } else if (data.type === 'clear_canvas') {
        clearCanvasLocal();
        setLocalHistory([]);
      } else if (data.type === 'user_joined') {
        setParticipants(prev => [...prev, data.username]);
      } else if (data.type === 'user_left') {
        setParticipants(prev => prev.filter(p => p !== data.username));
      } else if (data.type === 'error') {
        setPermissionErrorMessage(data.message);
        setShowPermissionError(true);
        setTimeout(() => setShowPermissionError(false), 5000);
      }
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, drawLine, drawShape, drawText, sharePermission]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const redrawCanvas = useCallback((history) => {
    clearCanvasLocal();
    if (history) {
      history.forEach((action) => {
        if (action.type === 'draw') {
          drawLine(action.drawing.data, action.drawing.color, action.drawing.stroke_width, false);
        } else if (action.type === 'shape') {
          drawShape(
            action.shape.shape_type,
            action.shape.data.start,
            action.shape.data.end,
            action.shape.color,
            action.shape.stroke_width,
            action.shape.fill_color,
            false
          );
        } else if (action.type === 'text') {
          // Handle both real-time message structure and history structure
          const textData = action.text || action;
          const text = textData.text;
          const position = textData.position;
          const color = textData.color;
          const fontSize = textData.font_size || 16;
          
          if (text && position && position.x !== undefined && position.y !== undefined) {
            drawText(text, position, color, fontSize, false);
          }
        }
      });
    }
  }, [drawLine, drawShape, drawText]);

  const clearCanvasLocal = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleClear = () => {
    // Check if user has edit or admin permissions
    if (userPermission === 'view') {
      setPermissionErrorMessage('Only editors or admins can clear the canvas');
      setShowPermissionError(true);
      setTimeout(() => setShowPermissionError(false), 3000);
      return;
    }
    
    if (wsRef.current && wsRef.current.readyState === 1) {
      const message = { type: 'clear_canvas' };
      console.log('📤 Sending clear message:', message);
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Mouse events
  const handleMouseDown = (e) => {
    // Check if user has edit permissions
    if (userPermission === 'view') {
      setPermissionErrorMessage('You only have view permissions in this room');
      setShowPermissionError(true);
      setTimeout(() => setShowPermissionError(false), 3000);
      return;
    }
    
    const point = getCanvasCoords(e);
    
    if (tool === 'pen' || tool === 'eraser') {
      setDrawing(true);
      setLastPoint(point);
    } else if (['rectangle', 'circle', 'line'].includes(tool)) {
      setIsDrawingShape(true);
      setShapeStart(point);
    } else if (tool === 'text') {
      setTextPosition(point);
      setShowTextInput(true);
    }
  };

  const handleMouseUp = (e) => {
    // Check if user has edit permissions
    if (userPermission === 'view') return;
    
    const point = getCanvasCoords(e);
    
    if (tool === 'pen' || tool === 'eraser') {
      setDrawing(false);
      setLastPoint(null);
    } else if (['rectangle', 'circle', 'line'].includes(tool) && isDrawingShape && shapeStart) {
      drawShape(tool, shapeStart, point, color, brushSize, fillColor, true);
      setIsDrawingShape(false);
      setShapeStart(null);
    }
  };

  const handleMouseMove = (e) => {
    // Check if user has edit permissions
    if (userPermission === 'view') return;
    
    const point = getCanvasCoords(e);
    
    if (tool === 'pen' || tool === 'eraser') {
      if (!drawing) return;
      if (lastPoint) {
        const drawColor = tool === 'eraser' ? '#ffffff' : color;
        const drawWidth = tool === 'eraser' ? Math.max(brushSize * 2, 8) : brushSize;
        drawLine([lastPoint, point], drawColor, drawWidth, true);
      }
      setLastPoint(point);
    } else if (['rectangle', 'circle', 'line'].includes(tool) && isDrawingShape && shapeStart) {
      clearCanvasLocal();
      redrawCanvas(localHistory);
      drawShape(tool, shapeStart, point, color, brushSize, fillColor, false);
    }
  };

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    // Check if user has edit permissions
    if (userPermission === 'view') {
      setPermissionErrorMessage('You only have view permissions in this room');
      setShowPermissionError(true);
      setTimeout(() => setShowPermissionError(false), 3000);
      return;
    }
    
    const touch = e.touches[0];
    const point = getTouchCoords(touch);
    
    if (tool === 'pen' || tool === 'eraser') {
      setDrawing(true);
      setLastPoint(point);
    } else if (['rectangle', 'circle', 'line'].includes(tool)) {
      setIsDrawingShape(true);
      setShapeStart(point);
    } else if (tool === 'text') {
      setTextPosition(point);
      setShowTextInput(true);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    // Check if user has edit permissions
    if (userPermission === 'view') return;
    
    const touch = e.changedTouches[0];
    const point = getTouchCoords(touch);
    
    if (tool === 'pen' || tool === 'eraser') {
      setDrawing(false);
      setLastPoint(null);
    } else if (['rectangle', 'circle', 'line'].includes(tool) && isDrawingShape && shapeStart) {
      drawShape(tool, shapeStart, point, color, brushSize, fillColor, true);
      setIsDrawingShape(false);
      setShapeStart(null);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    // Check if user has edit permissions
    if (userPermission === 'view') return;
    
    const touch = e.touches[0];
    const point = getTouchCoords(touch);
    
    if (tool === 'pen' || tool === 'eraser') {
      if (!drawing) return;
      if (lastPoint) {
        const drawColor = tool === 'eraser' ? '#ffffff' : color;
        const drawWidth = tool === 'eraser' ? Math.max(brushSize * 2, 8) : brushSize;
        drawLine([lastPoint, point], drawColor, drawWidth, true);
      }
      setLastPoint(point);
    } else if (['rectangle', 'circle', 'line'].includes(tool) && isDrawingShape && shapeStart) {
      clearCanvasLocal();
      redrawCanvas(localHistory);
      drawShape(tool, shapeStart, point, color, brushSize, fillColor, false);
    }
  };

  const getTouchCoords = (touch) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `collab-board-${roomId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(shareLink);
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.textContent = 'Room link copied!';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2000);
    
    setShowSharingModal(false);
  };

  const openSharingModal = () => {
    setSelectedSharePermission('view');
    setShowSharingModal(true);
  };

  const handleTextSubmit = () => {
    // Check if user has edit permissions
    if (userPermission === 'view') {
      setPermissionErrorMessage('You only have view permissions in this room');
      setShowPermissionError(true);
      setTimeout(() => setShowPermissionError(false), 3000);
      return;
    }
    
    if (textInput.trim() && textPosition) {
      drawText(textInput, textPosition, color, 16, true);
      setTextInput('');
      setShowTextInput(false);
      setTextPosition(null);
    }
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'undo' }));
    }
  };
  const handleRedo = () => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'redo' }));
    }
  };

  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-40 transition-all duration-300 ${showToolbar ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="glass-effect border-b border-gray-700">
          <div className="flex items-center justify-between p-4">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-ghost p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-300">Room: {roomId}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-sm text-gray-400">{username}</span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={openSharingModal}
                className="btn btn-secondary text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </button>
              
              <button
                onClick={handleSave}
                className="btn btn-secondary text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save
              </button>

              <button
                onClick={toggleFullscreen}
                className="btn btn-secondary p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar - Right Side Layout */}
      <div className={`absolute top-20 right-4 z-30 transition-all duration-300 ${showToolbar ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="glass-effect rounded-2xl p-4">
          <div className="flex flex-col gap-3">
            {/* Drawing Tools */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setTool('pen')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'pen' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Pen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              
              <button
                onClick={() => setTool('eraser')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'eraser' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Eraser"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              <button
                onClick={() => setTool('text')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'text' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            {/* Shape Tools */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setTool('rectangle')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'rectangle' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Rectangle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                </svg>
              </button>
              
              <button
                onClick={() => setTool('circle')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'circle' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                </svg>
              </button>
              
              <button
                onClick={() => setTool('line')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === 'line' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Line"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              </button>
            </div>

            {/* Color and Size */}
            <div className="flex flex-col gap-2">
              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-10 h-10 rounded-lg border-2 border-gray-600 hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: color }}
                  title="Color Picker"
                ></button>
                
                {showColorPicker && (
                  <div className="absolute bottom-12 left-0 glass-effect rounded-xl p-3 grid grid-cols-6 gap-2 w-48">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setColor(c);
                          setShowColorPicker(false);
                        }}
                        className="w-8 h-8 rounded-lg border-2 border-gray-600 hover:border-white transition-colors"
                        style={{ backgroundColor: c }}
                      ></button>
                    ))}
                  </div>
                )}
              </div>

              {/* Brush Size */}
              <div className="relative">
                <button
                  onClick={() => setShowBrushPicker(!showBrushPicker)}
                  className="w-10 h-10 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors flex items-center justify-center"
                  title="Brush Size"
                >
                  <div 
                    className="rounded-full bg-current"
                    style={{ width: brushSize * 2, height: brushSize * 2 }}
                  ></div>
                </button>
                
                {showBrushPicker && (
                  <div className="absolute bottom-12 left-0 glass-effect rounded-xl p-3 space-y-2 w-20">
                    {brushSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setBrushSize(size);
                          setShowBrushPicker(false);
                        }}
                        className="w-full h-8 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center"
                      >
                        <div 
                          className="rounded-full bg-white"
                          style={{ width: size * 2, height: size * 2 }}
                        ></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fill Toggle */}
              <button
                onClick={() => setFillColor(fillColor === 'transparent' ? color : 'transparent')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  fillColor !== 'transparent' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={fillColor === 'transparent' ? 'Enable Fill' : 'Disable Fill'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M7 17l-2 2" />
                </svg>
              </button>
            </div>

            {/* Undo/Redo Buttons */}
            {(userPermission === 'edit' || userPermission === 'admin') && (
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={handleUndo}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l-4-4m0 0l4-4m-4 4h16" />
                  </svg>
                </button>
                <button
                  onClick={handleRedo}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            )}

            {/* Clear Button */}
            {(userPermission === 'edit' || userPermission === 'admin') && (
              <button
                onClick={handleClear}
                className="w-10 h-10 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Clear Canvas"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Toolbar Button */}
      <button
        onClick={() => setShowToolbar(!showToolbar)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Canvas Container */}
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-[95%] h-[95%]">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          />
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="glass-effect rounded-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Enter text..."
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleTextSubmit}
                className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Add Text
              </button>
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setTextInput('');
                  setTextPosition(null);
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Panel */}
      <div className="absolute top-20 left-4 z-30">
        <div className="glass-effect rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Participants</h3>
          <div className="space-y-2">
            {/* Only show the current user */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300 font-medium">{username} (You)</span>
            </div>
            {/*
            {participants.map((participant, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">{participant}</span>
              </div>
            ))}
            */}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute bottom-4 left-4 z-30">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
          connectionStatus === 'connected' 
            ? 'bg-green-500 text-white' 
            : connectionStatus === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-yellow-500 text-white'
        }`}>
          {connectionStatus === 'connected' ? '🟢 Connected' : 
           connectionStatus === 'error' ? '🔴 Connection Error' : 
           '🟡 Connecting...'}
        </div>
      </div>

      {/* Permission Error Toast */}
      {showPermissionError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{permissionErrorMessage}</span>
          </div>
        </div>
      )}

      {/* Permission Status */}
      <div className="absolute top-4 right-4 z-30">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
          userPermission === 'admin' 
            ? 'bg-purple-500 text-white' 
            : userPermission === 'edit'
            ? 'bg-green-500 text-white'
            : 'bg-gray-500 text-white'
        }`}>
          {userPermission === 'admin' ? '👑 Admin' : 
           userPermission === 'edit' ? '✏️ Can Edit' : 
           '👁️ View Only'}
        </div>
      </div>

      {/* Sharing Modal */}
      {showSharingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="glass-effect rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Share Room</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Permission Level
              </label>
              <select
                value={selectedSharePermission}
                onChange={(e) => setSelectedSharePermission(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                <option value="view">👁️ View Only - Can see but not edit</option>
                <option value="edit">✏️ Edit - Can draw and modify</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Share Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="w-full p-3 bg-gray-800 text-gray-300 rounded-lg border border-gray-600 text-sm font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    const toast = document.createElement('div');
                    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
                    toast.textContent = 'Link copied!';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2000);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Copy link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyRoomLink}
                className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
              <button
                onClick={() => setShowSharingModal(false)}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Whiteboard; 