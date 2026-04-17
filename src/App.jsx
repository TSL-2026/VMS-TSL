/**
 * FILE: App.jsx
 * VERSION: Test-07
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Main application component with routing
 * DEPENDENCIES: React Router, Firebase Auth
 * 
 * CHANGES:
 * - Added Reports route
 * - Added VehicleDetail route
 * - Added all navigation links
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './config/firebase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Trips from './pages/Trips'
import Reports from './pages/Reports'
import VehicleDetail from './pages/VehicleDetail'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-xl mb-2">Loading Vehicle Management System...</div>
          <div className="text-gray-500">Please wait</div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/vehicles" element={user ? <Vehicles /> : <Navigate to="/login" />} />
        <Route path="/vehicles/:id" element={user ? <VehicleDetail /> : <Navigate to="/login" />} />
        <Route path="/trips" element={user ? <Trips /> : <Navigate to="/login" />} />
        <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App