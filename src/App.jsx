/**
 * FILE: App.jsx
 * VERSION: Test-01
 * CHANGES:
 * - Added Trips route
 * - Added Vehicles route
 * - Main routing configuration
 * PURPOSE: Main application component with routing
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './config/firebase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Trips from './pages/Trips'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/vehicles" element={user ? <Vehicles /> : <Navigate to="/login" />} />
        <Route path="/trips" element={user ? <Trips /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App