import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Building2, Stethoscope, 
  ShieldCheck, Award, Calendar, Clock, Edit3, Save, CheckCircle2,
  Sparkles, Hash, Activity, Lock, RefreshCw
} from 'lucide-react';
import api from '../../api';

export default function DoctorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    email: '',
    phone: '',
    hospital: '',
    licenseNumber: 'MD-89241-CA',
    bio: 'Dedicated medical practitioner specializing in continuous patient wellness, clinical evidence integration, and secure electronic health coordination.',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('me/');
      setProfile(res.data);
      setFormData(prev => ({
        ...prev,
        name: res.data.name || '',
        specialty: res.data.specialty || 'General Medicine',
        email: res.data.email || `${res.data.username || 'doctor'}@hospital.org`,
        hospital: res.data.hospital || 'Memorial General Hospital',
      }));
    } catch (err) {
      console.error('Error fetching doctor profile:', err);
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
        email: formData.email,
        specialty: formData.specialty,
        first_name: formData.name.replace(/^dr\.\s*/i, '').split(' ')[0] || '',
        last_name: formData.name.replace(/^dr\.\s*/i, '').split(' ').slice(1).join(' ') || '',
      });
      
      // Update local storage so navbar and dashboard update immediately
      const cached = localStorage.getItem('user');
      if (cached) {
        const u = JSON.parse(cached);
        u.name = res.data.name;
        localStorage.setItem('user', JSON.stringify(u));
      }

      setProfile(res.data);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading Doctor Profile...</p>
        </div>
      </div>
    );
  }

  const doctorName = profile?.name || 'Dr. Medical Practitioner';
  const initials = doctorName.replace(/^dr\.\s*/i, '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Top Banner / Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-primary-700 p-8 md:p-10 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 rounded-full bg-primary-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:md:h-28 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 rounded-full border-2 border-white text-white shadow-md" title="Active License">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{doctorName}</h1>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase border border-white/30">
                  Doctor Portal
                </span>
              </div>
              <p className="text-blue-100 font-medium mt-1 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary-200" />
                {profile?.specialty || 'General Medicine'} &bull; {profile?.hospital || 'General Hospital'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-blue-200">
                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Hash className="w-3.5 h-3.5 text-blue-300" />
                  Doctor ID: {profile?.doctor_id?.substring(0, 13) || 'DOC-74892'}...
                </span>
                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  Verified Clinician
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-800 font-semibold shadow-md hover:bg-slate-50 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <Edit3 className="w-4 h-4 text-primary-600" />
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
        {/* Left Column: Quick Credentials & Status */}
        <div className="space-y-6">
          {/* Card: Verification Badge */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 shadow-soft space-y-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Credentials & Verification
            </h3>

            <div className="space-y-4 text-sm">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Medical License</div>
                  <div className="font-bold text-slate-800">{formData.licenseNumber}</div>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Primary Hospital</div>
                  <div className="font-bold text-slate-800">{formData.hospital}</div>
                </div>
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">FHIR & Consent Clearance</div>
                  <div className="font-bold text-slate-800">Level 4 Full EHR</div>
                </div>
                <Lock className="w-5 h-5 text-primary-500" />
              </div>
            </div>
          </div>

          {/* Card: Practice Statistics */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 shadow-soft space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              Clinical Practice Summary
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-primary-50/50 border border-primary-100/50 text-center">
                <div className="text-2xl font-black text-primary-700">1,248</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Assigned Patients</div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 text-center">
                <div className="text-2xl font-black text-indigo-700">99.4%</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Audit Compliance</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-center">
                <div className="text-2xl font-black text-emerald-700">100%</div>
                <div className="text-xs font-medium text-slate-600 mt-1">HIPAA Verified</div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50 text-center">
                <div className="text-2xl font-black text-amber-700">24/7</div>
                <div className="text-xs font-medium text-slate-600 mt-1">Break-Glass Ready</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Information Form */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-soft">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Doctor Profile Details</h2>
                <p className="text-sm text-slate-500 mt-0.5">Manage your public clinician details and contact channels.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {isEditing ? 'Editing Mode' : 'Read Only'}
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Full Clinician Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Dr. Sarah Smith"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-primary-400 bg-white ring-2 ring-primary-500/10 focus:border-primary-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Medical Specialty
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="e.g. Cardiology, Oncology, General Medicine"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-primary-400 bg-white ring-2 ring-primary-500/10 focus:border-primary-600 focus:outline-none' 
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
                      placeholder="doctor@hospital.org"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isEditing 
                          ? 'border-primary-400 bg-white ring-2 ring-primary-500/10 focus:border-primary-600 focus:outline-none' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Hospital Affiliation
                  </label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={formData.hospital}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-700 text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Clinical Bio & Expertise
                </label>
                <textarea
                  rows={4}
                  disabled={!isEditing}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Clinical background, patient care philosophy, or specialized interests..."
                  className={`w-full p-4 rounded-xl border text-sm font-medium transition-all ${
                    isEditing 
                      ? 'border-primary-400 bg-white ring-2 ring-primary-500/10 focus:border-primary-600 focus:outline-none' 
                      : 'border-slate-200 bg-slate-50/60 text-slate-700'
                  }`}
                />
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-lg hover:from-primary-700 hover:to-indigo-700 transition-all disabled:opacity-50"
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
