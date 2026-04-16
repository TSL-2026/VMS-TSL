/**
 * FILE: Trips.jsx
 * VERSION: Test-01
 * CHANGES:
 * - New page created for trip management
 * - Added navigation bar with Dashboard, Vehicles, Trips links
 * - Added fixed footer with project credits
 * - Added form to log trips with vehicle selection
 * PURPOSE: Log and track trips for all vehicles
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
      
      setFormData({
        vehicleId: '', startLocation: '', endLocation: '', startDate: '', endDate: '',
        distance: '', revenue: '', fuelCost: '', driverName: '', notes: ''
      })
      setShowForm(false)
      fetchTrips()
    } catch (error) {
      console.error('Error saving trip:', error)
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
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      vehicleId: '', startLocation: '', endLocation: '', startDate: '', endDate: '',
      distance: '', revenue: '', fuelCost: '', driverName: '', notes: ''
    })
  }

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'Unknown'
  }

  if (loading) {
    return <div className="text-center py-8">Loading trips...</div>
  }

  return (
    <div className="p-6">
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
          <Link to="/vehicles" className="underline">Add a vehicle now</Link>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Trip' : 'Log New Trip'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            >
              <option value="">Select Vehicle *</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.licensePlate} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="driverName"
              placeholder="Driver Name"
              value={formData.driverName}
              onChange={handleChange}
              className="p-2 border rounded"
            />
            <input
              type="text"
              name="startLocation"
              placeholder="Start Location *"
              value={formData.startLocation}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              name="endLocation"
              placeholder="End Location *"
              value={formData.endLocation}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
            <input
              type="number"
              name="distance"
              placeholder="Distance (km)"
              value={formData.distance}
              onChange={handleChange}
              className="p-2 border rounded"
            />
            <input
              type="number"
              name="revenue"
              placeholder="Revenue (रू)"
              value={formData.revenue}
              onChange={handleChange}
              className="p-2 border rounded"
            />
            <input
              type="number"
              name="fuelCost"
              placeholder="Fuel Cost (रू)"
              value={formData.fuelCost}
              onChange={handleChange}
              className="p-2 border rounded"
            />
            <textarea
              name="notes"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={handleChange}
              className="p-2 border rounded md:col-span-2"
              rows="2"
            />
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {editingId ? 'Update Trip' : 'Save Trip'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
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
                <tr key={trip.id} className="border-t">
                  <td className="p-3">{getVehicleName(trip.vehicleId)}</td>
                  <td className="p-3">{trip.startLocation} → {trip.endLocation}</td>
                  <td className="p-3">
                    {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{trip.distance} km</td>
                  <td className="p-3 text-green-600">रू {parseInt(trip.revenue || 0).toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(trip.id)}
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
  )
}