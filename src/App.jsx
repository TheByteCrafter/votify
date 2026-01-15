import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Admin from './Pages/Admin';
import UserPortal from './Pages/UserPortal';
import RegisterVoter from './Pages/VoterSignUp';
import AspirantRegistration from './Pages/AspirantRegistration';

function App() {
  return (
    <Router>
      <Routes>
        {/* The "Front Door" */}
        <Route path="/" element={<LandingPage />} />

        {/* The Two Portals */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/user" element={<UserPortal />} />
        <Route path="/voter" element={<RegisterVoter />} />
        <Route path="/aspirant-registration" element={<AspirantRegistration />} />
      </Routes>
    </Router>
  );
}

export default App;