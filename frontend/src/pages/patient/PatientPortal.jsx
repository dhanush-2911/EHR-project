import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Clock, Activity, FileText, AlertTriangle, User, Calendar, Pill, HeartPulse, FileHeart, Sparkles, Send, ScanLine } from 'lucide-react';
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
          
          <div className="p-4 border-t border-slate-200 bg-white">
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your blood pressure, medications, or diet..." 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]"
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
