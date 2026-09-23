import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, FileText, Search, UserPlus, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('patients/');
        setPatients(response.data);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };
    fetchPatients();
  }, []);

  const stats = [
    { label: 'Active Patients', value: '1,248', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Pending Consents', value: '12', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Critical Alerts', value: '3', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'AI Insights', value: '8', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, Dr. Smith</h1>
          <p className="text-slate-500">Here's an overview of your patients today.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search patients by name or ID..."
            className="w-full md:w-80 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1 tracking-wide uppercase">{stat.label}</p>
              <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-700 to-slate-900">{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-2xl shadow-inner ${stat.bg}`}>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/40 flex items-center justify-between bg-white/30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-800">Recent Patients</h2>
            <Link to="/doctor/patients" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View All</Link>
          </div>
          <div className="divide-y divide-white/40 flex-1">
            {patients.slice(0, 4).map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/40 transition-colors cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center font-bold text-primary-700 shadow-inner group-hover:scale-110 transition-transform">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-primary-700 transition-colors">{p.first_name} {p.last_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">ID: {p.source_id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-green-100/80 text-green-700 shadow-sm border border-green-200/50">Available</span>
                  <Link to={`/doctor/patients/${p.id}`} className="p-2 text-slate-400 group-hover:text-primary-600 transition-colors rounded-xl group-hover:bg-primary-50">
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
            {patients.length === 0 && <div className="p-6 text-slate-500">No recent patients.</div>}
          </div>
        </div>

        {/* Alerts & Pending Consents */}
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-5 border-b border-white/40 bg-white/30 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-slate-800">AI Alerts</h2>
            </div>
            <div className="p-4">
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800">Drug Interaction Detected</h4>
                    <p className="text-xs text-red-600 mt-1">Aspirin and Warfarin prescribed for Jane Smith.</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-start">
                  <Activity className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">Duplicate Lab Test</h4>
                    <p className="text-xs text-amber-600 mt-1">HbA1c recently performed at Mercy Hospital.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-5 border-b border-white/40 bg-white/30 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-slate-800">Pending Consents</h2>
            </div>
            <div className="divide-y divide-white/40">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-800">Michael Johnson</h4>
                  <p className="text-xs text-slate-500">Requested 2 hours ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded text-amber-700 bg-amber-100">Waiting</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
