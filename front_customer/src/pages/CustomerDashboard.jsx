import { useState } from "react";
import GlassCard from "../components/GlassCard";
import OrderStatus from "../components/OrderStatus";

function CustomerDashboard() {
  const [orders] = useState([
    {
      id: "#12345",
      items: ["Kottu Roti", "Lamprais"],
      steward: "Kasun",
      status: "cooking",
      total: 1800,
      date: "2025-01-23 2:30 PM",
    },
    {
      id: "#12344",
      items: ["Spaghetti Carbonara"],
      steward: "Nimal",
      status: "serving",
      total: 1200,
      date: "2025-01-22 7:15 PM",
    },
    {
      id: "#12343",
      items: ["Margherita Pizza", "Risotto"],
      steward: "Dilani",
      status: "finished",
      total: 2850,
      date: "2025-01-21 6:45 PM",
    },
  ]);

  return (
    <div className="min-h-screen bg-dark-gradient md:ml-64 mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Your orders and activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Active Orders", value: "1", icon: "" },
            { label: "Loyalty Points", value: "2,450", icon: "" },
            { label: "Completed Orders", value: "28", icon: "" },
            { label: "Total Spent", value: "Rs. 45,230", icon: "" },
          ].map((stat, idx) => (
            <GlassCard key={idx}>
              <div className="text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                <p className="text-2xl font-bold text-gold-500">{stat.value}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recent Orders</h2>
          {orders.map((order) => (
            <GlassCard key={order.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-400">Order ID: {order.id}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.date}</p>
                  </div>
                  <p className="text-lg font-bold text-gold-500">Rs. {order.total}</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-gray-300 mb-2">Items: {order.items.join(", ")}</p>
                  <p className="text-sm text-gray-400 mb-4">Steward: {order.steward}</p>
                </div>
                <OrderStatus status={order.status} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboard;
