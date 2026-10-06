import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ArrowRight, UserPlus, Activity, 
  Stethoscope, ShieldAlert, Heart, Wind, Droplets, 
  Virus, Sparkles, CheckCircle2, ChevronRight, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
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

  const categories = [
    { 
      id: 'ALL', 
      label: 'All Conditions', 
      icon: Layers, 
      color: 'from-slate-600 to-slate-800',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' 
    },
    { 
      id: 'Infectious & Communicable Diseases', 
      label: 'Infectious & Communicable', 
      icon: Activity, 
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' 
    },
    { 
      id: 'Cancers (Oncology)', 
      label: 'Cancers (Oncology)', 
      icon: ShieldAlert, 
      color: 'from-purple-600 to-indigo-700',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' 
    },
    { 
      id: 'Respiratory Diseases', 
      label: 'Respiratory Diseases', 
      icon: Wind, 
      color: 'from-sky-500 to-blue-600',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200' 
    },
    { 
      id: 'Cardiovascular & Heart Diseases', 
      label: 'Cardiovascular & Heart', 
      icon: Heart, 
      color: 'from-rose-500 to-red-600',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' 
    },
    { 
      id: 'Kidney Diseases', 
      label: 'Kidney Diseases (Renal)', 
      icon: Droplets, 
      color: 'from-teal-500 to-emerald-600',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' 
    },
  ];

  // Calculate patient count per category
  const getCategoryCount = (catId) => {
    if (catId === 'ALL') return patients.length;
    return patients.filter(p => p.disease_category === catId).length;
  };

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'Infectious & Communicable Diseases':
        return { 
          badge: 'bg-amber-100 text-amber-800 border-amber-200', 
          dot: 'bg-amber-500', 
          border: 'hover:border-amber-400',
          gradient: 'from-amber-500/10 to-orange-500/5'
        };
      case 'Cancers (Oncology)':
        return { 
          badge: 'bg-purple-100 text-purple-800 border-purple-200', 
          dot: 'bg-purple-500', 
          border: 'hover:border-purple-400',
          gradient: 'from-purple-500/10 to-indigo-500/5'
        };
      case 'Respiratory Diseases':
        return { 
          badge: 'bg-sky-100 text-sky-800 border-sky-200', 
          dot: 'bg-sky-500', 
          border: 'hover:border-sky-400',
          gradient: 'from-sky-500/10 to-blue-500/5'
        };
      case 'Cardiovascular & Heart Diseases':
        return { 
          badge: 'bg-rose-100 text-rose-800 border-rose-200', 
          dot: 'bg-rose-500', 
          border: 'hover:border-rose-400',
          gradient: 'from-rose-500/10 to-red-500/5'
        };
      case 'Kidney Diseases':
        return { 
          badge: 'bg-teal-100 text-teal-800 border-teal-200', 
          dot: 'bg-teal-500', 
          border: 'hover:border-teal-400',
          gradient: 'from-teal-500/10 to-emerald-500/5'
        };
      default:
        return { 
          badge: 'bg-slate-100 text-slate-800 border-slate-200', 
          dot: 'bg-slate-500', 
          border: 'hover:border-slate-400',
          gradient: 'from-slate-500/10 to-slate-500/5'
        };
    }
  };

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const condition = (p.primary_condition || '').toLowerCase();
    const sourceId = (p.source_id || '').toLowerCase();
    const term = search.toLowerCase();

    const matchesSearch = fullName.includes(term) || condition.includes(term) || sourceId.includes(term);
    const matchesFilter = filterState === 'ALL' || p.access_state === filterState;
    const matchesCategory = selectedCategory === 'ALL' || p.disease_category === selectedCategory;

    return matchesSearch && matchesFilter && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            Patient Disease Registry
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Classified cohort records across infectious, oncology, respiratory, cardiovascular, and renal disease categories.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/80 border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{patients.length} Registered Clinical Patients</span>
          </div>
        </div>
      </div>

      {/* Disease Category Pills Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = getCategoryCount(cat.id);
          
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg -translate-y-0.5 ring-2 ring-primary-500/20' 
                  : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/80 hover:shadow-md hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600 group-hover:text-primary-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 font-mono'
                }`}>
                  {count}
                </span>
              </div>
              <div>
                <div className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {cat.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 md:p-5 border-b border-white/40 bg-white/40 backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by patient name, condition (e.g. Asthma, STEMI, CKD), or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm shadow-inner transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  filterState !== 'ALL' 
                    ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className={`h-4 w-4 ${filterState !== 'ALL' ? 'text-primary-600' : 'text-slate-400'}`} />
                <span>{filterState === 'ALL' ? 'Access State' : filterState.replace('_', ' ')}</span>
              </button>
              
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-30 animate-slide-up">
                  <div className="p-2 space-y-1">
                    <button onClick={() => { setFilterState('ALL'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${filterState === 'ALL' ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`}>All Access States</button>
                    <button onClick={() => { setFilterState('APPROVED'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${filterState === 'APPROVED' ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`}>Approved</button>
                    <button onClick={() => { setFilterState('PENDING'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${filterState === 'PENDING' ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`}>Pending</button>
                    <button onClick={() => { setFilterState('NO_ACCESS'); setShowFilters(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${filterState === 'NO_ACCESS' ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`}>No Access</button>
                  </div>
                </div>
              )}
            </div>

            {(selectedCategory !== 'ALL' || search || filterState !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearch('');
                  setFilterState('ALL');
                }}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Patients Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
              <p className="text-sm font-medium text-slate-500">Categorizing EHR records...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => {
                const theme = getCategoryTheme(patient.disease_category);
                const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`;

                return (
                  <div 
                    key={patient.id} 
                    className={`bg-white rounded-3xl border border-slate-200/80 shadow-soft hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col ${theme.border} hover:-translate-y-1`}
                  >
                    {/* Top gradient banner */}
                    <div className={`p-4 bg-gradient-to-r ${theme.gradient} border-b border-slate-100 flex items-start justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center font-extrabold text-primary-700 text-base group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base group-hover:text-primary-600 transition-colors leading-tight">
                            {patient.first_name} {patient.last_name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 font-medium">
                            {patient.source_id || patient.id.split('-')[0]}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border shadow-xs ${
                        patient.access_state === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        patient.access_state === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {patient.access_state || 'APPROVED'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 space-y-4">
                      {/* Disease Category Badge */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${theme.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                          {patient.disease_category || 'General Care'}
                        </span>
                      </div>

                      {/* Primary Diagnostic Condition */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                          Primary Clinical Condition
                        </span>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                          {patient.primary_condition || 'Clinical Health Monitoring'}
                        </p>
                      </div>

                      {/* Vital Demographic Details */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-semibold block">Blood</span>
                          <span className="font-extrabold text-slate-700">{patient.blood_group || 'O+'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-semibold block">Gender</span>
                          <span className="font-extrabold text-slate-700">{patient.gender || 'Unknown'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-semibold block">DOB</span>
                          <span className="font-extrabold text-slate-700">{patient.dob ? patient.dob.substring(0, 4) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-primary-500" />
                        Full Chart Ready
                      </span>
                      <Link 
                        to={`/doctor/patients/${patient.id}`} 
                        className="text-primary-600 font-bold text-xs flex items-center gap-1 hover:text-primary-800 transition-colors group-hover:translate-x-0.5"
                      >
                        Open Chart <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredPatients.length === 0 && (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 text-slate-400">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">No matching patients in this category</h3>
              <p className="text-slate-500 text-xs max-w-sm mb-4">
                We could not find any patients matching your current search and disease filter.
              </p>
              <button 
                onClick={() => { setSelectedCategory('ALL'); setSearch(''); setFilterState('ALL'); }}
                className="btn-primary text-xs font-bold py-2 px-4"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
