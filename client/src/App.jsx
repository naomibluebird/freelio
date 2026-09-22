import HowItWorks from './HowItWorks.jsx';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGate from './components/RoleGate.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BrowseProjects from './pages/BrowseProjects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import BrowseFreelancers from './pages/BrowseFreelancers.jsx';
import FreelancerDetail from './pages/FreelancerDetail.jsx';
import PostProject from './pages/PostProject.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

import DashboardLayout from './pages/dashboard/DashboardLayout.jsx';
import ClientOverview from './pages/dashboard/ClientOverview.jsx';
import ClientProjects from './pages/dashboard/ClientProjects.jsx';
import ProjectApplicants from './pages/dashboard/ProjectApplicants.jsx';
import ClientProfile from './pages/dashboard/ClientProfile.jsx';
import FreelancerOverview from './pages/dashboard/FreelancerOverview.jsx';
import FreelancerApplications from './pages/dashboard/FreelancerApplications.jsx';
import SavedProjects from './pages/dashboard/SavedProjects.jsx';
import FreelancerProfile from './pages/dashboard/FreelancerProfile.jsx';

// NOTE: Make sure your ProtectedRoute component is updated to handle the "role" prop
// as shown in the example below, so it redirects to `/login?role=client` instead of just `/login`.
// Example ProtectedRoute logic:
// const ProtectedRoute = ({ children, role }) => {
//   const { user } = useAuth();
//   if (!user) return <Navigate to={`/login?role=${role}`} replace />;
//   if (user.role !== role) return <Navigate to="/" replace />;
//   return children;
// };

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/projects" element={<RoleGate blockRole="client" redirectTo="/dashboard/client"><BrowseProjects /></RoleGate>} />
          <Route path="/projects/:id" element={<RoleGate blockRole="client" redirectTo="/dashboard/client"><ProjectDetail /></RoleGate>} />
          <Route path="/freelancers" element={<RoleGate blockRole="freelancer" redirectTo="/dashboard/freelancer"><BrowseFreelancers /></RoleGate>} />
          <Route path="/freelancers/:id" element={<RoleGate blockRole="freelancer" redirectTo="/dashboard/freelancer"><FreelancerDetail /></RoleGate>} />

          <Route path="/post-project" element={<ProtectedRoute role="client"><PostProject /></ProtectedRoute>} />
          <Route path="/post-project/:id/edit" element={<ProtectedRoute role="client"><PostProject /></ProtectedRoute>} />

          <Route path="/dashboard/client" element={<ProtectedRoute role="client"><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<ClientOverview />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="projects/:id/applicants" element={<ProjectApplicants />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>

          <Route path="/dashboard/freelancer" element={<ProtectedRoute role="freelancer"><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<FreelancerOverview />} />
            <Route path="applications" element={<FreelancerApplications />} />
            <Route path="saved" element={<SavedProjects />} />
            <Route path="profile" element={<FreelancerProfile />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}