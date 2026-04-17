/**
 * FILE: Dashboard.jsx
 * VERSION: Test-07
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Fleet compliance dashboard with export for supervisor
 * DEPENDENCIES: React, Firebase Firestore, React Router
 * 
 * CHANGES:
 * - Fixed unterminated string constant (missing closing quote)
 * - Added CSV export functionality for vehicles and trips
 * - Supervisor-only export buttons
 * - Real-time compliance alerts
 */

import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { db } from '../config/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function Dashboard() {
  const [stats, setStats] = useState({
    vehicles: 0,
    activeVehicles: 0,
    expiringPermits: 0,
    expiringInsurance: 0,
    totalDistance: 0,
    vehiclesWithServiceRecord: 0
  })
  
  const [alerts, setAlerts] = useState([])
  const [exporting, setExporting] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
  }

  const user = auth.currentUser
  
  // Check if user is supervisor (admin) - FIXED: Added closing quotes
  const isSupervisor = user?.email === 'gsacharyasu@sitaair.com.np' || user?.email === 'gsacharya@sisitaair.com.np'

  const isExpiringSoon = (date) => {
    if (!date) return false
    const expiry = new Date(date)
    const today = new Date()
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysLeft <= 30 && daysLeft > 0
  }

  const isExpired = (date) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  // Export vehicles to CSV
  const exportVehiclesToCSV = async () => {
    setExporting(true)
    try {
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
      const snapshot = await getDocs(vehiclesRef)
      const vehicles = snapshot.docs.map(doc => doc.data())
      
      // Define CSV headers
      const headers = [
        'License Plate', 'Make', 'Model', 'Year', 'Color', 'Status',
        'Chassis Number', 'Engine Number', 'Permit Renewal Date', 'Insurance Expiry Date',
        'Last Service Date', 'Last Service KM', 'Last Service Notes',
        'Purchase Date', 'Supplier', 'Notes', 'Created At'
      ]
      
      // Convert to CSV rows
      const rows = vehicles.map(v => [
        v.licensePlate || '',
        v.make || '',
        v.model || '',
        v.year || '',
        v.color || '',
        v.status || '',
        v.chassisNumber || '',
        v.engineNumber || '',
        v.permitRenewalDate || '',
        v.insuranceExpiryDate || '',
        v.lastServiceDate || '',
        v.lastServiceKm || '',
        v.lastServiceNotes || '',
        v.purchaseDate || '',
        v.supplier || '',
        v.notes || '',
        v.createdAt || ''
      ])
      
      // Create CSV content
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vehicles_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting vehicles:', error)
      alert('Error exporting vehicles: ' + error.message)
    } finally {
      setExporting(false)
    }
  }
  
  // Export trips to CSV
  const exportTripsToCSV = async () => {
    setExporting(true)
    try {
      // First get vehicles for license plate lookup
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
      const vehiclesSnap = await getDocs(vehiclesRef)
      const vehiclesMap = {}
      vehiclesSnap.forEach(doc => {
        const data = doc.data()
        vehiclesMap[doc.id] = data.licensePlate || 'Unknown'
      })
      
      const tripsRef = collection(db, 'users', user.uid, 'trips')
      const snapshot = await getDocs(tripsRef)
      const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Define CSV headers
      const headers = [
        'Vehicle License Plate', 'Driver Name', 'Start Location', 'End Location',
        'Start Date', 'End Date', 'Distance (km)', 'Revenue (रू)', 'Fuel Cost (रू)', 'Notes'
      ]
      
      // Convert to CSV rows
      const rows = trips.map(t => [
        vehiclesMap[t.vehicleId] || 'Unknown',
        t.driverName || '',
        t.startLocation || '',
        t.endLocation || '',
        t.startDate || '',
        t.endDate || '',
        t.distance || '',
        t.revenue || '',
        t.fuelCost || '',
        t.notes || ''
      ])
      
      // Create CSV content
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trips_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting trips:', error)
      alert('Error exporting trips: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return
      try {
        const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
        const vehiclesSnap = await getDocs(vehiclesRef)
        
        let activeCount = 0
        let expiringPermits = 0
        let expiringInsurance = 0
        let vehiclesWithService = 0
        let totalDist = 0
        const alertList = []
        
        vehiclesSnap.forEach(doc => {
          const data = doc.data()
          if (data.status === 'active') activeCount++
          if (data.lastServiceDate) vehiclesWithService++
          
          // Check permit expiry
          if (data.permitRenewalDate) {
            if (isExpired(data.permitRenewalDate)) {
              alertList.push(`⚠️ Permit expired for ${data.licensePlate}`)
              expiringPermits++
            } else if (isExpiringSoon(data.permitRenewalDate)) {
              alertList.push(`📄 Permit expiring soon for ${data.licensePlate}`)
              expiringPermits++
            }
          }
          
          // Check insurance expiry
          if (data.insuranceExpiryDate) {
            if (isExpired(data.insuranceExpiryDate)) {
              alertList.push(`⚠️ Insurance expired for ${data.licensePlate}`)
              expiringInsurance++
            } else if (isExpiringSoon(data.insuranceExpiryDate)) {
              alertList.push(`🛡️ Insurance expiring soon for ${data.licensePlate}`)
              expiringInsurance++
            }
          }
        })
        
        // Get trips total distance
        const tripsRef = collection(db, 'users', user.uid, 'trips')
        const tripsSnap = await getDocs(tripsRef)
        tripsSnap.forEach(doc => {
          const data = doc.data()
          if (data.distance) totalDist += parseInt(data.distance) || 0
        })
        
        setStats({
          vehicles: vehiclesSnap.size,
          activeVehicles: activeCount,
          expiringPermits: expiringPermits,
          expiringInsurance: expiringInsurance,
          totalDistance: totalDist,
          vehiclesWithServiceRecord: vehiclesWithService
        })
        setAlerts(alertList)
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }
    fetchStats()
  }, [user])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">VM System</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-800">Dashboard</Link>
            <Link to="/vehicles" className="text-gray-600 hover:text-gray-800">Vehicles</Link>
            <Link to="/trips" className="text-gray-600 hover:text-gray-800">Trips</Link>
            <Link to="/reports" className="text-gray-600 hover:text-gray-800">Reports</Link>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow container mx-auto p-6">
        {/* Organization Header */}
        <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg shadow p-6 mb-6 border-l-4 border-blue-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Sita Air Ltd</h1>
              <p className="text-gray-600 mt-1">Baburam Acharya Marg, Sinamangal, Kathmandu, Nepal</p>
              <p className="text-sm text-gray-500 mt-1">Vehicle Management System</p>
            </div>
            
            {/* Export Buttons - Only visible to supervisor */}
            {isSupervisor && (
              <div className="mt-4 md:mt-0 flex gap-2">
                <button
                  onClick={exportVehiclesToCSV}
                  disabled={exporting}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  📊 Export Vehicles
                </button>
                <button
                  onClick={exportTripsToCSV}
                  disabled={exporting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  📋 Export Trips
                </button>
              </div>
            )}
          </div>
          
          {/* Supervisor indicator */}
          {isSupervisor && (
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">
              👑 Supervisor Mode - Export enabled
            </div>
          )}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Compliance Alerts</h3>
            <ul className="space-y-1">
              {alerts.slice(0, 5).map((alert, index) => (
                <li key={index} className="text-sm text-yellow-700">{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Fleet Compliance Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Track vehicle permits, insurance expiry, and service history.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link to="/vehicles" className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition">
            <div>
              <p className="text-gray-500 text-sm">Total Fleet</p>
              <p className="text-3xl font-bold text-gray-800">{stats.vehicles}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.activeVehicles} active</p>
            </div>
          </Link>

          <Link to="/vehicles" className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500 hover:shadow-lg transition">
            <div>
              <p className="text-gray-500 text-sm">Permit Alerts</p>
              <p className={`text-3xl font-bold ${stats.expiringPermits > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.expiringPermits}
              </p>
              <p className="text-xs text-gray-400 mt-1">expiring/expired</p>
            </div>
          </Link>

          <Link to="/vehicles" className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500 hover:shadow-lg transition">
            <div>
              <p className="text-gray-500 text-sm">Insurance Alerts</p>
              <p className={`text-3xl font-bold ${stats.expiringInsurance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.expiringInsurance}
              </p>
              <p className="text-xs text-gray-400 mt-1">expiring/expired</p>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div>
              <p className="text-gray-500 text-sm">Service Records</p>
              <p className="text-3xl font-bold text-gray-800">{stats.vehiclesWithServiceRecord}</p>
              <p className="text-xs text-gray-400 mt-1">out of {stats.vehicles} vehicles</p>
            </div>
          </div>
        </div>

        {/* Quick Actions and Fleet Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/vehicles?action=add">
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
                  ➕ Register New Vehicle
                </button>
              </Link>
              <Link to="/vehicles">
                <button className="w-full bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition">
                  📄 Update Permit/Insurance
                </button>
              </Link>
              <Link to="/trips">
                <button className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                  🔧 Record Service / Trip
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Fleet Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total Distance Covered</span>
                <span className="font-semibold">{stats.totalDistance.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Active Vehicles</span>
                <span className="font-semibold text-green-600">{stats.activeVehicles}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Vehicles with Service History</span>
                <span className="font-semibold">{stats.vehiclesWithServiceRecord}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              A project by{' '}
              <a 
                href="https://gsacharya.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Ghanshyam Acharya
              </a>
            </div>
            <div className="text-sm">
              <a 
                href="https://app.gsacharya.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 hover:underline"
              >
                ← Back to Application Portal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}