import React from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import bgImage from './assets/bgImageSky.svg';

const App = () => {
  const { authUser } = useContext(AuthContext);

  return (
    <div
      style={{ backgroundImage: `url(${bgImage})` }}
      className="h-screen w-screen overflow-hidden bg-cover bg-center bg-[#070d1e] text-white flex flex-col relative"
    >
      {/* Ambient Vignette Overlay to blend background circle seamlessly */}
      <div className="absolute inset-0 bg-[#050b18]/60 pointer-events-none z-0" />
      <Toaster position="top-center" />
      <div className="flex-1 min-h-0 w-full overflow-hidden relative z-10">
        <Routes>
          <Route path='/' element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App