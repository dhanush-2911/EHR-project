import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, HeartPulse, Shield, 
  Calendar, Droplets, QrCode, Sparkles, Edit3, Save, 
  CheckCircle2, Building2, Key, AlertCircle, RefreshCw,
  FileText, Activity
} from 'lucide-react';
import api from '../../api';

export default function PatientProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+1 (555) 392-1084',
    gender: 'Female',
    dob: '1988-04-12',
    bloodGroup: 'O+',
    address: '142 Market Street, San Francisco, CA',
    emergencyContact: 'Robert Smith (Spouse) - +1 (555) 829-3910',
    allergiesSummary: 'Penicillin, Peanuts (Mild)',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('me/');
      setProfile(res.data);
      setFormData(prev => ({
        ...prev,
        firstName: res.data.first_name || (res.data.name?.split(' ')[0] || ''),
        lastName: res.data.last_name || (res.data.name?.split(' ').slice(1).join(' ') || ''),
        email: res.data.email || `${res.data.username || 'patient'}@healthmail.com`,
        gender: res.data.gender || 'Not Specified',
        dob: res.data.dob || '1990-01-01',
        bloodGroup: res.data.blood_group || 'O+',
        address: res.data.address || 'San Francisco, CA',
      }));
    } catch (err) {
      console.error('Error fetching patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch('me/', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        gender: formData.gender,
        dob: formData.dob,
        blood_group: formData.bloodGroup,
        address: formData.address,
      });

      // Update cached user in localStorage
      const cached = localStorage.getItem('user');
      if (cached) {
        const u = JSON.parse(cached);
        u.name = res.data.name;
        localStorage.setItem('user', JSON.stringify(u));
      }

      setProfile(res.data);
      setIsEditing(false);
      setSuccessMsg('Your health profile has been successfully saved!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving patient profile:', err);
      alert('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading Patient Profile...</p>
        </div>
      </div>
    );
  }

  const patientName = profile?.name || `${formData.firstName} ${formData.lastName}` || 'Jane Smith';
  const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PT';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Top Banner / Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 p-8 md:p-10 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 rounded-full bg-emerald-300/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-400 rounded-full border-2 border-white text-emerald-950 shadow-md" title="Active Patient Status">
                <HeartPulse className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{patientName}</h1>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase border border-white/30">
                  Patient Health ID
                </span>
              </div>
              <p className="text-emerald-100 font-medium mt-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-200" />
                Protected under MediLink Consent & Cryptographic Auditing
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-emerald-100">
                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Key className="w-3.5 h-3.5 text-teal-300" />
                  Health ID: <span className="font-mono font-bold tracking-wider">{profile?.health_id || 'HLTH-9482-XA'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-cyan-300" />
                  {profile?.hospital || 'Central Medical System'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-900 font-semibold shadow-md hover:bg-emerald-50 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <Edit3 className="w-4 h-4 text-emerald-700" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold backdrop-blur-md border border-white/30 transition-all duration-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 animate-slide-up shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Vitals & Digital ID */}
        <div className="space-y-6">
          {/* Card: Digital Emergency Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-5 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-emerald-400" /> Emergency Card
              </span>
              <QrCode className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-medium">Blood Type</span>
                <span className="text-base font-extrabold text-red-400 flex items-center gap-1">
                  <Droplets className="w-4 h-4" /> {formData.bloodGroup}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-medium">Date of Birth</span>
                <span className="text-sm font-bold text-white">{formData.dob}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-medium">Gender</span>
                <span className="text-sm font-bold text-white">{formData.gender}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Consent Status</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                  Active & Protected
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <span className="font-semibold text-slate-300 block mb-0.5">Emergency Contact:</span>
              {formData.emergencyContact}
            </div>
          </div>

          {/* Card: Quick Health Indicators */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 shadow-soft space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Health Profile Summary
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100/50 text-center">
                <div className="text-2xl font-black text-teal-700">O+</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Blood Group</div>
              </div>
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100/50 text-center">
                <div className="text-2xl font-black text-cyan-700">100%</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Record Sync</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-center">
                <div className="text-2xl font-black text-emerald-700">3</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Active Consents</div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 text-center">
                <div className="text-2xl font-black text-blue-700">2</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Specialists</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Information Form */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-soft">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Personal & Medical Details</h2>
                <p className="text-sm text-slate-500 mt-0.5">Keep your personal health record information up to date.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {isEditing ? 'Editing Mode' : 'Read Only'}
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Jane"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="patient@healthmail.com"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      disabled={!isEditing}
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Blood Group
                  </label>
                  <div className="relative">
                    <Droplets className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      disabled={!isEditing}
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Gender
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      disabled={!isEditing}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    rows={2}
                    disabled={!isEditing}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Health Ave, Suite 100, City, State, ZIP"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      isEditing 
                        ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/10 focus:border-emerald-600 focus:outline-none' 
                        : 'border-slate-200 bg-slate-50/60 text-slate-700'
                    }`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md hover:shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
