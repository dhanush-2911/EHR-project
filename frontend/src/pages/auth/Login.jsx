import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Stethoscope, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null); // 'doctor' or 'patient'
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // 1. Get Token
      const tokenRes = await axios.post('http://localhost:8000/api/token/', {
        username,
        password
      });
      
      const { access, refresh } = tokenRes.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // 2. Get User Profile
      const userRes = await axios.get('http://localhost:8000/api/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      
      const userData = userRes.data;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // 3. Verify Role and Redirect
      if (userData.role !== selectedRole) {
        setError(`You are not registered as a ${selectedRole}. Please use the correct portal.`);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }
      
      if (selectedRole === 'doctor') {
        navigate('/doctor/patients');
      } else {
        navigate('/patient');
      }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-5xl p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-xl shadow-primary-500/10 mb-6">
            <Activity className="h-10 w-10 text-primary-600" />
            <span className="ml-3 text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">MediLink</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">
            Next-Generation Healthcare
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Secure, interoperable electronic health records powered by intelligent insights. Select your portal to continue.
          </p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl animate-fade-in">
            {/* Doctor Card */}
            <div 
              onClick={() => { setSelectedRole('doctor'); setError(''); }}
              className="group glass-card p-10 rounded-3xl cursor-pointer hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2 transition-all duration-300 border-2 border-transparent hover:border-primary-200 flex flex-col items-center text-center bg-white/60"
            >
              <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-500 transition-colors">
                <Stethoscope className="h-10 w-10 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Doctor Portal</h2>
              <p className="text-slate-500 mb-8">Access patient records, clinical insights, and manage treatment plans securely.</p>
              <span className="mt-auto flex items-center text-primary-600 font-bold group-hover:translate-x-2 transition-transform">
                Sign In as Doctor <ArrowRight className="ml-2 h-5 w-5" />
              </span>
            </div>

            {/* Patient Card */}
            <div 
              onClick={() => { setSelectedRole('patient'); setError(''); }}
              className="group glass-card p-10 rounded-3xl cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 border-2 border-transparent hover:border-blue-200 flex flex-col items-center text-center bg-white/60"
            >
              <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <User className="h-10 w-10 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Patient Portal</h2>
              <p className="text-slate-500 mb-8">View your medical history, manage access consents, and track your health journey.</p>
              <span className="mt-auto flex items-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                Sign In as Patient <ArrowRight className="ml-2 h-5 w-5" />
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-card p-10 rounded-3xl w-full max-w-md animate-fade-in relative bg-white/80">
            <button 
              onClick={() => setSelectedRole(null)}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Back
            </button>
            <div className="text-center mb-8 mt-4">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${selectedRole === 'doctor' ? 'bg-primary-100 text-primary-600' : 'bg-blue-100 text-blue-600'}`}>
                {selectedRole === 'doctor' ? <Stethoscope className="h-8 w-8" /> : <User className="h-8 w-8" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRole === 'doctor' ? 'Doctor Login' : 'Patient Login'}
              </h2>
              <p className="text-slate-500 text-sm mt-2 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> Secure encrypted connection
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Username / ID</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-slate-200 rounded-xl shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white/80 py-3 px-4 border-2 outline-none transition-all" 
                  placeholder={selectedRole === 'doctor' ? "e.g., drsmith" : "e.g., janesmith"}
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-slate-200 rounded-xl shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white/80 py-3 px-4 border-2 outline-none transition-all" 
                  placeholder="••••••••"
                  required 
                />
              </div>

              <button type="submit" disabled={isLoading} className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${
                isLoading ? 'opacity-70 cursor-wait' : ''
              } ${
                selectedRole === 'doctor' 
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
              }`}>
                {isLoading ? 'Authenticating...' : 'Sign In Securely'}
              </button>
            </form>
            
            <div className="mt-6 text-center text-xs text-slate-500">
              <p>Demo Doctor: drsmith / password123</p>
              <p>Demo Patient: janesmith / password123</p>
            </div>
            
            <div className="mt-4 text-center text-sm">
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Don't have an account? Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
