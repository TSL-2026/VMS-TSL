/**
 * FILE: VehicleDetail.jsx
 * VERSION: Test-07
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: View complete details of a single vehicle
 * DEPENDENCIES: React, Firebase Firestore, React Router
 * 
 * CHANGES:
 * - Created dedicated vehicle detail view
 * - Shows all vehicle information including permits, insurance, service
 * - Links to edit vehicle and view trips
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../config/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const user = auth.currentUser
      if (!user) {
        navigate('/login')
        return
      }

      try {
        // Fetch vehicle details
        const vehicleDoc = doc(db, 'users', user.uid, 'vehicles', id)
        const vehicleSnap = await getDoc(vehicleDoc)
        
        if (!vehicleSnap.exists()) {
          navigate('/vehicles')
          return
        }
        
        setVehicle({ id: vehicleSnap.id, ...vehicleSnap.data() })

        // Fetch trips for this vehicle
        const tripsRef = collection(db, 'users', user.uid, 'trips')
        const q = query(tripsRef, where('vehicleId', '==', id))
        const tripsSnap = await getDocs(q)
        const tripsList = tripsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setTrips(tripsList.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)))
      } catch (error) {
        console.error('Error fetching vehicle details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleDetails()
  }, [id, navigate])

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
          <div className="text-xl mb-2">Loading vehicle details...</div>
          <div className="text-gray-500">Please wait</div>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-red-600">Vehicle not found</div>
          <Link to="/vehicles" className="text-blue-500 hover:underline">Back to Vehicles</Link>
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
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link to="/vehicles" className="hover:text-gray-700">Vehicles</Link>
          <span>/</span>
          <span className="text-gray-700">{vehicle.licensePlate}</span>
        </div>

        {/* Header with Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{vehicle.licensePlate}</h1>
            <p className="text-gray-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
          </div>
          <div className="flex gap-3">
            <Link to={`/vehicles?edit=${vehicle.id}`}>
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                ✏️ Edit Vehicle
              </button>
            </Link>
            <Link to="/trips">
              <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                📝 Log Trip
              </button>
            </Link>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
            vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {vehicle.status === 'active' ? '🟢 Active' : 
             vehicle.status === 'maintenance' ? '🟡 Maintenance' : '⚫ Retired'}
          </span>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">License Plate:</span>
                <span className="font-medium">{vehicle.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Make:</span>
                <span>{vehicle.make}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span>{vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Year:</span>
                <span>{vehicle.year || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Color:</span>
                <span>{vehicle.color || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chassis Number:</span>
                <span className="font-mono text-sm">{vehicle.chassisNumber || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Engine Number:</span>
                <span className="font-mono text-sm">{vehicle.engineNumber || 'Not recorded'}</span>
              </div>
            </div>
          </div>

          {/* Permit & Insurance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Permits & Insurance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Permit Renewal Date:</span>
                <span className={isExpired(vehicle.permitRenewalDate) ? 'text-red-600 font-semibold' : 
                              isExpiringSoon(vehicle.permitRenewalDate) ? 'text-yellow-600' : ''}>
                  {vehicle.permitRenewalDate ? new Date(vehicle.permitRenewalDate).toLocaleDateString() : 'Not set'}
                  {isExpired(vehicle.permitRenewalDate) && ' (EXPIRED)'}
                  {isExpiringSoon(vehicle.permitRenewalDate) && !isExpired(vehicle.permitRenewalDate) && ' (Expiring soon)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance Expiry Date:</span>
                <span className={isExpired(vehicle.insuranceExpiryDate) ? 'text-red-600 font-semibold' : 
                              isExpiringSoon(vehicle.insuranceExpiryDate) ? 'text-yellow-600' : ''}>
                  {vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toLocaleDateString() : 'Not set'}
                  {isExpired(vehicle.insuranceExpiryDate) && ' (EXPIRED)'}
                  {isExpiringSoon(vehicle.insuranceExpiryDate) && !isExpired(vehicle.insuranceExpiryDate) && ' (Expiring soon)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Purchase Date:</span>
                <span>{vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString() : 'Not recorded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier/Seller:</span>
                <span>{vehicle.supplier || 'Not recorded'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service History */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Service History</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Last Service Date:</span>
              <span>{vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toLocaleDateString() : 'No record'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Service KM:</span>
              <span>{vehicle.lastServiceKm ? `${parseInt(vehicle.lastServiceKm).toLocaleString()} km` : 'Not recorded'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Service Notes:</span>
              <span className="text-gray-600">{vehicle.lastServiceNotes || 'No notes'}</span>
            </div>
          </div>
        </div>

        {/* Trip History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Trip History</h3>
          {trips.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No trips recorded for this vehicle</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Route</th>
                    <th className="p-2 text-left">Distance</th>
                    <th className="p-2 text-left">Revenue</th>
                    <th className="p-2 text-left">Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.slice(0, 10).map((trip) => (
                    <tr key={trip.id} className="border-t">
                      <td className="p-2">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '-'}</td>
                      <td className="p-2">{trip.startLocation} → {trip.endLocation}</td>
                      <td className="p-2">{trip.distance ? `${trip.distance} km` : '-'}</td>
                      <td className="p-2 text-green-600">रू {parseInt(trip.revenue || 0).toLocaleString()}</td>
                      <td className="p-2">{trip.driverName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {trips.length > 10 && (
                <div className="text-center mt-4">
                  <Link to="/trips" className="text-blue-500 hover:underline">View all {trips.length} trips →</Link>
                </div>
              )}
            </div>
          )}
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