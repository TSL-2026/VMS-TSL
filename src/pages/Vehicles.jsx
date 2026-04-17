/**
 * FILE: Vehicles.jsx
 * VERSION: Test-08
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Manage all vehicles (list, add, edit, delete) with service cost tracking
 * DEPENDENCIES: React, Firebase Firestore, React Router
 * 
 * CHANGES:
 * - Added lastServiceCost field to track service expenses
 * - Made vehicle rows clickable to navigate to VehicleDetail page
 * - Added proper error handling and form validation
 * - Added loading states
 */

import { useState, useEffect } from 'react'
import { auth, db } from '../config/firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { Link, useSearchParams } from 'react-router-dom'

export default function Vehicles() {
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')
  const editId = searchParams.get('edit')
  
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
    lastServiceCost: '',      // NEW: Service cost field
    lastServiceNotes: '',
    purchaseDate: '',
    supplier: '',
    chassisNumber: '',
    engineNumber: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  // Auto-open form when URL has ?action=add or ?edit=id
  useEffect(() => {
    if (action === 'add') {
      setShowForm(true)
      setEditingId(null)
      resetFormData()
    }
    if (editId) {
      const vehicleToEdit = vehicles.find(v => v.id === editId)
      if (vehicleToEdit) {
        handleEdit(vehicleToEdit)
      }
    }
  }, [action, editId, vehicles])

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

  const validateForm = () => {
    const newErrors = {}
    if (!formData.licensePlate) newErrors.licensePlate = 'License plate is required'
    if (!formData.make) newErrors.make = 'Make is required'
    if (!formData.model) newErrors.model = 'Model is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const resetFormData = () => {
    setFormData({
      licensePlate: '', make: '', model: '', year: '', color: '', status: 'active',
      permitRenewalDate: '', insuranceExpiryDate: '', lastServiceDate: '', lastServiceKm: '',
      lastServiceCost: '', lastServiceNotes: '', purchaseDate: '', supplier: '',
      chassisNumber: '', engineNumber: '', notes: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
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
      
      resetFormData()
      setShowForm(false)
      setErrors({})
      fetchVehicles()
      window.history.replaceState({}, '', '/vehicles')
    } catch (error) {
      console.error('Error saving vehicle:', error)
      alert('Error saving vehicle: ' + error.message)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this vehicle? This will also delete all trips associated with this vehicle.')) return
    
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
      lastServiceCost: vehicle.lastServiceCost || '',      // NEW
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
    resetFormData()
    setErrors({})
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading vehicles...</div>
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
            <Link to="/reports" className="text-gray-600 hover:text-gray-800">Reports</Link>
            <Link to="/analytics" className="text-gray-600 hover:text-gray-800">Analytics</Link>
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
            <span className="text-gray-700">Vehicles</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Vehicle Registry</h1>
          <p className="text-gray-600 mt-1">
            Manage all vehicle details including permits, insurance, service history, and service costs.
          </p>
        </div>

        {/* Add Vehicle Button */}
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              resetFormData()
            }}
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
              <div>
                <input
                  type="text"
                  name="licensePlate"
                  placeholder="License Plate *"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.licensePlate ? 'border-red-500' : ''}`}
                  required
                />
                {errors.licensePlate && <p className="text-red-500 text-xs mt-1">{errors.licensePlate}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="make"
                  placeholder="Make (e.g., Toyota, Hino) *"
                  value={formData.make}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.make ? 'border-red-500' : ''}`}
                  required
                />
                {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="model"
                  placeholder="Model *"
                  value={formData.model}
                  onChange={handleChange}
                  className={`p-2 border rounded w-full ${errors.model ? 'border-red-500' : ''}`}
                  required
                />
                {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
              </div>
              <div>
                <input
                  type="number"
                  name="year"
                  placeholder="Manufacturing Year"
                  value={formData.year}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="color"
                  placeholder="Color"
                  value={formData.color}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              {/* Registration & Permits */}
              <div>
                <input
                  type="text"
                  name="chassisNumber"
                  placeholder="Chassis Number"
                  value={formData.chassisNumber}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="engineNumber"
                  placeholder="Engine Number"
                  value={formData.engineNumber}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="permitRenewalDate"
                  value={formData.permitRenewalDate}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                  placeholder="Permit Renewal Date"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="insuranceExpiryDate"
                  value={formData.insuranceExpiryDate}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                  placeholder="Insurance Expiry Date"
                />
              </div>

              {/* Service History with Cost */}
              <div>
                <input
                  type="date"
                  name="lastServiceDate"
                  value={formData.lastServiceDate}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                  placeholder="Last Service Date"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="lastServiceKm"
                  placeholder="Last Service KM"
                  value={formData.lastServiceKm}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="lastServiceCost"
                  placeholder="Last Service Cost (रू)"
                  value={formData.lastServiceCost}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  name="lastServiceNotes"
                  placeholder="Last Service Notes (e.g., Oil change, brake pad)"
                  value={formData.lastServiceNotes}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>

              {/* Purchase Information */}
              <div>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                  placeholder="Purchase Date"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="supplier"
                  placeholder="Supplier / Seller"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                />
              </div>
              
              <div className="md:col-span-2">
                <textarea
                  name="notes"
                  placeholder="Additional Notes"
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
                  {editingId ? 'Update Vehicle' : 'Register Vehicle'}
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
                <th className="p-3 text-left">Service Cost</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No vehicles registered yet. Click "Register New Vehicle" to get started.
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.id} 
                    className="border-t hover:bg-gray-50 cursor-pointer group"
                    onClick={() => window.location.href = `/vehicles/${vehicle.id}`}
                  >
                    <td className="p-3 font-medium text-blue-600 group-hover:underline">
                      {vehicle.licensePlate}
                    </td>
                    <td className="p-3">{vehicle.make} {vehicle.model}</td>
                    <td className="p-3">
                      {vehicle.permitRenewalDate ? (
                        <span className={`text-sm ${isExpired(vehicle.permitRenewalDate) ? 'text-red-600 font-semibold' : isExpiringSoon(vehicle.permitRenewalDate) ? 'text-yellow-600' : 'text-green-600'}`}>
                          {new Date(vehicle.permitRenewalDate).toLocaleDateString()}
                        </span>
                      ) : 'Not set'}
                    </td>
                    <td className="p-3">
                      {vehicle.insuranceExpiryDate ? (
                        <span className={`text-sm ${isExpired(vehicle.insuranceExpiryDate) ? 'text-red-600 font-semibold' : isExpiringSoon(vehicle.insuranceExpiryDate) ? 'text-yellow-600' : 'text-green-600'}`}>
                          {new Date(vehicle.insuranceExpiryDate).toLocaleDateString()}
                        </span>
                      ) : 'Not set'}
                    </td>
                    <td className="p-3">
                      {vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toLocaleDateString() : 'No record'}
                    </td>
                    <td className="p-3">
                      {vehicle.lastServiceCost ? `रू ${parseInt(vehicle.lastServiceCost).toLocaleString()}` : '-'}
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
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(vehicle)
                        }}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDelete(vehicle.id, e)}
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