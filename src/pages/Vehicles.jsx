/**
 * FILE: Vehicles.jsx
 * VERSION: Test-06
 * CHANGES:
 * - Removed unused useNavigate import (was causing error)
 * - Fixed blank page issue
 * - Added proper error handling
 * PURPOSE: Track actual vehicle data including permits, insurance, service history
 */

import { useState, useEffect } from 'react'
import { auth, db } from '../config/firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { Link, useSearchParams } from 'react-router-dom'  // Removed useNavigate

export default function Vehicles() {
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')
  
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
    status: 'active',
    permitRenewalDate: '',
    insuranceExpiryDate: '',
    lastServiceDate: '',
    lastServiceKm: '',
    lastServiceNotes: '',
    purchaseDate: '',
    supplier: '',
    chassisNumber: '',
    engineNumber: '',
    notes: ''
  })

  // Auto-open form when URL has ?action=add
  useEffect(() => {
    if (action === 'add') {
      setShowForm(true)
    }
  }, [action])

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
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
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
      
      if (editingId) {
        const vehicleDoc = doc(db, 'users', user.uid, 'vehicles', editingId)
        await updateDoc(vehicleDoc, formData)
        setEditingId(null)
      } else {
        await addDoc(vehiclesRef, {
          ...formData,
          createdAt: new Date().toISOString()
        })
      }
      
      setFormData({
        licensePlate: '', make: '', model: '', year: '', color: '', status: 'active',
        permitRenewalDate: '', insuranceExpiryDate: '', lastServiceDate: '', lastServiceKm: '',
        lastServiceNotes: '', purchaseDate: '', supplier: '', chassisNumber: '', engineNumber: '', notes: ''
      })
      setShowForm(false)
      fetchVehicles()
      // Remove ?action=add from URL without reloading
      window.history.replaceState({}, '', '/vehicles')
    } catch (error) {
      console.error('Error saving vehicle:', error)
      alert('Error saving vehicle: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return
    
    const user = auth.currentUser
    if (!user) return

    try {
      const vehicleDoc = doc(db, 'users', user.uid, 'vehicles', id)
      await deleteDoc(vehicleDoc)
      fetchVehicles()
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      alert('Error deleting vehicle: ' + error.message)
    }
  }

  const handleEdit = (vehicle) => {
    setFormData({
      licensePlate: vehicle.licensePlate || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      color: vehicle.color || '',
      status: vehicle.status || 'active',
      permitRenewalDate: vehicle.permitRenewalDate || '',
      insuranceExpiryDate: vehicle.insuranceExpiryDate || '',
      lastServiceDate: vehicle.lastServiceDate || '',
      lastServiceKm: vehicle.lastServiceKm || '',
      lastServiceNotes: vehicle.lastServiceNotes || '',
      purchaseDate: vehicle.purchaseDate || '',
      supplier: vehicle.supplier || '',
      chassisNumber: vehicle.chassisNumber || '',
      engineNumber: vehicle.engineNumber || '',
      notes: vehicle.notes || ''
    })
    setEditingId(vehicle.id)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      licensePlate: '', make: '', model: '', year: '', color: '', status: 'active',
      permitRenewalDate: '', insuranceExpiryDate: '', lastServiceDate: '', lastServiceKm: '',
      lastServiceNotes: '', purchaseDate: '', supplier: '', chassisNumber: '', engineNumber: '', notes: ''
    })
    window.history.replaceState({}, '', '/vehicles')
  }

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

  // Add console log to debug
  console.log('Vehicles page rendering', { loading, vehiclesCount: vehicles.length, showForm })

  if (loading) {
    return <div className="text-center py-8">Loading vehicles...</div>
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700">Vehicles</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Vehicle Registry</h1>
        <p className="text-gray-600 mt-1">
          Manage all vehicle details including permits, insurance, and service history.
        </p>
      </div>

      {/* Add Vehicle Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-6"
        >
          + Register New Vehicle
        </button>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Vehicle' : 'Register New Vehicle'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <input type="text" name="licensePlate" placeholder="License Plate *" value={formData.licensePlate} onChange={handleChange} className="p-2 border rounded" required />
            <input type="text" name="make" placeholder="Make (e.g., Toyota, Hino)" value={formData.make} onChange={handleChange} className="p-2 border rounded" required />
            <input type="text" name="model" placeholder="Model" value={formData.model} onChange={handleChange} className="p-2 border rounded" required />
            <input type="number" name="year" placeholder="Manufacturing Year" value={formData.year} onChange={handleChange} className="p-2 border rounded" />
            <input type="text" name="color" placeholder="Color" value={formData.color} onChange={handleChange} className="p-2 border rounded" />
            <select name="status" value={formData.status} onChange={handleChange} className="p-2 border rounded">
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>

            {/* Registration & Permits */}
            <input type="text" name="chassisNumber" placeholder="Chassis Number" value={formData.chassisNumber} onChange={handleChange} className="p-2 border rounded" />
            <input type="text" name="engineNumber" placeholder="Engine Number" value={formData.engineNumber} onChange={handleChange} className="p-2 border rounded" />
            <input type="date" name="permitRenewalDate" value={formData.permitRenewalDate} onChange={handleChange} className="p-2 border rounded" />
            <input type="date" name="insuranceExpiryDate" value={formData.insuranceExpiryDate} onChange={handleChange} className="p-2 border rounded" />

            {/* Service History */}
            <input type="date" name="lastServiceDate" value={formData.lastServiceDate} onChange={handleChange} className="p-2 border rounded" />
            <input type="number" name="lastServiceKm" placeholder="Last Service KM" value={formData.lastServiceKm} onChange={handleChange} className="p-2 border rounded" />
            <input type="text" name="lastServiceNotes" placeholder="Last Service Notes (e.g., Oil change, brake pad)" value={formData.lastServiceNotes} onChange={handleChange} className="p-2 border rounded md:col-span-2" />

            {/* Purchase Information */}
            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="p-2 border rounded" />
            <input type="text" name="supplier" placeholder="Supplier / Seller" value={formData.supplier} onChange={handleChange} className="p-2 border rounded" />
            
            <textarea name="notes" placeholder="Additional Notes" value={formData.notes} onChange={handleChange} className="p-2 border rounded md:col-span-2" rows="2" />
            
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                {editingId ? 'Update Vehicle' : 'Register Vehicle'}
              </button>
              <button type="button" onClick={handleCancel} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">License Plate</th>
              <th className="p-3 text-left">Make/Model</th>
              <th className="p-3 text-left">Permit</th>
              <th className="p-3 text-left">Insurance</th>
              <th className="p-3 text-left">Last Service</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No vehicles registered yet. Click "Register New Vehicle" to get started.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-t">
                  <td className="p-3 font-medium">{vehicle.licensePlate}</td>
                  <td className="p-3">{vehicle.make} {vehicle.model}</td>
                  <td className="p-3">
                    {vehicle.permitRenewalDate ? (
                      <span className={`text-sm ${isExpired(vehicle.permitRenewalDate) ? 'text-red-600 font-semibold' : isExpiringSoon(vehicle.permitRenewalDate) ? 'text-yellow-600' : 'text-green-600'}`}>
                        {new Date(vehicle.permitRenewalDate).toLocaleDateString()}
                        {isExpiringSoon(vehicle.permitRenewalDate) && !isExpired(vehicle.permitRenewalDate) && ' (Expiring soon)'}
                        {isExpired(vehicle.permitRenewalDate) && ' (EXPIRED)'}
                      </span>
                    ) : 'Not set'}
                  </td>
                  <td className="p-3">
                    {vehicle.insuranceExpiryDate ? (
                      <span className={`text-sm ${isExpired(vehicle.insuranceExpiryDate) ? 'text-red-600 font-semibold' : isExpiringSoon(vehicle.insuranceExpiryDate) ? 'text-yellow-600' : 'text-green-600'}`}>
                        {new Date(vehicle.insuranceExpiryDate).toLocaleDateString()}
                        {isExpiringSoon(vehicle.insuranceExpiryDate) && !isExpired(vehicle.insuranceExpiryDate) && ' (Expiring soon)'}
                        {isExpired(vehicle.insuranceExpiryDate) && ' (EXPIRED)'}
                      </span>
                    ) : 'Not set'}
                  </td>
                  <td className="p-3">
                    {vehicle.lastServiceDate ? (
                      <div>
                        <div className="text-sm">{new Date(vehicle.lastServiceDate).toLocaleDateString()}</div>
                        {vehicle.lastServiceKm && <div className="text-xs text-gray-500">{parseInt(vehicle.lastServiceKm).toLocaleString()} km</div>}
                      </div>
                    ) : 'No record'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleEdit(vehicle)} className="text-blue-500 hover:text-blue-700 mr-3">Edit</button>
                    <button onClick={() => handleDelete(vehicle.id)} className="text-red-500 hover:text-red-700">Delete</button>
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