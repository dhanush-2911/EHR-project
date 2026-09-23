import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import PatientDetails from './pages/doctor/PatientDetails';
import Consents from './pages/doctor/Consents';
import AIInsights from './pages/doctor/AIInsights';
import PatientPortal from './pages/patient/PatientPortal';

import Register from './pages/auth/Register';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        {/* Doctor Routes */}
        <Route path="/doctor" element={<MainLayout role="doctor" />}>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="patients/:id" element={<PatientDetails />} />
          <Route path="consents" element={<Consents />} />
          <Route path="insights" element={<AIInsights />} />
        </Route>

        {/* Patient Routes */}
        <Route path="/patient" element={<MainLayout role="patient" />}>
          <Route index element={<PatientPortal />} />
        </Route>

        {/* Redirect root to login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
