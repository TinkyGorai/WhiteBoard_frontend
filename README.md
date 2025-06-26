# White Board Frontend

This is the frontend for the White Board collaborative drawing app, built with React and Tailwind CSS. It connects to the backend via WebSocket for real-time drawing and collaboration.

**Live Demo:**  
[https://white-board-frontend.vercel.app/]

---

## Features

- Real-time collaborative drawing (pen, shapes, text)
- Undo/redo per user
- Room-based collaboration with permissions (view/edit/admin)
- Live cursor and laser pointer sharing
- Public/private rooms
- Shareable room links with permission levels

---

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm

### Installation

```bash
git clone https://github.com/TinkyGorai/WhiteBoard_frontend
cd WhiteBoard_frontend
npm install
```

### Configuration

- By default, the frontend expects the backend WebSocket at `ws://localhost:8000/ws/whiteboard/`.


### Running Locally

```bash
npm start
```
The app will be available at [http://localhost:3000/](http://localhost:3000/).
