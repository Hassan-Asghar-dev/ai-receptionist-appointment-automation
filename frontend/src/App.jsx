import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Patients from "./pages/Patients";
import Dentists from "./pages/Dentists";
import Services from "./pages/Services";
import ClinicSchedule from "./pages/ClinicSchedule";
import Conversations from "./pages/Conversations";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login - no dashboard sidebar */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          }
        />

        {/* Appointments */}
        <Route
          path="/appointments"
          element={
            <DashboardLayout>
              <Appointments />
            </DashboardLayout>
          }
        />

        {/* Patients */}
        <Route
          path="/patients"
          element={
            <DashboardLayout>
              <Patients />
            </DashboardLayout>
          }
        />

        {/* Dentists */}
        <Route
          path="/dentists"
          element={
            <DashboardLayout>
              <Dentists />
            </DashboardLayout>
          }
        />

        {/* Services */}
        <Route
          path="/services"
          element={
            <DashboardLayout>
              <Services />
            </DashboardLayout>
          }
        />

        {/* Clinic Schedule */}
        <Route
          path="/schedule"
          element={
            <DashboardLayout>
              <ClinicSchedule />
            </DashboardLayout>
          }
        />

        {/* WhatsApp Conversations */}
        <Route
          path="/conversations"
          element={
            <DashboardLayout>
              <Conversations />
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;