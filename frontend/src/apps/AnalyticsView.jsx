import React from 'react';
import { LineChart, PieChart, Activity } from 'lucide-react';

const AnalyticsView = () => {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Global Platform Performance</h1>
          <p className="text-sm text-gray-500">Last synced with DB: 2 mins ago</p>
        </div>
      </header>

      {/* Grid Layout for Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ML Insight Card - Shared Service Integration */}
        <div className="md:col-span-2 bg-indigo-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-indigo-200" />
              <span className="text-sm font-medium uppercase">ML Insights</span>
            </div>
            <h2 className="text-3xl font-bold">Predicted Q1 Revenue Uplift: +18%</h2>
            <p className="mt-2 text-indigo-100">Based on recent CRM lead velocity and Marketing automation trends.</p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-20">
            <LineChart size={160} />
          </div>
        </div>

        {/* User Acquisition Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold mb-4 text-gray-700">User Acquisition Channels</h3>
          <div className="h-48 flex items-center justify-center">
             {/* Replace with your favorite Chart library like Recharts */}
             <div className="rounded-full border-8 border-blue-500 w-32 h-32 flex items-center justify-center">
                <span className="text-xs font-bold">72% Organic</span>
             </div>
          </div>
        </div>

      </div>

      {/* Status Bar - Billing Shared Service */}
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between">
        <span className="text-sm text-amber-800 font-medium">Subscription renewal required in 7 days</span>
        <button className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition">
          Renew Now
        </button>
      </div>
    </div>
  );
};

export default AnalyticsView;