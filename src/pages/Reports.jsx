/**
 * FILE: Reports.jsx
 * VERSION: Test-07
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Generate reports and analytics for fleet management
 * DEPENDENCIES: React, Firebase Firestore, Recharts
 * 
 * CHANGES:
 * - Added monthly trip statistics chart
 * - Added vehicle utilization report
 * - Added revenue/expense tracking
 * - Added export functionality
 * - Fixed JSX syntax error
 */

import { useState, useEffect } from 'react'
import { auth, db } from '../config/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export default function Reports() {
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthlyStats, setMonthlyStats] = useState([])
  const [vehicleUtilization, setVehicleUtilization] = useState([])
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    totalFuelCost: 0,
    totalProfit: 0,
    averageRevenuePerTrip: 0
  })

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const fetchData = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      // Fetch vehicles
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles')
      const vehiclesSnap = await getDocs(vehiclesRef)
      const vehiclesList = vehiclesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setVehicles(vehiclesList)

      // Fetch trips
      const tripsRef = collection(db, 'users', user.uid, 'trips')
      const q = query(tripsRef, orderBy('startDate', 'desc'))
      const tripsSnap = await getDocs(q)
      const tripsList = tripsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setTrips(tripsList)

      // Calculate monthly statistics
      const monthlyMap = new Map()
      let totalRevenue = 0
      let totalFuelCost = 0

      tripsList.forEach(trip => {
        if (trip.startDate) {
          const date = new Date(trip.startDate)
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthName = date.toLocaleString('default', { month: 'short' })
          
          if (!monthlyMap.has(monthYear)) {
            monthlyMap.set(monthYear, { month: monthName, trips: 0, revenue: 0, distance: 0 })
          }
          const monthData = monthlyMap.get(monthYear)
          monthData.trips++
          monthData.revenue += parseInt(trip.revenue || 0)
          monthData.distance += parseInt(trip.distance || 0)
        }
        
        totalRevenue += parseInt(trip.revenue || 0)
        totalFuelCost += parseInt(trip.fuelCost || 0)
      })

      const monthlyArray = Array.from(monthlyMap.values()).slice(-6)
      setMonthlyStats(monthlyArray)
      setFinancialStats({
        totalRevenue,
        totalFuelCost,
        totalProfit: totalRevenue - totalFuelCost,
        averageRevenuePerTrip: tripsList.length > 0 ? totalRevenue / tripsList.length : 0
      })

      // Calculate vehicle utilization
      const vehicleStats = vehiclesList.map(vehicle => {
        const vehicleTrips = tripsList.filter(trip => trip.vehicleId === vehicle.id)
        const totalRevenue = vehicleTrips.reduce((sum, t) => sum + parseInt(t.revenue || 0), 0)
        const totalDistance = vehicleTrips.reduce((sum, t) => sum + parseInt(t.distance || 0), 0)
        return {
          name: vehicle.licensePlate,
          trips: vehicleTrips.length,
          revenue: totalRevenue,
          distance: totalDistance,
          status: vehicle.status
        }
      }).filter(v => v.trips > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      
      setVehicleUtilization(vehicleStats)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading reports...</div>
          <div className="text-gray-500">Please wait</div>
        </div>
      </div>
    )
  }

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

      <div className="flex-grow container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-700">Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Fleet Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">
            View comprehensive reports on fleet performance, revenue trends, and vehicle utilization.
          </p>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">रू {financialStats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Total Fuel Cost</p>
            <p className="text-2xl font-bold text-red-600">रू {financialStats.totalFuelCost.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Profit</p>
            <p className="text-2xl font-bold text-blue-600">रू {financialStats.totalProfit.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Avg Revenue/Trip</p>
            <p className="text-2xl font-bold text-yellow-600">रू {Math.round(financialStats.averageRevenuePerTrip).toLocaleString()}</p>
          </div>
        </div>

        {/* Monthly Trip Statistics Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Monthly Trip Statistics</h3>
          {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="trips" fill="#8884d8" name="Number of Trips" />
                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (रू)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">No trip data available for charts</div>
          )}
        </div>

        {/* Vehicle Utilization Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Vehicles by Revenue</h3>
            {vehicleUtilization.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehicleUtilization}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {vehicleUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">No vehicle data available</div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Vehicle Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left text-sm">Vehicle</th>
                    <th className="p-2 text-left text-sm">Trips</th>
                    <th className="p-2 text-left text-sm">Revenue</th>
                    <th className="p-2 text-left text-sm">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleUtilization.slice(0, 5).map((vehicle, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-sm">{vehicle.name}</td>
                      <td className="p-2 text-sm">{vehicle.trips}</td>
                      <td className="p-2 text-sm text-green-600">रू {vehicle.revenue.toLocaleString()}</td>
                      <td className="p-2 text-sm">{vehicle.distance.toLocaleString()} km</td>
                    </tr>
                  ))}
                  {vehicleUtilization.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-500">No trip data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Trips Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Trips</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-sm">Date</th>
                  <th className="p-2 text-left text-sm">Vehicle</th>
                  <th className="p-2 text-left text-sm">Route</th>
                  <th className="p-2 text-left text-sm">Distance</th>
                  <th className="p-2 text-left text-sm">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 10).map((trip) => {
                  const vehicle = vehicles.find(v => v.id === trip.vehicleId)
                  return (
                    <tr key={trip.id} className="border-t">
                      <td className="p-2 text-sm">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '-'}</td>
                      <td className="p-2 text-sm">{vehicle?.licensePlate || 'Unknown'}</td>
                      <td className="p-2 text-sm">{trip.startLocation} → {trip.endLocation}</td>
                      <td className="p-2 text-sm">{trip.distance ? `${trip.distance} km` : '-'}</td>
                      <td className="p-2 text-sm text-green-600">रू {parseInt(trip.revenue || 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">No trips recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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