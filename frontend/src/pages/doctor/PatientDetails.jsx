import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, FileText, Activity, AlertTriangle, Pill, ShieldAlert, CheckCircle, User, Sparkles, Stethoscope, Send, AlertOctagon, CheckSquare, Copy, Check, Clock, Info } from 'lucide-react';
import api from '../../api';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState({ encounters: [], conditions: [], observations: [], prescriptions: [], allergies: [], timeline: [] });
  const [timelineFilter, setTimelineFilter] = useState('ALL');
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // AI Diagnostic Assistant State
  const [diagPrompt, setDiagPrompt] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [diagError, setDiagError] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  
  const [requestModal, setRequestModal] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [scopes, setScopes] = useState({ full: true, encounters: false, conditions: false, prescriptions: false, labs: false });
  const [purpose, setPurpose] = useState('Clinical consultation');
  const [isBreakGlass, setIsBreakGlass] = useState(false);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const ptRes = await api.get(`patients/${id}/`);
        setPatient(ptRes.data);

        if (ptRes.data.access_state !== 'APPROVED') {
            setError(`Patient Access Required (State: ${ptRes.data.access_state}). Request access to view records.`);
            setLoading(false);
            return;
        }

        // Fetch records
        const [encRes, condRes, obsRes, rxRes, allRes, insightsRes, timelineRes] = await Promise.all([
          api.get(`patients/${id}/encounters/`),
          api.get(`patients/${id}/conditions/`),
          api.get(`patients/${id}/observations/`),
          api.get(`patients/${id}/prescriptions/`),
          api.get(`patients/${id}/allergies/`),
          api.get(`patients/${id}/insights/`).catch(e => ({ data: { insights: [] } })),
          api.get(`patients/${id}/timeline/`).catch(e => ({ data: [] })),
        ]);

        setRecords({
          encounters: encRes.data,
          conditions: condRes.data,
          observations: obsRes.data,
          prescriptions: rxRes.data,
          allergies: allRes.data,
          timeline: timelineRes.data
        });
        setInsights(insightsRes.data.insights || []);
      } catch (err) {
        setError("An error occurred loading patient data.");
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading patient data...</div>;

  const submitRequest = async () => {
    try {
      const activeScopes = scopes.full ? ['full'] : Object.keys(scopes).filter(k => scopes[k]);
      
      const userStr = localStorage.getItem('user');
      const doctorId = userStr ? JSON.parse(userStr).doctor_id : null;
      
      await api.post('consents/request/', {
        patient_id: id,
        doctor_id: doctorId,
        scope: activeScopes,
        purpose,
        is_break_glass: isBreakGlass,
        justification
      });
      setRequestModal(false);
      if (isBreakGlass) {
        alert('Emergency access granted! Event logged.');
        window.location.reload();
      } else {
        setRequestSuccess(true);
      }
    } catch (err) {
      alert('Failed to request access.');
    }
  };

  const handleDemoPatientLogin = async () => {
    try {
      const res = await api.post(`demo-login-patient/${id}/`);
      localStorage.setItem('accessToken', res.data.access);
      localStorage.setItem('refreshToken', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/patient');
    } catch (err) {
      alert('Failed to demo login as patient.');
    }
  };

  const handleRunDiagnosis = async (promptOverride) => {
    const promptToSend = typeof promptOverride === 'string' ? promptOverride : diagPrompt;
    if (!promptToSend.trim() || diagLoading) return;
    
    if (typeof promptOverride === 'string') {
      setDiagPrompt(promptOverride);
    }
    
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await api.post(`patients/${id}/doctor-diagnosis/`, {
        prompt: promptToSend.trim()
      });
      setDiagResult(res.data);
    } catch (err) {
      console.error(err);
      setDiagError(err.response?.data?.error || "Failed to generate AI diagnostic analysis. Please verify AI Engine is active.");
    } finally {
      setDiagLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!diagResult) return;
    const diffs = (diagResult.differential_diagnoses || []).map(d => `- ${d.name} (${d.probability}): ${d.rationale}`).join('\n');
    const tests = (diagResult.recommended_orders || []).map(t => `- [ ] ${t.test} (${t.urgency}): ${t.reason}`).join('\n');
    const text = `AI CLINICAL DECISION SUPPORT SUMMARY\nPatient: ${patient.first_name} ${patient.last_name} (ID: ${patient.source_id})\nClinical Presentation: ${diagResult.query_prompt}\n\nDIFFERENTIAL DIAGNOSES:\n${diffs}\n\nRECOMMENDED ORDERS:\n${tests}\n\n${diagResult.clinical_disclaimer}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const requestAccessModal = requestModal ? (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className={`p-6 ${isBreakGlass ? 'bg-red-50 border-b border-red-100' : 'bg-slate-50 border-b border-slate-100'}`}>
          <h3 className={`text-xl font-bold ${isBreakGlass ? 'text-red-700' : 'text-slate-800'}`}>
            {isBreakGlass ? 'Emergency Break-Glass Access' : 'Request Patient Access'}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {isBreakGlass ? 'This action will be strictly audited and immediately logged.' : 'Select the scopes you need and provide a clinical purpose.'}
          </p>
        </div>
        
        <div className="p-6 space-y-5">
          {isBreakGlass ? (
            <div>
              <label className="block text-sm font-bold mb-2 text-red-700">Mandatory Justification</label>
              <textarea 
                className="w-full border-red-300 rounded-lg p-3 focus:ring-red-500 focus:border-red-500 text-sm" 
                placeholder="e.g., Patient is unconscious in the ER..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={3}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Clinical Purpose</label>
                <input 
                  type="text" 
                  className="w-full border-slate-200 rounded-lg p-3 text-sm focus:border-primary-500 focus:ring-primary-500" 
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Requested Scope</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center text-sm p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded" checked={scopes.full} onChange={e => setScopes({...scopes, full: e.target.checked})} /> 
                    <span className="font-medium">Full Record</span>
                  </label>
                  {!scopes.full && (
                    <>
                      <label className="flex items-center text-sm p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded" checked={scopes.encounters} onChange={e => setScopes({...scopes, encounters: e.target.checked})} /> 
                        History
                      </label>
                      <label className="flex items-center text-sm p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded" checked={scopes.conditions} onChange={e => setScopes({...scopes, conditions: e.target.checked})} /> 
                        Diagnoses
                      </label>
                      <label className="flex items-center text-sm p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded" checked={scopes.prescriptions} onChange={e => setScopes({...scopes, prescriptions: e.target.checked})} /> 
                        Rx
                      </label>
                      <label className="flex items-center text-sm p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded" checked={scopes.labs} onChange={e => setScopes({...scopes, labs: e.target.checked})} /> 
                        Labs
                      </label>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          
          <div className="flex space-x-3 pt-4 border-t border-slate-100">
            <button onClick={() => {setRequestModal(false); setIsBreakGlass(false);}} className="btn-secondary flex-1 py-3">Cancel</button>
            <button onClick={submitRequest} className={`${isBreakGlass ? "btn-danger" : "btn-primary"} flex-1 py-3 font-bold`}>
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const requestSuccessModal = requestSuccess ? (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up text-center p-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Request Sent</h3>
        <p className="text-slate-500 mb-8">
          The patient has been notified of your access request. They must approve it before you can view their records.
        </p>
        
        <div className="space-y-3">
          <button onClick={handleDemoPatientLogin} className="w-full btn-primary py-3 flex justify-center items-center font-bold">
            <User className="h-5 w-5 mr-2" />
            Switch to Patient Portal (Demo)
          </button>
          <button onClick={() => { setRequestSuccess(false); window.location.reload(); }} className="w-full btn-secondary py-3">
            Wait for Approval
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (error) {
    return (
      <div className="p-10 max-w-2xl mx-auto mt-20 text-center bg-white rounded-3xl border border-slate-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-slate-800 mb-3">Access Restricted</h2>
        <p className="text-slate-500 mb-8 text-lg">{error}</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => { setIsBreakGlass(false); setRequestModal(true); }} className="btn-primary py-3 px-6 text-lg shadow-lg shadow-primary-500/30">
            Request Standard Access
          </button>
          <button onClick={() => { setIsBreakGlass(true); setRequestModal(true); }} className="text-red-600 font-bold bg-white hover:bg-red-50 py-3 px-6 rounded-xl border-2 border-red-200 transition-colors">
            EMERGENCY OVERRIDE
          </button>
        </div>
        
        {requestAccessModal}
        {requestSuccessModal}
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'ai-diagnostics', name: 'AI Diagnostic Assistant', icon: Sparkles },
    { id: 'timeline', name: 'Timeline', icon: Calendar },
    { id: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { id: 'labs', name: 'Lab Reports', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/doctor/patients" className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-primary-600 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.first_name} {patient.last_name}</h1>
            <p className="text-slate-500">
              ID: {patient.source_id} • DOB: {patient.dob} • Gender: {patient.gender}
            </p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => { setIsBreakGlass(false); setRequestModal(true); }}
            className="btn-primary flex items-center shadow-md shadow-primary-500/20 py-2 px-4 text-sm"
          >
            <ShieldAlert className="h-4 w-4 mr-2" /> Request More Access
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card p-6 min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              
              {/* Conditions */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary-500"/> Diagnosed Conditions
                </h3>
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
                              <h4 className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">Active Medical Disorders</h4>
                              <ul className="space-y-2">
                                {activeDisorders.map(c => (
                                  <li key={c.id} className="p-3 bg-white/80 rounded-lg border border-red-100 flex justify-between border-l-4 border-l-red-500">
                                    <span className="font-medium text-slate-800">{c.description.replace(' (disorder)', '')}</span>
                                    <span className="text-xs text-slate-500">Onset: {c.onset_date}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {resolvedDisorders.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 mt-4">Resolved / Past Conditions</h4>
                              <ul className="space-y-2">
                                {resolvedDisorders.map(c => (
                                  <li key={c.id} className="p-3 bg-white/80 rounded-lg border border-slate-200 flex justify-between border-l-4 border-l-green-500">
                                    <span className="font-medium text-slate-700">{c.description.replace(' (disorder)', '')}</span>
                                    <span className="text-xs text-slate-500">Resolved: {c.resolved_date}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {findings.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 mt-4">Social & Environmental Findings</h4>
                              <ul className="space-y-2">
                                {findings.map(c => (
                                  <li key={c.id} className="p-3 bg-white/80 rounded-lg border border-slate-100 flex justify-between border-l-4 border-l-slate-400">
                                    <span className="font-medium text-slate-600">{c.description.replace(' (finding)', '')}</span>
                                    <span className="text-xs text-slate-500">Recorded: {c.onset_date}</span>
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

              {/* Encounters */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary-500"/> Recent Encounters
                </h3>
                {records.encounters.length === 0 ? <p className="text-slate-500 text-sm">No encounters found.</p> : (
                  <ul className="space-y-3">
                    {records.encounters.map(e => (
                      <li key={e.id} className="p-3 bg-white/50 rounded-lg border border-slate-100 flex flex-col">
                        <span className="font-bold text-slate-700">{e.encounter_type}</span>
                        <span className="text-sm text-slate-500">{new Date(e.start_date).toLocaleString()} • {e.reason || 'No reason specified'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
            
            <div className="space-y-6">
              {/* Allergies Box */}
              <div className="p-5 bg-red-50 rounded-xl border border-red-100">
                <h3 className="text-red-800 font-bold mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Allergies
                </h3>
                {records.allergies.length === 0 ? <p className="text-red-600/70 text-sm">No known allergies.</p> : (
                  <ul className="space-y-2">
                    {records.allergies.map(a => (
                      <li key={a.id} className="text-sm text-red-700 font-medium flex items-start">
                        <span className="mr-2">•</span> {a.allergen} ({a.reaction || 'Unknown reaction'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* AI Notice */}
              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 text-sm">
                <div className="flex items-center text-primary-800 font-bold mb-3">
                  <ShieldAlert className="h-5 w-5 mr-2"/>
                  AI Clinical Insights
                </div>
                {insights.length === 0 ? (
                  <p className="text-primary-700/80 text-xs italic">Analyzing patient profile...</p>
                ) : (
                  <ul className="space-y-3">
                    {insights.map((insight, idx) => (
                      <li key={idx} className={`p-3 rounded-lg border text-xs shadow-sm bg-white ${
                        insight.type === 'ALERT' ? 'border-red-200' : 
                        insight.type === 'WARNING' ? 'border-orange-200' : 'border-slate-200'
                      }`}>
                        <span className={`font-bold block mb-1 ${
                          insight.type === 'ALERT' ? 'text-red-700' : 
                          insight.type === 'WARNING' ? 'text-orange-700' : 'text-primary-700'
                        }`}>{insight.category}</span>
                        <span className="text-slate-700">{insight.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 pt-3 border-t border-primary-200/50 text-[10px] text-primary-600/70">
                  AI Decision Support Only — Not a Definitive Diagnosis
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Medication History</h3>
            {records.prescriptions.length === 0 ? <p className="text-slate-500 text-sm">No prescriptions found.</p> : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Medication</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Stop Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.prescriptions.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{r.medication_name}</td>
                        <td className="px-4 py-3">{r.start_date ? new Date(r.start_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">{r.end_date ? new Date(r.end_date).toLocaleDateString() : 'Active'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'labs' && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Laboratory Observations</h3>
            {records.observations.length === 0 ? <p className="text-slate-500 text-sm">No observations found.</p> : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Test</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.observations.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(o.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-800">{o.test_name}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {o.value} <span className="text-slate-400 text-xs">{o.units}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Patient Timeline</h3>
                <div className="flex space-x-2">
                    {['ALL', 'ENCOUNTER', 'CONDITION', 'PRESCRIPTION', 'LAB', 'PROCEDURE', 'ALLERGY'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTimelineFilter(t)}
                            className={`px-3 py-1 text-xs font-bold rounded-full ${timelineFilter === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
            {records.timeline.filter(e => timelineFilter === 'ALL' || e.type === timelineFilter).length === 0 ? <p className="text-slate-500 text-sm">No timeline events found.</p> : (
              <div className="relative pl-6 border-l-2 border-primary-200 space-y-6">
                {records.timeline.filter(e => timelineFilter === 'ALL' || e.type === timelineFilter).map((event, idx) => (
                  <div key={`${event.id}-${idx}`} className="relative">
                    <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                      event.type === 'ENCOUNTER' ? 'bg-primary-500' :
                      event.type === 'CONDITION' ? 'bg-red-500' :
                      event.type === 'PRESCRIPTION' ? 'bg-green-500' :
                      event.type === 'LAB' ? 'bg-purple-500' : 'bg-slate-500'
                    }`}></div>
                    <div>
                      <span className="text-xs font-bold text-primary-600 mb-1 block">
                        {new Date(event.date).toLocaleDateString()}
                        {event.type === 'LAB' && ' • Lab Report'}
                        {event.type === 'PRESCRIPTION' && ' • Rx'}
                        {event.type === 'CONDITION' && ' • Diagnosis'}
                        {event.type === 'ENCOUNTER' && ' • Encounter'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{event.title}</h4>
                      <p className="text-sm text-slate-500">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-diagnostics' && (
          <div className="space-y-6">
            {/* Header / Intro Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-indigo-100/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-tr from-indigo-600 to-primary-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      AI Clinical Diagnostic Assistant
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200/50">
                        EHR-Correlated
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Analyzes current symptoms alongside {patient.first_name}'s past medical history, active medications, and vitals.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-medium self-start sm:self-auto">
                  <Stethoscope className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Clinical Decision Support Only
                </div>
              </div>

              {/* Patient EHR Snapshot Pills */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-indigo-100/60 text-xs">
                <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-medium">
                  <strong>Age/Sex:</strong> {patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()}y` : 'Adult'} • {patient.gender || 'Unknown'}
                </span>
                <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-medium">
                  <strong>Past Conditions:</strong> {records.conditions.length} recorded
                </span>
                <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-medium">
                  <strong>Active Rx:</strong> {records.prescriptions.length} medications
                </span>
                <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-medium">
                  <strong>Known Allergies:</strong> {records.allergies.length > 0 ? records.allergies.map(a => a.allergen).join(', ') : 'No known drug allergies'}
                </span>
              </div>
            </div>

            {/* Prompt Input Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Enter Current Symptoms & Clinical Findings</span>
                  <span className="text-xs font-normal text-slate-400">Type freeform or pick a quick template below</span>
                </label>
                
                {/* Quick Symptoms Chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "Acute retrosternal chest pain radiating to left arm with cold diaphoresis and dyspnea",
                    "High fever, productive yellow-green cough, and right-sided pleuritic chest pain",
                    "Exertional dyspnea, orthopnea, bilateral ankle swelling, and fatigue",
                    "Excessive thirst, frequent urination, fatigue, and blurry vision",
                    "Severe headache, blurred vision, dizziness, and elevated blood pressure",
                    "Dysuria, urinary urgency, frequency, and right flank tenderness"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunDiagnosis(chip)}
                      className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-600 transition-colors text-left"
                    >
                      {chip.length > 45 ? `${chip.slice(0, 45)}...` : chip}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={diagPrompt}
                    onChange={(e) => setDiagPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleRunDiagnosis();
                      }
                    }}
                    placeholder="E.g. Patient presents today with sudden onset retrosternal chest tightness radiating to the jaw, accompanied by shortness of breath and sweating..."
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-slate-400 resize-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px] mx-1">Ctrl+Enter</kbd> to analyze
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {diagPrompt && (
                    <button
                      type="button"
                      onClick={() => setDiagPrompt('')}
                      className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRunDiagnosis()}
                    disabled={!diagPrompt.trim() || diagLoading}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center transition-all shadow-md ${
                      !diagPrompt.trim() || diagLoading
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 shadow-indigo-500/25 active:scale-[0.98]'
                    }`}
                  >
                    {diagLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Correlating Clinical Data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze & Diagnose
                      </>
                    )}
                  </button>
                </div>
              </div>

              {diagError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center">
                  <AlertOctagon className="w-4 h-4 mr-2 flex-shrink-0 text-red-500" />
                  {diagError}
                </div>
              )}
            </div>

            {/* Diagnostic Results Section */}
            {diagResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Actions & Query recap */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Analyzed Presentation:</span> "{diagResult.query_prompt}"
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                        <span className="text-green-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Copy Summary for Clinical Note
                      </>
                    )}
                  </button>
                </div>

                {/* Red Flags / Emergency Alert Banner */}
                {diagResult.red_flags && diagResult.red_flags.length > 0 && (
                  <div className="p-4 bg-red-50/90 border-2 border-red-300 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
                      <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
                      <span>URGENT CLINICAL RED FLAG DETECTED</span>
                    </div>
                    <div className="space-y-1.5 pl-7">
                      {diagResult.red_flags.map((rf, idx) => (
                        <div key={idx} className="text-xs text-red-700">
                          <strong>{rf.condition}:</strong> {rf.alert}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Differential Diagnoses Grid */}
                <div>
                  <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    Differential Diagnoses & Likelihood
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {diagResult.differential_diagnoses.map((diag, idx) => {
                      const isHigh = diag.probability.includes('High');
                      const isMod = diag.probability.includes('Moderate');
                      return (
                        <div
                          key={diag.id || idx}
                          className={`p-5 rounded-2xl border transition-all duration-200 bg-white ${
                            isHigh
                              ? 'border-red-200 shadow-sm hover:border-red-300 hover:shadow-md'
                              : isMod
                              ? 'border-amber-200 shadow-sm hover:border-amber-300 hover:shadow-md'
                              : 'border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                {diag.category}
                              </span>
                              <h5 className="text-base font-bold text-slate-800 mt-0.5">{diag.name}</h5>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${
                                isHigh
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : isMod
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {diag.probability}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-3 mt-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                            {diag.rationale}
                          </p>

                          {/* Symptom & History Badges */}
                          <div className="space-y-1.5 text-xs">
                            {diag.matched_symptoms && diag.matched_symptoms.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-slate-400 font-medium text-[11px]">Presenting:</span>
                                {diag.matched_symptoms.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100/60">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {diag.matched_history && diag.matched_history.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-slate-400 font-medium text-[11px]">EHR History:</span>
                                {diag.matched_history.map((h, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-medium border border-purple-100/60">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            )}

                            {diag.vital_correlations && diag.vital_correlations.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-slate-400 font-medium text-[11px]">Vitals:</span>
                                {diag.vital_correlations.map((v, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-medium border border-emerald-100/60">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommended Diagnostic Orders */}
                {diagResult.recommended_orders && diagResult.recommended_orders.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                      Recommended Confirmatory Diagnostic Orders & Labs
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Suggested tests prioritized to confirm primary differential diagnoses or safely rule out acute complications.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {diagResult.recommended_orders.map((order, idx) => {
                        const isStat = order.urgency.toLowerCase().includes('stat') || order.urgency.toLowerCase().includes('immediate');
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-slate-800 block">{order.test}</span>
                              <span className="text-[11px] text-slate-500 block leading-tight">{order.reason}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                isStat
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              {order.urgency}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Clinical Disclaimer */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{diagResult.clinical_disclaimer}</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      {requestAccessModal}
    </div>
  );
}
