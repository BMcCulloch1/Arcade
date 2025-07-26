# Arcade

A full-stack demo app with two real-time multiplayer games built using React and Node. It uses Supabase for authentication and data storage, and Socket.IO for live updates.

## What’s Inside

- User login and registration
- Real-time games:
  - Coin Toss
  - Jackpot (with animated drawing)
- User profiles
- Live updates via Socket.IO
- Supabase for database and auth

## Tech Stack

- **Frontend:** React (Vite), React Router, Tailwind CSS
- **Backend:** Node.js + Express
- **Realtime:** Socket.IO
- **Database/Auth:** Supabase

## Project Structure

/backend  
  Controllers, Middleware, Routes, Utils, Validation  
  server.js, socket.js  

/frontend  
  /public  
  /src  
    Components, Context, Games, Hooks, Pages, Utils  
    App.js, index.js, index.css

## Getting Started

### 1. Clone the repository

    git clone https://github.com/yourusername/arcade-demo.git
    cd arcade-demo

### 2. Install dependencies

    npm install

### 3. Add environment variables

Create a `.env` file in the project root:

    SUPABASE_URL=your-supabase-url
    SUPABASE_KEY=your-supabase-anon-key
    JWT_SECRET=your-secret

### 4. Start the servers

Frontend (default on http://localhost:3000):

    npm start

Backend (in `/backend`):

    node server.js 

### 5. Open in your browser

    http://localhost:3000

---

This project is a demo. Feel free to fork it, try it out, or customize it for your own needs.

## License

## License

This project is shared publicly for demonstration purposes only.  
All rights reserved. Please do not copy or reuse without permission.

