/**
 * FILE: FleetAnalytics.jsx
 * VERSION: Test-08
 * AUTHOR: Ghanshyam Acharya
 * PURPOSE: Multi-vehicle efficiency comparison, service cost tracking, and fuel usage analytics
 * DEPENDENCIES: React, Firebase Firestore, Recharts
 * 
 * FEATURES:
 * - Fuel efficiency comparison (km/l) across vehicles (bar chart)
 * - Service cost tracking per vehicle (bar chart)
 * - Monthly fuel cost trends (line chart)
 * - Vehicle performance ranking table
 * - Fleet-wide efficiency metrics
 */

import { useState, useEffect } from 'react'
import { auth, db } from '../config/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

export default function FleetAnalytics() {
  const [loading, setLoading] = useState(true)
  const [vehicleEfficiency, setVehicleEfficiency] = useState([])
  const [serviceCosts, setServiceCosts] = useState([])
  const [monthlyFuelCosts, setMonthlyFuelCosts] = useState([])
  const [vehicleRanking, setVehicleRanking] = useState([])
  const [fleetSummary, setFleetSummary] = useState({
    averageFuelEfficiency: 0,
    totalServiceCost: 0,
    totalFuelCost: 0,
    mostEfficientVehicle: '',
    highestServiceCostVehicle: ''
  })

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#45B7D1']

  const fetchAnalyticsData = async () => {
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

      // Fetch trips
      const tripsRef = collection(db, 'users', user.uid, 'trips')
      const tripsSnap = await getDocs(tripsRef)
      const tripsList = tripsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Calculate fuel efficiency per vehicle
      const efficiencyMap = new Map()
      const serviceCostMap = new Map()
      const monthlyFuelMap = new Map()
      const revenueMap = new Map()
      const tripCountMap = new Map()

      vehiclesList.forEach(vehicle => {
        efficiencyMap.set(vehicle.id, {
          id: vehicle.id,
          name: vehicle.licensePlate,
          totalDistance: 0,
          totalFuel: 0,
          efficiency: 0,
          tripCount: 0
        })
        serviceCostMap.set(vehicle.id, {
          id: vehicle.id,
          name: vehicle.licensePlate,
          serviceCost: parseFloat(vehicle.lastServiceCost) || 0,
          lastServiceDate: vehicle.lastServiceDate,
          lastServiceKm: vehicle.lastServiceKm
        })
        revenueMap.set(vehicle.id, 0)
        tripCountMap.set(vehicle.id, 0)
      })

      // Process trips data
      tripsList.forEach(trip => {
        const vehicleId = trip.vehicleId
        if (efficiencyMap.has(vehicleId)) {
          const data = efficiencyMap.get(vehicleId)
          const distance = parseFloat(trip.distance) || 0
          const fuel = parseFloat(trip.fuelQuantity) || 0
          data.totalDistance += distance
          data.totalFuel += fuel
          data.tripCount++
          efficiencyMap.set(vehicleId, data)
          
          // Add to revenue map
          const currentRevenue = revenueMap.get(vehicleId) || 0
          revenueMap.set(vehicleId, currentRevenue + (parseFloat(trip.revenue) || 0))
          
          // Monthly fuel cost tracking
          if (trip.startDate) {
            const date = new Date(trip.startDate)
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const monthName = date.toLocaleString('default', { month: 'short' })
            
            if (!monthlyFuelMap.has(monthYear)) {
              monthlyFuelMap.set(monthYear, { month: monthName, fuelCost: 0, distance: 0, trips: 0 })
            }
            const monthData = monthlyFuelMap.get(monthYear)
            monthData.fuelCost += parseFloat(trip.fuelCost) || 0
            monthData.distance += parseFloat(trip.distance) || 0
            monthData.trips++
          }
        }
      })

      // Calculate efficiency and create arrays for charts
      const efficiencyArray = []
      const serviceCostArray = []
      const rankingArray = []
      let totalEfficiencySum = 0
      let vehiclesWithEfficiency = 0
      let totalServiceCost = 0
      let totalFuelCost = 0
      let mostEfficient = { name: '', efficiency: 0 }
      let highestService = { name: '', cost: 0 }

      efficiencyMap.forEach((data, id) => {
        const efficiency = data.totalFuel > 0 ? (data.totalDistance / data.totalFuel) : 0
        if (efficiency > 0) {
          efficiencyArray.push({
            name: data.name,
            efficiency: parseFloat(efficiency.toFixed(1)),
            distance: data.totalDistance,
            fuelUsed: data.totalFuel,
            trips: data.tripCount
          })
          totalEfficiencySum += efficiency
          vehiclesWithEfficiency++
          
          if (efficiency > mostEfficient.efficiency) {
            mostEfficient = { name: data.name, efficiency }
          }
        }
      })

      serviceCostMap.forEach((data, id) => {
        if (data.serviceCost > 0) {
          serviceCostArray.push({
            name: data.name,
            cost: data.serviceCost,
            date: data.lastServiceDate ? new Date(data.lastServiceDate).toLocaleDateString() : 'N/A',
            km: data.lastServiceKm ? parseInt(data.lastServiceKm).toLocaleString() : 'N/A'
          })
          totalServiceCost += data.serviceCost
          
          if (data.serviceCost > highestService.cost) {
            highestService = { name: data.name, cost: data.serviceCost }
          }
        }
      })

      // Calculate total fuel cost from monthly data
      const monthlyArray = Array.from(monthlyFuelMap.values()).slice(-6)
      monthlyArray.forEach(month => {
        totalFuelCost += month.fuelCost
      })

      // Create ranking array (combine efficiency, service cost, revenue)
      vehiclesList.forEach(vehicle => {
        const efficiency = efficiencyMap.get(vehicle.id)
        const efficiencyValue = efficiency?.totalFuel > 0 ? (efficiency.totalDistance / efficiency.totalFuel) : 0
        rankingArray.push({
          id: vehicle.id,
          name: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          efficiency: parseFloat(efficiencyValue.toFixed(1)),
          serviceCost: parseFloat(vehicle.lastServiceCost) || 0,
          revenue: revenueMap.get(vehicle.id) || 0,
          trips: tripCountMap.get(vehicle.id) || 0,
          status: vehicle.status
        })
      })

      // Sort ranking by efficiency (best first)
      rankingArray.sort((a, b) => b.efficiency - a.efficiency)

      setVehicleEfficiency(efficiencyArray)
      setServiceCosts(serviceCostArray)
      setMonthlyFuelCosts(monthlyArray)
      setVehicleRanking(rankingArray)
      setFleetSummary({
        averageFuelEfficiency: vehiclesWithEfficiency > 0 ? (totalEfficiencySum / vehiclesWithEfficiency).toFixed(1) : 0,
        totalServiceCost: totalServiceCost,
        totalFuelCost: totalFuelCost,
        mostEfficientVehicle: mostEfficient.name,
        highestServiceCostVehicle: highestService.name
      })

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading fleet analytics...</div>
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
            <Link to="/analytics" className="text-gray-600 hover:text-gray-800 font-semibold text-blue-600">Analytics</Link>
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
            <span className="text-gray-700">Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Fleet Analytics & Efficiency</h1>
          <p className="text-gray-600 mt-1">
            Multi-vehicle efficiency comparison, service cost tracking, and fuel usage analytics.
          </p>
        </div>

        {/* Fleet Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Average Fuel Efficiency</p>
            <p className="text-2xl font-bold text-green-600">{fleetSummary.averageFuelEfficiency} km/l</p>
            <p className="text-xs text-gray-400 mt-1">Fleet average</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Total Service Cost</p>
            <p className="text-2xl font-bold text-red-600">रू {fleetSummary.totalServiceCost.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">All vehicles</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Total Fuel Cost</p>
            <p className="text-2xl font-bold text-yellow-600">रू {fleetSummary.totalFuelCost.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Most Efficient</p>
            <p className="text-xl font-bold text-blue-600 truncate">{fleetSummary.mostEfficientVehicle || 'N/A'}</p>
            <p className="text-xs text-gray-400 mt-1">Best fuel economy</p>
          </div>
        </div>

        {/* Fuel Efficiency Comparison Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">⛽ Fuel Efficiency Comparison (km/l)</h3>
          {vehicleEfficiency.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vehicleEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'km/l', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} km/l`, 'Fuel Efficiency']} />
                <Legend />
                <Bar dataKey="efficiency" fill="#82ca9d" name="Fuel Efficiency (km/l)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No trip data available for fuel efficiency analysis. Start logging trips with fuel quantities.
            </div>
          )}
        </div>

        {/* Service Cost Comparison Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">🔧 Service Cost by Vehicle</h3>
            {serviceCosts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Cost (रू)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`रू ${value.toLocaleString()}`, 'Service Cost']} />
                  <Bar dataKey="cost" fill="#FF8042" name="Service Cost (रू)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No service cost data available. Add service costs when editing vehicles.
              </div>
            )}
          </div>

          {/* Monthly Fuel Cost Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📈 Monthly Fuel Cost Trend</h3>
            {monthlyFuelCosts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyFuelCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis label={{ value: 'Cost (रू)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`रू ${value.toLocaleString()}`, 'Fuel Cost']} />
                  <Legend />
                  <Line type="monotone" dataKey="fuelCost" stroke="#FF6B6B" name="Fuel Cost (रू)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No fuel cost data available. Start logging trips with fuel costs.
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Performance Ranking Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Vehicle Performance Ranking</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Rank</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Make/Model</th>
                  <th className="p-3 text-left">Fuel Efficiency</th>
                  <th className="p-3 text-left">Service Cost</th>
                  <th className="p-3 text-left">Revenue</th>
                  <th className="p-3 text-left">Trips</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicleRanking.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-gray-500">
                      No vehicle data available for ranking.
                    </td>
                  </tr>
                ) : (
                  vehicleRanking.map((vehicle, index) => (
                    <tr key={vehicle.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `${index + 1}th`}
                      </td>
                      <td className="p-3 font-medium">{vehicle.name}</td>
                      <td className="p-3 text-sm text-gray-600">{vehicle.make} {vehicle.model}</td>
                      <td className="p-3">
                        {vehicle.efficiency > 0 ? (
                          <span className="text-green-600 font-semibold">{vehicle.efficiency} km/l</span>
                        ) : (
                          <span className="text-gray-400">No data</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vehicle.serviceCost > 0 ? (
                          <span className="text-red-600">रू {vehicle.serviceCost.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-green-600">
                        {vehicle.revenue > 0 ? `रू ${vehicle.revenue.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3">{vehicle.trips}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                          vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Efficiency Tips */}
        {vehicleEfficiency.length > 0 && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Efficiency Insights</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              {vehicleEfficiency.sort((a, b) => b.efficiency - a.efficiency).slice(0, 3).map((v, i) => (
                <li key={i}>
                  {i === 0 && '🏆 '}
                  {i === 1 && '🥈 '}
                  {i === 2 && '🥉 '}
                  <strong>{v.name}</strong> has {v.efficiency} km/l fuel efficiency 
                  ({v.distance.toLocaleString()} km on {v.fuelUsed.toLocaleString()} liters of fuel)
                </li>
              ))}
              {fleetSummary.averageFuelEfficiency > 0 && (
                <li className="mt-2 pt-2 border-t border-blue-200">
                  📊 Fleet average: <strong>{fleetSummary.averageFuelEfficiency} km/l</strong>
                </li>
              )}
            </ul>
          </div>
        )}
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