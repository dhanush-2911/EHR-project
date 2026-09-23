import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filterState, setFilterState] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('patients/');
        setPatients(response.data);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = (p.first_name + ' ' + p.last_name).toLowerCase().includes(search.toLowerCase()) || 
                          (p.source_id || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterState === 'ALL' || p.access_state === filterState;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Patients</h1>
          <p className="text-slate-500">Manage and view your patient records.</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Add Patient</span>
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/40 bg-white/30 backdrop-blur-sm flex flex-col sm:flex-row gap-4 relative">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or condition..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
          
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center space-x-2 ${filterState !== 'ALL' ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}>
              <Filter className={`h-4 w-4 ${filterState !== 'ALL' ? 'text-primary-600' : ''}`} />
              <span className={filterState !== 'ALL' ? 'text-primary-700 font-bold' : ''}>
                {filterState === 'ALL' ? 'Filters' : filterState.replace('_', ' ')}
              </span>
            </button>
            
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-20 animate-slide-up">
                <div className="p-2 space-y-1">
                  <button onClick={() => { setFilterState('ALL'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterState === 'ALL' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>All Patients</button>
                  <button onClick={() => { setFilterState('APPROVED'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterState === 'APPROVED' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>Approved Access</button>
                  <button onClick={() => { setFilterState('PENDING'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterState === 'PENDING' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>Pending Requests</button>
                  <button onClick={() => { setFilterState('NO_ACCESS'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterState === 'NO_ACCESS' ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>No Access</button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group overflow-hidden flex flex-col">
                  <div className="h-16 bg-gradient-to-r from-slate-50 to-primary-50 border-b border-slate-100 flex items-center px-4">
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center font-bold text-primary-600 text-lg translate-y-3">
                      {patient.first_name?.[0]}{patient.last_name?.[0]}
                    </div>
                  </div>
                  <div className="pt-6 px-4 pb-4 flex-1">
                    <h4 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-primary-600 transition-colors">
                      {patient.first_name} {patient.last_name}
                    </h4>
                    <div className="space-y-1 text-sm text-slate-500 mb-4">
                      <p><strong>ID:</strong> {patient.source_id || patient.id.split('-')[0]}</p>
                      <p><strong>DOB:</strong> {patient.dob || 'Unknown'}</p>
                      <p><strong>Gender:</strong> {patient.gender || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${
                      patient.access_state === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                      patient.access_state === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      patient.access_state === 'EXPIRED' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {patient.access_state ? patient.access_state.replace('_', ' ') : 'NO ACCESS'}
                    </span>
                    <Link to={`/doctor/patients/${patient.id}`} className="text-primary-600 font-medium text-sm flex items-center hover:text-primary-700 transition-colors">
                      View Profile <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && filteredPatients.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No patients found</h3>
              <p className="text-slate-500 max-w-sm">We couldn't find any patients matching your search criteria. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
