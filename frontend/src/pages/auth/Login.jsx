import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Activity, 
  Stethoscope, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  HeartPulse, 
  FileText,
  ShieldAlert
} from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState('doctor'); // 'doctor' or 'patient'
  
  // Doctor form state
  const [docUsername, setDocUsername] = useState('drsmith');
  const [docPassword, setDocPassword] = useState('password123');
  
  // Patient form state
  const [patUsername, setPatUsername] = useState('janesmith');
  const [patPassword, setPatPassword] = useState('password123');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e, role) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const usernameToUse = role === 'doctor' ? docUsername : patUsername;
    const passwordToUse = role === 'doctor' ? docPassword : patPassword;

    try {
      // 1. Get JWT Token Pair
      const tokenRes = await axios.post('http://localhost:8000/api/token/', {
        username: usernameToUse.trim(),
        password: passwordToUse
      });
      
      const { access, refresh } = tokenRes.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // 2. Fetch User Profile
      const userRes = await axios.get('http://localhost:8000/api/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      
      const userData = userRes.data;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // 3. Verify Role and Route
      if (userData.role !== role) {
        setError(`This account is registered as a ${userData.role}. Please switch to the ${userData.role} portal above.`);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }
      
      if (role === 'doctor') {
        navigate('/doctor/patients');
      } else {
        navigate('/patient');
      }
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSwitch = (newRole) => {
    setError('');
    setActiveRole(newRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-10 px-4">
      {/* Dynamic Ambient Background Blobs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-40 transition-colors duration-700 animate-blob ${
        activeRole === 'doctor' ? 'bg-teal-300' : 'bg-blue-300'
      }`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-40 transition-colors duration-700 animate-blob animation-delay-2000 ${
        activeRole === 'doctor' ? 'bg-cyan-200' : 'bg-indigo-300'
      }`}></div>
      <div className="absolute bottom-[-15%] left-[25%] w-[500px] h-[500px] bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-primary-500/10 mb-4 border border-white">
            <div className="p-2 bg-gradient-to-tr from-primary-600 to-teal-500 rounded-xl text-white">
              <Activity className="h-7 w-7" />
            </div>
            <span className="ml-3 text-2xl font-black bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 bg-clip-text text-transparent">
              MediLink EHR
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Integrated Health & Clinical Portal
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto mt-2">
            Secure, interoperable electronic health records powered by clinical decision support.
          </p>
        </div>

        {/* Main Merged Card Container with Split Panels */}
        <div className="glass-card bg-white/85 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Side: Sliding Login Controller (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Animated Sliding Role Toggle Switcher */}
              <div className="mb-6">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Access Portal</div>
                <div className="relative bg-slate-100/90 p-1.5 rounded-2xl flex border border-slate-200/80 shadow-inner">
                  {/* Sliding Pill Indicator */}
                  <div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-md ${
                      activeRole === 'doctor'
                        ? 'left-1.5 bg-gradient-to-r from-teal-600 to-primary-600 text-white'
                        : 'left-[calc(50%+3px)] bg-gradient-to-r from-primary-600 to-indigo-600 text-white'
                    }`}
                  />
                  
                  {/* Doctor Tab Button */}
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('doctor')}
                    className={`relative z-10 w-1/2 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors duration-300 ${
                      activeRole === 'doctor' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Doctor Portal
                  </button>
                  
                  {/* Patient Tab Button */}
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('patient')}
                    className={`relative z-10 w-1/2 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors duration-300 ${
                      activeRole === 'patient' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Patient Portal
                  </button>
                </div>
              </div>

              {/* Error Alert Box */}
              {error && (
                <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-center text-red-700 text-xs sm:text-sm animate-fade-in shadow-sm">
                  <AlertCircle className="h-5 w-5 mr-2.5 flex-shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Slide Carousel Container (w-[200%] that translates horizontally) */}
              <div className="overflow-hidden w-full relative">
                <div 
                  className="flex w-[200%] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                  style={{
                    transform: activeRole === 'doctor' ? 'translateX(0%)' : 'translateX(-50%)'
                  }}
                >
                  
                  {/* ================= SLIDE 1: DOCTOR LOGIN ================= */}
                  <div className="w-1/2 pr-3 sm:pr-4">
                    <div className="mb-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        Clinical & Decision Support Access
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">Healthcare Provider Login</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Review patient charts, analyze differentials, and manage clinical consultations.
                      </p>
                    </div>

                    <form onSubmit={(e) => handleLogin(e, 'doctor')} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Doctor Username
                        </label>
                        <div className="relative">
                          <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            value={docUsername}
                            onChange={(e) => setDocUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm outline-none transition-all shadow-sm"
                            placeholder="e.g. drsmith"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                          <span>Password</span>
                          <span className="text-[11px] text-slate-400 font-normal">Demo: password123</span>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            value={docPassword}
                            onChange={(e) => setDocPassword(e.target.value)}
                            className="w-full pl-10 pr-11 py-3 bg-white/90 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm outline-none transition-all shadow-sm"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Quick Pre-fill Pill for testing */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => { setDocUsername('drsmith'); setDocPassword('password123'); }}
                          className="text-teal-700 hover:text-teal-800 font-medium hover:underline flex items-center gap-1"
                        >
                          ⚡ Auto-fill Doctor Demo Credentials
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${
                          isLoading
                            ? 'bg-slate-400 cursor-wait shadow-none'
                            : 'bg-gradient-to-r from-teal-600 via-primary-600 to-primary-700 hover:from-teal-700 hover:to-primary-800 shadow-teal-600/30'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Verifying Provider Token...
                          </>
                        ) : (
                          <>
                            Sign In to Doctor Portal <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* ================= SLIDE 2: PATIENT LOGIN ================= */}
                  <div className="w-1/2 pl-3 sm:pl-4">
                    <div className="mb-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-800 mb-2">
                        <HeartPulse className="w-3.5 h-3.5 text-indigo-600" />
                        Patient Health & Records Access
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">Patient Member Login</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Track longitudinal vitals, manage doctor consents, and chat with AI Health Assistant.
                      </p>
                    </div>

                    <form onSubmit={(e) => handleLogin(e, 'patient')} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Patient Username
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            value={patUsername}
                            onChange={(e) => setPatUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition-all shadow-sm"
                            placeholder="e.g. janesmith"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                          <span>Password</span>
                          <span className="text-[11px] text-slate-400 font-normal">Demo: password123</span>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            value={patPassword}
                            onChange={(e) => setPatPassword(e.target.value)}
                            className="w-full pl-10 pr-11 py-3 bg-white/90 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition-all shadow-sm"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Quick Pre-fill Pill for testing */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => { setPatUsername('janesmith'); setPatPassword('password123'); }}
                          className="text-indigo-700 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1"
                        >
                          ⚡ Auto-fill Jane Smith Demo Credentials
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${
                          isLoading
                            ? 'bg-slate-400 cursor-wait shadow-none'
                            : 'bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 hover:from-primary-700 hover:to-indigo-800 shadow-indigo-600/30'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Verifying Patient Token...
                          </>
                        ) : (
                          <>
                            Sign In to Patient Portal <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>HIPAA & FHIR R4 Compliant 256-bit Encryption</span>
              </div>
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
                New user? Create Account
              </Link>
            </div>
          </div>

          {/* Right Side: Animated Showcase Banner (5 Cols) */}
          <div className={`hidden lg:flex lg:col-span-5 p-8 flex-col justify-between text-white relative transition-all duration-700 ${
            activeRole === 'doctor'
              ? 'bg-gradient-to-br from-teal-700 via-primary-700 to-slate-900'
              : 'bg-gradient-to-br from-primary-700 via-indigo-700 to-slate-900'
          }`}>
            {/* Background graphic elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-2xl transform -translate-x-12 translate-y-12"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white/90 border border-white/20 mb-6">
                {activeRole === 'doctor' ? 'Clinical Intelligence Suite' : 'Patient Centric Care'}
              </div>

              <h3 className="text-2xl font-black leading-tight mb-3">
                {activeRole === 'doctor' 
                  ? 'AI-Assisted Diagnostic & Clinical Decision Support' 
                  : 'Your Personal Health Records, Always Within Reach'}
              </h3>

              <p className="text-white/80 text-xs leading-relaxed mb-6">
                {activeRole === 'doctor'
                  ? 'Input patient presentation and correlate against longitudinal history, active prescriptions, and lab vitals with differential diagnostics.'
                  : 'View historical vitals, manage doctor access consents, and interact with the AI Health Assistant securely.'}
              </p>

              {/* Dynamic Highlights List based on role */}
              <div className="space-y-3">
                {(activeRole === 'doctor' ? [
                  { title: 'AI Differential Diagnostics', desc: 'Predictive correlation for cardiovascular, pulmonary & renal cases' },
                  { title: 'Drug-Drug Interaction Guard', desc: 'Instant contraindication & allergy alert warnings' },
                  { title: 'Cross-Hospital Access', desc: 'Audit-logged consent approvals & emergency break-glass' }
                ] : [
                  { title: 'Full Longitudinal Record', desc: 'Continuous timeline of encounters, conditions, and labs' },
                  { title: 'Active Consent Control', desc: 'Approve, reject, or revoke doctor record permissions' },
                  { title: 'AI Health Companion', desc: 'Conversational assistant explaining lab reports and vitals' }
                ]).map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-white/70 leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Demo Card */}
            <div className="relative z-10 mt-6 p-4 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white/90">Test Credentials</span>
                <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-mono">Ready to test</span>
              </div>
              <div className="font-mono text-[11px] space-y-0.5 text-white/80">
                <div>Doctor: <span className="text-white font-bold">drsmith</span> / password123</div>
                <div>Patient: <span className="text-white font-bold">janesmith</span> / password123</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
