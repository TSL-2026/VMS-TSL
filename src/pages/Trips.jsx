/**
 * FILE: Trips.jsx
 * VERSION: Test-07
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Manage trips for all vehicles (add, edit, delete, view)
 * DEPENDENCIES: React, Firebase Firestore, React Router
 * 
 * CHANGES:
 * - Added edit trip functionality
 * - Added trip details view
 * - Improved form validation
 * - Added loading states
 * - Added error handling
 */

import { useState, useEffect } from 'react'
import { auth, db } from '../config/firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Link } from 'react-router-dom'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [formData, setFormData] = useState({
    vehicleId: '',
    startLocation: '',
    endLocation: '',
    startDate: '',
    endDate: '',
    distance: '',
    revenue: '',
    fuelCost: '',
    driverName: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  // Fetch vehicles for dropdown
  const fetchVehicles = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
      const snapshot = await getDocs(vehiclesRef)
      const vehiclesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setVehicles(vehiclesList)
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    }
  }

  // Fetch trips
  const fetchTrips = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      const tripsRef = collection(db, 'users', user.uid, 'trips')
      const q = query(tripsRef, orderBy('startDate', 'desc'))
      const snapshot = await getDocs(q)
      const tripsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setTrips(tripsList)
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
    fetchTrips()
  }, [])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required'
    if (!formData.startLocation) newErrors.startLocation = 'Start location is required'
    if (!formData.endLocation) newErrors.endLocation = 'End location is required'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error for this field when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
    const user = auth.currentUser
    if (!user) return

    try {
      const tripsRef = collection(db, 'users', user.uid, 'trips')
      
      if (editingId) {
        const tripDoc = doc(db, 'users', user.uid, 'trips', editingId)
        await updateDoc(tripDoc, formData)
        setEditingId(null)
      } else {
        await addDoc(tripsRef, {
          ...formData,
          createdAt: new Date().toISOString()
        })
      }
      
      resetForm()
      fetchTrips()
    } catch (error) {
      console.error('Error saving trip:', error)
      alert('Error saving trip: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this trip?')) return
    
    const user = auth.currentUser
    if (!user) return

    try {
      const tripDoc = doc(db, 'users', user.uid, 'trips', id)
      await deleteDoc(tripDoc)
      fetchTrips()
    } catch (error) {
      console.error('Error deleting trip:', error)
      alert('Error deleting trip: ' + error.message)
    }
  }

  const handleEdit = (trip) => {
    setFormData({
      vehicleId: trip.vehicleId || '',
      startLocation: trip.startLocation || '',
      endLocation: trip.endLocation || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      distance: trip.distance || '',
      revenue: trip.revenue || '',
      fuelCost: trip.fuelCost || '',
      driverName: trip.driverName || '',
      notes: trip.notes || ''
    })
    setEditingId(trip.id)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleViewDetails = (trip) => {
    setSelectedTrip(trip)
    setShowDetails(true)
    setShowForm(false)
  }

  const resetForm = () => {
    setFormData({
      vehicleId: '', startLocation: '', endLocation: '', startDate: '', endDate: '',
      distance: '', revenue: '', fuelCost: '', driverName: '', notes: ''
    })
    setEditingId(null)
    setShowForm(false)
    setErrors({})
  }

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading trips...</div>
          <div className="text-gray-500">Please wait</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">VM System</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-800">Dashboard</Link>
            <Link to="/vehicles" className="text-gray-600 hover:text-gray-800">Vehicles</Link>
            <Link to="/trips" className="text-gray-600 hover:text-gray-800">Trips</Link>
            <span className="text-sm text-gray-600">{auth.currentUser?.email}</span>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-700">Trips</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Trip Management</h1>
          <p className="text-gray-600 mt-1">
            Log and track all trips for your vehicles. Record distance, revenue, fuel costs, 
            and driver information for each journey.
          </p>
        </div>

        {/* Add Trip Button */}
        {!showForm && vehicles.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-6"
          >
            + Log New Trip
          </button>
        )}

        {vehicles.length === 0 && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-6">
            ⚠️ You need to add a vehicle before logging trips.{' '}
            <Link to="/vehicles?action=add" className="underline">Add a vehicle now</Link>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Trip' : 'Log New Trip'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.vehicleId ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Select Vehicle *</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} - {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
                {errors.vehicleId && <p className="text-red-500 text-xs mt-1">{errors.vehicleId}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="driverName"
                  placeholder="Driver Name"
                  value={formData.driverName}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="startLocation"
                  placeholder="Start Location *"
                  value={formData.startLocation}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.startLocation ? 'border-red-500' : ''}`}
                  required
                />
                {errors.startLocation && <p className="text-red-500 text-xs mt-1">{errors.startLocation}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="endLocation"
                  placeholder="End Location *"
                  value={formData.endLocation}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.endLocation ? 'border-red-500' : ''}`}
                  required
                />
                {errors.endLocation && <p className="text-red-500 text-xs mt-1">{errors.endLocation}</p>}
              </div>
              <div>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.startDate ? 'border-red-500' : ''}`}
                  required
                />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.endDate ? 'border-red-500' : ''}`}
                  required
                />
                {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
              </div>
              <div>
                <input
                  type="number"
                  name="distance"
                  placeholder="Distance (km)"
                  value={formData.distance}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="revenue"
                  placeholder="Revenue (रू)"
                  value={formData.revenue}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="fuelCost"
                  placeholder="Fuel Cost (रू)"
                  value={formData.fuelCost}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div className="md:col-span-2">
                <textarea
                  name="notes"
                  placeholder="Notes (optional)"
                  value={formData.notes}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                  rows="2"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  {editingId ? 'Update Trip' : 'Save Trip'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Trip Details Modal */}
        {showDetails && selectedTrip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Trip Details</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Vehicle</p>
                      <p className="font-medium">{getVehicleName(selectedTrip.vehicleId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="font-medium">{selectedTrip.driverName || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Route</p>
                      <p className="font-medium">{selectedTrip.startLocation} → {selectedTrip.endLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dates</p>
                      <p className="font-medium">
                        {selectedTrip.startDate && new Date(selectedTrip.startDate).toLocaleDateString()} - 
                        {selectedTrip.endDate && new Date(selectedTrip.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Distance</p>
                      <p className="font-medium">{selectedTrip.distance ? `${selectedTrip.distance} km` : 'Not recorded'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Revenue</p>
                      <p className="font-medium text-green-600">रू {parseInt(selectedTrip.revenue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fuel Cost</p>
                      <p className="font-medium">रू {parseInt(selectedTrip.fuelCost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Profit</p>
                      <p className="font-medium text-blue-600">
                        रू {(parseInt(selectedTrip.revenue || 0) - parseInt(selectedTrip.fuelCost || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedTrip.notes && (
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium">{selectedTrip.notes}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetails(false)
                      handleEdit(selectedTrip)
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Edit Trip
                  </button>
                  <button
                    onClick={() => {
                      setShowDetails(false)
                      handleDelete(selectedTrip.id)
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Delete Trip
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trips List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-left">Route</th>
                <th className="p-3 text-left">Dates</th>
                <th className="p-3 text-left">Distance</th>
                <th className="p-3 text-left">Revenue</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No trips yet. Click "Log New Trip" to get started.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(trip)}>
                    <td className="p-3">{getVehicleName(trip.vehicleId)}</td>
                    <td className="p-3">{trip.startLocation} → {trip.endLocation}</td>
                    <td className="p-3">
                      {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">{trip.distance ? `${trip.distance} km` : '-'}</td>
                    <td className="p-3 text-green-600">रू {parseInt(trip.revenue || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(trip)
                        }}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(trip.id)
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              A project by{' '}
              <a href="https://gsacharya.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Ghanshyam Acharya
              </a>
            </div>
            <div className="text-sm">
              <a href="https://app.gsacharya.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline">
                ← Back to Application Portal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}