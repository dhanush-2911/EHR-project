import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Clock, AlertTriangle } from 'lucide-react';
import api from '../../api';

export default function Consents() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const userStr = localStorage.getItem('user');
  const doctorId = userStr ? JSON.parse(userStr).doctor_id : null;

  const fetchConsents = async () => {
    try {
      const response = await api.get(`consents/?doctor_id=${doctorId}`);
      setRequests(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pending Consents</h1>
        <p className="text-slate-500">Track cross-hospital access requests to patient records.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/40 backdrop-blur-sm border-b border-white/40 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Hospital Origin</th>
                <th className="px-6 py-4">Request Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">No requests found.</td></tr>
              ) : requests.map(req => (
                <tr key={req.id} className="hover:bg-white/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{req.patient_id}</td>
                  <td className="px-6 py-4 text-slate-500">{req.hospital_name || 'System'}</td>
                  <td className="px-6 py-4 text-slate-500 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'revoked' ? 'bg-red-100 text-red-700' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
