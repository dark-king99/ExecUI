import { useState } from "react";
import React from 'react';


import { Play, Plus, Mail, Users, Zap, ArrowRight } from 'lucide-react';


export default function MarketingView( {roleToUse} ) {
 // Mock data representing the "Marketing Service" logic layer
 const workflowNodes = [
  { id: 1, type: 'Trigger', title: 'New Subscriber', desc: 'When user joins list', icon: <Users className="text-blue-500" /> },
  { id: 2, type: 'Action', title: 'Send Welcome Email', desc: 'Delay: 5 minutes', icon: <Mail className="text-purple-500" /> },
  { id: 3, type: 'Action', title: 'Tag as "New Lead"', desc: 'Update CRM Shared Service', icon: <Zap className="text-amber-500" /> },
];

return (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
     <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing Automation</h1>
        <p className="text-slate-500 text-sm">Visual workflow builder for customer journeys</p>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2  text-slate-900 dark:text-white px-4 py-2 border border-slate-200 rounded-lg bg-indigo-400 hover:bg-slate-50 font-medium transition">
          <Plus size={18} /> Add Node
        </button>
        <button className="flex items-center gap-2 bg-purple-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg hover:bg-purple-800 font-medium transition shadow-sm">
          <Play size={18} /> Publish Workflow
        </button>
      </div>
    </div>

    {/* The Canvas Area */}
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm overflow-hidden flex items-center justify-center">
      <div className="flex flex-col md:flex-row items-center gap-8 z-10">
        {workflowNodes.map((node, index) => (
          <React.Fragment key={node.id}>
            {/* Individual Node Card */}
            <div className="w-64 bg-white dark:bg-teal-300  border-slate-200 dark:border-slate-800  p-5 rounded-xl shadow-md border hover:border-blue-400 transition cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition">
                  {node.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{node.type}</span>
              </div>
              <h3 className="font-bold text-slate-800">{node.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{node.desc}</p>
            </div>

            {/* Connecting Arrow (except for the last item) */}
            {index < workflowNodes.length - 1 && (
              <div className="text-slate-400 animate-pulse">
                <ArrowRight size={32} className="rotate-90 md:rotate-0" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Canvas Background Grid (Decorative) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
    </div>
    </div>
    );
  }