import { Activity, ShieldAlert, FileSearch, Pill, Stethoscope } from 'lucide-react';

export default function AIInsights() {
  const insights = [
    {
      id: 1,
      type: 'Drug Interaction',
      patient: 'Jane Smith',
      severity: 'high',
      message: 'Severe interaction detected between Aspirin and Warfarin. High risk of bleeding.',
      timestamp: '10 mins ago',
      icon: ShieldAlert
    },
    {
      id: 2,
      type: 'Disease Prediction',
      patient: 'Michael Johnson',
      severity: 'medium',
      message: 'Based on recent vitals, there is a 65% probability of developing hypertension in the next 12 months.',
      timestamp: '2 hours ago',
      icon: Activity
    },
    {
      id: 3,
      type: 'Duplicate Lab Test',
      patient: 'Emily Davis',
      severity: 'low',
      message: 'Lipid panel was already performed 3 weeks ago at City Clinic.',
      timestamp: '1 day ago',
      icon: FileSearch
    },
    {
      id: 4,
      type: 'Drug Allergy',
      patient: 'Robert Wilson',
      severity: 'high',
      message: 'Patient has a known allergy to Penicillin. Amoxicillin prescription flagged.',
      timestamp: '1 day ago',
      icon: Pill
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Global AI Insights</h1>
        <p className="text-slate-500">System-wide clinical decision support alerts.</p>
        <div className="mt-2 inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100">
          <Stethoscope className="w-3 h-3 mr-1" />
          AI Decision Support Only — Not a Definitive Diagnosis
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {['All Alerts', 'High Severity', 'Medium Severity', 'Low Severity'].map((filter, i) => (
          <button key={i} className={`p-4 text-left rounded-xl border transition-all ${
            i === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
          }`}>
            <h4 className="font-semibold">{filter}</h4>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="glass-card p-5 flex items-start gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className={`p-3 rounded-full flex-shrink-0 ${
              insight.severity === 'high' ? 'bg-red-100 text-red-600' :
              insight.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <insight.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">{insight.type}</h3>
                <span className="text-xs text-slate-400">{insight.timestamp}</span>
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">Patient: {insight.patient}</p>
              <p className="text-sm text-slate-700 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">{insight.message}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary text-xs py-1.5 px-3">Review Case</button>
                <button className="btn-secondary text-xs py-1.5 px-3">Dismiss</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
