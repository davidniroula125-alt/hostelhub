import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Protected from './components/Protected';
import Layout from './components/Layout';
import { LoadingPage } from './components/ui';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Students = lazy(() => import('./pages/Students.jsx'));
const StudentDetail = lazy(() => import('./pages/StudentDetail.jsx'));
const Rooms = lazy(() => import('./pages/Rooms.jsx'));
const Admissions = lazy(() => import('./pages/Admissions.jsx'));
const Attendance = lazy(() => import('./pages/Attendance.jsx'));
const Leaves = lazy(() => import('./pages/Leaves.jsx'));
const Visitors = lazy(() => import('./pages/Visitors.jsx'));
const Invoices = lazy(() => import('./pages/Invoices.jsx'));
const Payments = lazy(() => import('./pages/Payments.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Food = lazy(() => import('./pages/Food.jsx'));
const Utilities = lazy(() => import('./pages/Utilities.jsx'));
const Complaints = lazy(() => import('./pages/Complaints.jsx'));
const Maintenance = lazy(() => import('./pages/Maintenance.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Notices = lazy(() => import('./pages/Notices.jsx'));
const Staff = lazy(() => import('./pages/Staff.jsx'));
const Payroll = lazy(() => import('./pages/Payroll.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Audit = lazy(() => import('./pages/Audit.jsx'));
const Subscription = lazy(() => import('./pages/Subscription.jsx'));
const Portal = lazy(() => import('./pages/portal/Portal.jsx'));
const PortalInvoices = lazy(() => import('./pages/portal/PortalInvoices.jsx'));
const PortalLeaves = lazy(() => import('./pages/portal/PortalLeaves.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminHostels = lazy(() => import('./pages/admin/AdminHostels.jsx'));
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans.jsx'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions.jsx'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments.jsx'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));

const HomeRedirect = () => {
  const { user, isSuperAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isSuperAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
};

const Page = ({ children }) => (
  <Suspense fallback={<LoadingPage />}>{children}</Suspense>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Page><Login /></Page>} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <Layout><Page><Dashboard /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/students"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Students /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/students/:id"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><StudentDetail /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/rooms"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Rooms /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admissions"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Admissions /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/attendance"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Attendance /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/leaves"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Leaves /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/visitors"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Visitors /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/billing/invoices"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Invoices /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/billing/payments"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Payments /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/expenses"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Expenses /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/checkout"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Checkout /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/food"
        element={
          <Protected roles={['owner', 'manager', 'warden']}>
            <Layout><Page><Food /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/utilities"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Utilities /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/complaints"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Complaints /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/maintenance"
        element={
          <Protected roles={['owner', 'manager', 'staff']}>
            <Layout><Page><Maintenance /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/inventory"
        element={
          <Protected roles={['owner', 'manager', 'staff']}>
            <Layout><Page><Inventory /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/notices"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Notices /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/staff"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Staff /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/payroll"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Payroll /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/documents"
        element={
          <Protected roles={['owner', 'manager', 'accountant', 'warden', 'staff']}>
            <Layout><Page><Documents /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/reports"
        element={
          <Protected roles={['owner', 'manager', 'accountant']}>
            <Layout><Page><Reports /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/users"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Users /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Settings /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/audit"
        element={
          <Protected roles={['owner']}>
            <Layout><Page><Audit /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/subscription"
        element={
          <Protected roles={['owner', 'manager']}>
            <Layout><Page><Subscription /></Page></Layout>
          </Protected>
        }
      />

      <Route
        path="/portal"
        element={
          <Protected roles={['student']}>
            <Layout><Page><Portal /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/portal/invoices"
        element={
          <Protected roles={['student']}>
            <Layout><Page><PortalInvoices /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/portal/leaves"
        element={
          <Protected roles={['student']}>
            <Layout><Page><PortalLeaves /></Page></Layout>
          </Protected>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminDashboard /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/hostels"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminHostels /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminUsers /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminPlans /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/subscriptions"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminSubscriptions /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminPayments /></Page></Layout>
          </Protected>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <Protected superAdminOnly>
            <Layout><Page><AdminAudit /></Page></Layout>
          </Protected>
        }
      />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;