import React, { useState, useEffect } from 'react';
import { 
  Shield, Check, X, Clock, Activity, FileText, AlertTriangle, 
  User, Calendar, Pill, HeartPulse, FileHeart, Sparkles, Send, 
  ScanLine, Upload, FileUp, CheckCircle2, TrendingUp, AlertCircle, 
  Info, RefreshCw, ChevronRight, Download
} from 'lucide-react';
import api from '../../api';

export default function PatientPortal() {
  const [requests, setRequests] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('records'); // records, consents, audit, ai
  const [logs, setLogs] = useState([]);
  
  const [chatHistory, setChatHistory] = useState([{ role: 'assistant', content: 'Hello! I am your AI Health Assistant. I have full knowledge of your medical history, labs, and prescriptions. How can I assist you with your health today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [records, setRecords] = useState({ encounters: [], conditions: [], observations: [], prescriptions: [], allergies: [] });

  // Medical Report Upload & AI Analysis State
  const [reportFile, setReportFile] = useState(null);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportError, setReportError] = useState(null);

  const handleReportAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!reportFile && !reportText.trim()) {
      setReportError('Please upload a medical report file or enter report text.');
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      const formData = new FormData();
      if (reportFile) {
        formData.append('file', reportFile);
      }
      if (reportText) {
        formData.append('report_text', reportText);
      }
      if (patient?.id) {
        formData.append('patient_id', patient.id);
      }

      const res = await api.post('analyze-report/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setReportResult(res.data);
    } catch (err) {
      console.error(err);
      setReportError(err.response?.data?.error || 'Failed to analyze medical report. Please check AI Engine connection.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSampleReport = () => {
    setReportFile(null);
    setReportText(
`METRO HEALTH LABS - COMPREHENSIVE METABOLIC & LIPID PANEL
Patient: Jane Smith | Age: 44 | Specimen ID: LAB-90482
Date: 10/05/2026 | Ordering Physician: Dr. Sarah Smith

TEST RESULTS:
- Fasting Blood Glucose: 138 mg/dL (Normal: 70 - 99 mg/dL) [HIGH]
- Hemoglobin A1c (HbA1c): 7.2% (Normal: 4.0 - 5.6%) [ELEVATED]
- Systolic Blood Pressure: 144 / 88 mmHg (Normal: < 120/80 mmHg) [HIGH]
- Serum Creatinine: 1.42 mg/dL (Normal: 0.6 - 1.2 mg/dL) [HIGH]
- Estimated GFR (eGFR): 52 mL/min/1.73m2 (Normal: > 60 mL/min) [LOW]
- Total Cholesterol: 228 mg/dL (Normal: < 200 mg/dL) [HIGH]
- LDL Cholesterol: 154 mg/dL (Normal: < 100 mg/dL) [HIGH]
- HDL Cholesterol: 42 mg/dL (Normal: > 40 mg/dL) [NORMAL]
- Triglycerides: 185 mg/dL (Normal: < 150 mg/dL) [ELEVATED]
- White Blood Cell Count (WBC): 8.4 10*3/uL (Normal: 4.5 - 11.0) [NORMAL]
- Pulse Oximetry (SpO2): 98% (Normal: 95 - 100%) [NORMAL]

CLINICAL IMPRESSION:
Patient demonstrates persistent hyperglycemia consistent with Type 2 Diabetes Mellitus with early mild microvascular nephropathy markers (reduced eGFR) and Stage 2 Essential Hypertension.`
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      const patientId = userStr ? JSON.parse(userStr).patient_id : null;
      
      if (!patientId) {
        throw new Error('Not logged in as a patient');
      }

      const [ptRes, reqRes, logRes] = await Promise.all([
        api.get(`patients/${patientId}/`),
        api.get(`consents/?patient_id=${patientId}`),
        api.get(`audit/?patient_id=${patientId}`)
      ]);
      setPatient(ptRes.data);
      setRequests(reqRes.data);
      setLogs(logRes.data);

      const [encRes, condRes, obsRes, rxRes, allRes] = await Promise.all([
        api.get(`patients/${patientId}/encounters/`).catch(() => ({data:[]})),
        api.get(`patients/${patientId}/conditions/`).catch(() => ({data:[]})),
        api.get(`patients/${patientId}/observations/`).catch(() => ({data:[]})),
        api.get(`patients/${patientId}/prescriptions/`).catch(() => ({data:[]})),
        api.get(`patients/${patientId}/allergies/`).catch(() => ({data:[]})),
      ]);

      setRecords({
        encounters: encRes.data,
        conditions: condRes.data,
        observations: obsRes.data,
        prescriptions: rxRes.data,
        allergies: allRes.data
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !patient || chatLoading) return;

    const userMessage = { role: 'user', content: chatInput.trim() };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post(`patients/${patient.id}/chat/`, { messages: newHistory }, { headers: { 'X-Patient-ID': patient.id } });
      setChatHistory([...newHistory, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`consents/${id}/${action}/`);
      fetchData(); // refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to update consent.');
    }
  };

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  
  const handleShowQR = async () => {
    setShowQRModal(true);
    if (!qrImageUrl) {
      try {
        const response = await api.get('patients/health-id/qr/', { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        setQrImageUrl(url);
      } catch (err) {
        console.error('Failed to load QR code', err);
      }
    }
  };
  
  if (loading) return <div className="p-10 text-center text-slate-500">Loading your portal...</div>;
  if (!patient) return <div className="p-10 text-center text-red-500">Error loading profile.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Emergency Health ID</h3>
            <p className="text-sm text-slate-500 mb-6">First responders can scan this code to securely access your basic demographics.</p>
            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block min-h-[192px] min-w-[192px] flex items-center justify-center">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="Health ID QR" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="animate-pulse text-slate-400">Loading...</div>
              )}
            </div>
            <button onClick={() => setShowQRModal(false)} className="mt-6 w-full btn-primary py-2 rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* Patient Profile Card */}
      <div className="glass-card overflow-hidden shadow-lg shadow-primary-500/10">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 p-8 text-white flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="h-24 w-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-4xl font-bold backdrop-blur-sm shadow-xl flex-shrink-0">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-extrabold mb-1">{patient.first_name} {patient.last_name}</h1>
              <p className="text-primary-100 font-medium">Patient ID: {patient.source_id}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start mt-3 gap-3 text-sm font-medium">
                <span className="flex items-center bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm"><User className="w-4 h-4 mr-2"/> {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
                <span className="flex items-center bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm"><Calendar className="w-4 h-4 mr-2"/> {patient.dob}</span>
              </div>
              <button onClick={handleShowQR} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors border border-white/30 rounded-full text-sm font-bold shadow-sm backdrop-blur-md flex items-center mx-auto md:mx-0">
                <ScanLine className="w-4 h-4 mr-2" /> Show Health ID
              </button>
            </div>
          </div>
          <div className="text-right flex flex-col gap-2 min-w-[150px]">
            <div className="bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/20 text-center md:text-right shadow-inner">
              <span className="text-primary-100 block text-xs uppercase font-bold tracking-wider mb-1">Active Requests</span>
              <span className="text-3xl font-bold text-white">{requests.filter(r => r.status === 'pending').length}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mb-6 gap-2 hide-scrollbar">
        <button onClick={() => setActiveTab('records')} className={`px-6 py-4 font-bold whitespace-nowrap transition-colors flex items-center ${activeTab === 'records' ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><FileHeart className="w-5 h-5 mr-2"/> My Health Records</button>
        <button onClick={() => setActiveTab('report-analysis')} className={`px-6 py-4 font-bold whitespace-nowrap transition-colors flex items-center ${activeTab === 'report-analysis' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/70 rounded-t-lg shadow-xs' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}><FileUp className="w-5 h-5 mr-2 text-indigo-600"/> Upload & Analyze Report</button>
        <button onClick={() => setActiveTab('consents')} className={`px-6 py-4 font-bold whitespace-nowrap transition-colors flex items-center ${activeTab === 'consents' ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><Shield className="w-5 h-5 mr-2"/> Access Consents</button>
        <button onClick={() => setActiveTab('audit')} className={`px-6 py-4 font-bold whitespace-nowrap transition-colors flex items-center ${activeTab === 'audit' ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><FileText className="w-5 h-5 mr-2"/> Audit History</button>
        <button onClick={() => setActiveTab('ai')} className={`px-6 py-4 font-bold whitespace-nowrap transition-colors flex items-center ${activeTab === 'ai' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><Sparkles className="w-5 h-5 mr-2"/> AI Health Assistant</button>
      </div>

      {/* Content - Records */}
      {activeTab === 'records' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center"><Activity className="h-6 w-6 mr-2 text-primary-500"/> Recent Visits</h3>
              {records.encounters.length === 0 ? <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">No recent visits.</div> : (
                <div className="space-y-4">
                  {records.encounters.slice(0, 5).map(e => (
                    <div key={e.id} className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-primary-300 hover:shadow-md transition-all">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{e.encounter_type}</h4>
                        <p className="text-sm text-slate-500 mt-1">{e.reason || 'Routine Checkup'}</p>
                      </div>
                      <div className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-full whitespace-nowrap flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(e.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center"><HeartPulse className="h-6 w-6 mr-2 text-primary-500"/> Recent Lab Results</h3>
              {records.observations.length === 0 ? <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">No lab results found.</div> : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs font-bold tracking-wider">
                      <tr>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Test</th>
                        <th className="px-5 py-4 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {records.observations.slice(0, 10).map(o => (
                        <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-500">{new Date(o.date).toLocaleDateString()}</td>
                          <td className="px-5 py-4 text-slate-800 font-medium">{o.test_name}</td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md">{o.value}</span>
                            <span className="text-slate-400 font-medium text-xs ml-2">{o.units}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {records.observations.length > 10 && <div className="text-center p-4 bg-slate-50 text-sm text-primary-600 font-bold border-t border-slate-200">Showing latest 10 results</div>}
                </div>
              )}
            </div>
            
          </div>
          
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center"><Activity className="h-5 w-5 mr-2 text-primary-500"/> Diagnosed Conditions</h3>
              {records.conditions.length === 0 ? <p className="text-slate-500 text-sm">No conditions found.</p> : (
                <div className="space-y-6">
                  {(() => {
                    const activeDisorders = records.conditions.filter(c => !c.resolved_date && !c.description.toLowerCase().includes('(finding)'));
                    const resolvedDisorders = records.conditions.filter(c => c.resolved_date && !c.description.toLowerCase().includes('(finding)'));
                    const findings = records.conditions.filter(c => c.description.toLowerCase().includes('(finding)'));
                    
                    return (
                      <>
                        {activeDisorders.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Active Medical Disorders</h4>
                            <ul className="space-y-3">
                              {activeDisorders.map(c => (
                                <li key={c.id} className="p-3 bg-white rounded-xl border border-red-100 shadow-sm border-l-4 border-l-red-500">
                                  <span className="font-bold text-slate-800 block mb-1">{c.description.replace(' (disorder)', '')}</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">Onset: {c.onset_date}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {resolvedDisorders.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Resolved / Past Conditions</h4>
                            <ul className="space-y-3">
                              {resolvedDisorders.map(c => (
                                <li key={c.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-green-500">
                                  <span className="font-bold text-slate-700 block mb-1">{c.description.replace(' (disorder)', '')}</span>
                                  <div className="flex space-x-2">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">Onset: {c.onset_date}</span>
                                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded">Resolved: {c.resolved_date}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {findings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Social & Environmental Findings</h4>
                            <ul className="space-y-3">
                              {findings.map(c => (
                                <li key={c.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
                                  <span className="font-bold text-slate-600 block mb-1">{c.description.replace(' (finding)', '')}</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">Recorded: {c.onset_date}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="glass-card p-6 bg-gradient-to-b from-white to-primary-50/30">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center"><Pill className="h-5 w-5 mr-2 text-primary-500"/> Active Medications</h3>
              {records.prescriptions.length === 0 ? <p className="text-slate-500 text-sm">No medications found.</p> : (
                <ul className="space-y-3">
                  {records.prescriptions.filter(p => !p.end_date).map(p => (
                    <li key={p.id} className="p-4 bg-primary-50 rounded-xl border border-primary-100 shadow-sm">
                      <span className="font-bold text-primary-900 block mb-2">{p.medication_name}</span>
                      <span className="text-xs text-primary-700 font-bold bg-primary-200/50 px-2 py-1 rounded-md inline-block">Prescribed: {new Date(p.start_date).toLocaleDateString()}</span>
                    </li>
                  ))}
                  {records.prescriptions.filter(p => !p.end_date).length === 0 && <p className="text-slate-500 text-sm">No active medications.</p>}
                </ul>
              )}
            </div>

            {records.allergies.length > 0 && (
              <div className="glass-card p-6 border-l-4 border-red-500 bg-gradient-to-br from-white to-red-50/50">
                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center"><AlertTriangle className="h-5 w-5 mr-2"/> Allergies</h3>
                <ul className="space-y-3">
                  {records.allergies.map(a => (
                    <li key={a.id} className="text-sm font-bold text-red-800 bg-white border border-red-100 p-3 rounded-xl shadow-sm">
                      <div className="flex items-center mb-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        {a.allergen}
                      </div>
                      <span className="font-medium text-red-600/80 block text-xs ml-4">Reaction: {a.reaction || 'Unknown'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content - Consents */}
      {activeTab === 'consents' && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg mr-3">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Data Access Requests</h2>
                <p className="text-sm text-slate-500 mt-1">Manage which doctors can view your medical records.</p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 bg-white/30">
            {requests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Shield className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-lg font-medium">No active access requests.</p>
                <p className="text-sm mt-2">When a doctor requests access to your data, it will appear here.</p>
              </div>
            ) : requests.map(req => (
              <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between gap-6 hover:bg-white/60 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-extrabold text-slate-800 text-xl">{req.doctor_name || 'Doctor'}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                      req.status === 'revoked' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                    {req.is_break_glass && <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white shadow-sm shadow-red-500/30">EMERGENCY OVERRIDE</span>}
                  </div>
                  <p className="text-slate-500 text-sm mb-4 font-bold uppercase tracking-wider">{req.hospital_name || 'Hospital'}</p>
                  
                  <div className="text-sm text-slate-700 bg-slate-50/80 p-4 rounded-xl mb-4 border border-slate-100">
                    <p className="mb-2"><strong className="text-slate-900 mr-2">Purpose:</strong> {req.purpose}</p>
                    <p><strong className="text-slate-900 mr-2">Scope:</strong> <span className="bg-white px-2 py-1 rounded border border-slate-200">{Array.isArray(req.scope) ? req.scope.join(', ') : req.scope}</span></p>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-xs font-bold text-slate-500">
                    <span className="flex items-center bg-slate-100 px-3 py-1.5 rounded-lg"><Clock className="h-4 w-4 mr-2 text-slate-400"/> Requested: {new Date(req.request_date).toLocaleDateString()}</span>
                    {req.expiry_date && <span className="flex items-center bg-amber-50 px-3 py-1.5 rounded-lg text-amber-700"><AlertTriangle className="h-4 w-4 mr-2 text-amber-500"/> Expires: {new Date(req.expiry_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3 sm:min-w-[160px] justify-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-6">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(req.id, 'approve')} className="btn-primary py-3 px-4 flex justify-center items-center shadow-lg shadow-primary-500/20 text-sm font-bold">
                        <Check className="h-5 w-5 mr-2" /> Approve
                      </button>
                      <button onClick={() => handleAction(req.id, 'revoke')} className="btn-danger py-3 px-4 flex justify-center items-center shadow-lg shadow-red-500/20 text-sm font-bold">
                        <X className="h-5 w-5 mr-2" /> Deny
                      </button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <button onClick={() => handleAction(req.id, 'revoke')} className="px-4 py-3 bg-white text-red-600 font-bold rounded-xl border-2 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm text-sm flex items-center justify-center">
                      <X className="h-5 w-5 mr-2" /> Revoke Access
                    </button>
                  )}
                  {req.status === 'revoked' && (
                    <button onClick={() => handleAction(req.id, 'approve')} className="px-4 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-sm flex items-center justify-center">
                      <Check className="h-5 w-5 mr-2" /> Re-Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Content - Upload & Analyze Medical Report */}
      {activeTab === 'report-analysis' && (
        <div className="space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 p-8 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Medical Report AI Analysis & Prediction</h2>
                    <p className="text-indigo-100 text-sm mt-0.5">
                      Upload your lab report or diagnostic summary to extract biomarkers, receive clinical insights, and get disease risk predictions.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSampleReport}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 transition-all rounded-xl text-xs font-bold border border-white/30 backdrop-blur-md flex items-center gap-2 self-start md:self-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Load Sample Metabolic Report
              </button>
            </div>
          </div>

          {/* Upload and Input Form */}
          <div className="glass-card p-6 md:p-8">
            <form onSubmit={handleReportAnalyze} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Upload Report Document (PDF, TXT, CSV, or Image)
                  </label>
                  <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-6 text-center transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[180px]">
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv,.png,.jpg,.jpeg"
                      onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    {reportFile ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-indigo-900 truncate max-w-xs">{reportFile.name}</p>
                        <p className="text-xs text-indigo-600">{(reportFile.size / 1024).toFixed(1)} KB • Ready to analyze</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-700">Click to browse or drop file here</p>
                        <p className="text-xs text-slate-500 mt-1">Supports PDF diagnostic slips, Lab text files, or Scans</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Direct Text Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Or Paste Medical Report Content Directly
                  </label>
                  <textarea
                    rows={7}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="e.g. Fasting Glucose: 130 mg/dL, HbA1c: 6.8%, Blood Pressure: 140/90, Creatinine: 1.3 mg/dL, Cholesterol: 220 mg/dL..."
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {reportError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  HIPAA-aligned & cross-referenced against your personal EHR history
                </span>

                <button
                  type="submit"
                  disabled={reportLoading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5"
                >
                  {reportLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing Report with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Run Full Report Analysis & Prediction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AI Analysis & Prediction Results */}
          {reportResult && (
            <div className="space-y-6 animate-slide-up">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Detected Category</span>
                  <div className="text-base font-extrabold text-indigo-700">{reportResult.report_summary?.detected_category}</div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Clinical Risk Level</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase mt-1 ${
                    reportResult.report_summary?.clinical_risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                    reportResult.report_summary?.clinical_risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    reportResult.report_summary?.clinical_risk_level === 'MODERATE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {reportResult.report_summary?.clinical_risk_level || 'LOW'}
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Parsed Biomarkers</span>
                  <div className="text-2xl font-black text-slate-800">{reportResult.parsed_biomarkers?.length || 0}</div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Predictions Generated</span>
                  <div className="text-2xl font-black text-purple-700">{reportResult.predicted_risks?.length || 0}</div>
                </div>
              </div>

              {/* Parsed Biomarkers Grid */}
              {reportResult.parsed_biomarkers?.length > 0 && (
                <div className="glass-card p-6 md:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600" />
                      Extracted Laboratory Biomarkers & Vitals
                    </h3>
                    <span className="text-xs font-bold text-slate-500">Auto-calculated vs. Standard Clinical Ranges</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportResult.parsed_biomarkers.map((b, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">{b.name}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            b.status === 'Elevated' ? 'bg-red-100 text-red-700' :
                            b.status === 'Low' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-slate-900">{b.value}</span>
                          <span className="text-xs text-slate-500 font-medium">{b.units}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                          <span>Ref: {b.reference_range}</span>
                          <span className="text-slate-400 truncate max-w-[120px]">{b.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Findings and Prognostic Predictions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Findings */}
                <div className="glass-card p-6 md:p-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Key Clinical Findings
                  </h3>
                  <div className="space-y-3">
                    {reportResult.key_findings?.map((finding, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-sm font-medium flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Disease Risk Predictions */}
                <div className="glass-card p-6 md:p-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Prognostic Disease Risk Predictions
                  </h3>
                  <div className="space-y-3">
                    {reportResult.predicted_risks?.map((pred, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-purple-950 text-sm">{pred.condition}</h4>
                          <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-200/80 text-purple-800">
                            {pred.probability}
                          </span>
                        </div>
                        <div className="text-xs text-purple-800/80">
                          <strong>Horizon:</strong> {pred.timeframe} &bull; <strong>Area:</strong> {pred.impact_area}
                        </div>
                        <div className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-xl border border-purple-100">
                          <strong>Preventive Target:</strong> {pred.preventive_intervention}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Clinical Suggestions */}
              {reportResult.actionable_suggestions?.length > 0 && (
                <div className="glass-card p-6 md:p-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Personalized AI Action Suggestions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportResult.actionable_suggestions.map((sug, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{sug.category}</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.2 rounded bg-slate-100 text-slate-600">{sug.priority}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{sug.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center font-medium">
                {reportResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content - Audit */}
      {activeTab === 'audit' && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-6 border-b border-white/40 bg-white/50 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Security Audit Log</h2>
                <p className="text-sm text-slate-500 mt-1">Review exactly who has accessed your medical data.</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 bg-white/30">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-lg font-medium">No activity recorded.</p>
              </div>
            ) : logs.map(log => (
              <div key={log.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/60 transition-colors text-sm gap-4">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base mb-1">{log.action.replace(/_/g, ' ')}</h4>
                    <div className="text-slate-600 space-y-1">
                      <p><strong className="text-slate-800 mr-1">Actor:</strong> {log.doctor_name || 'System'}</p>
                      {log.resource && <p><strong className="text-slate-800 mr-1">Resource:</strong> {log.resource}</p>}
                      {log.purpose && <p><strong className="text-slate-800 mr-1">Purpose:</strong> {log.purpose}</p>}
                      {log.metadata && log.metadata.reason && <p className="text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-100 font-medium"><strong>Reason:</strong> {log.metadata.reason}</p>}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right flex sm:flex-col items-center sm:items-end text-slate-500 font-medium whitespace-nowrap bg-slate-50 sm:bg-transparent px-4 py-2 sm:p-0 rounded-lg">
                  <span className="mr-2 sm:mr-0">{new Date(log.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Content - AI Assistant */}
      {activeTab === 'ai' && (
        <div className="glass-card overflow-hidden bg-white/80 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-purple-100/40 bg-gradient-to-r from-purple-50 to-white flex items-center shadow-sm">
            <div className="p-2 bg-purple-100 rounded-full mr-3">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Health AI Assistant</h2>
              <p className="text-sm text-slate-500 font-medium">Ask me anything about your health records, conditions, or medications.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={chatLoading}
              onClick={() => {
                setChatInput('Please analyze all my health records and provide suggestions.');
              }}
              className="text-xs bg-white hover:bg-purple-50 text-purple-700 font-semibold px-3 py-1.5 rounded-lg border border-purple-200 transition-colors shadow-xs"
            >
              📊 Analyze My Health Records
            </button>
            <button
              type="button"
              disabled={chatLoading}
              onClick={() => {
                setChatInput('Review my active medications and give safety suggestions.');
              }}
              className="text-xs bg-white hover:bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors shadow-xs"
            >
              💊 Review My Medications
            </button>
            <button
              type="button"
              disabled={chatLoading}
              onClick={() => {
                setChatInput('Give me clinical dietary and lifestyle suggestions based on my diagnosis.');
              }}
              className="text-xs bg-white hover:bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-xs"
            >
              🥗 Personalized Diet Suggestions
            </button>
            <button
              type="button"
              disabled={chatLoading}
              onClick={() => {
                setChatInput('How are my blood pressure and latest lab values looking?');
              }}
              className="text-xs bg-white hover:bg-rose-50 text-rose-700 font-semibold px-3 py-1.5 rounded-lg border border-rose-200 transition-colors shadow-xs"
            >
              ❤️ Blood Pressure & Labs
            </button>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask to analyze your records, medication suggestions, or diet..." 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm font-medium"
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px] shadow-sm hover:shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
