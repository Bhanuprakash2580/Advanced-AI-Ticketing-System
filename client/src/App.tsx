import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const Employees = lazy(() => import('./pages/Employees').then((module) => ({ default: module.Employees })));
const NewTicket = lazy(() => import('./pages/NewTicket').then((module) => ({ default: module.NewTicket })));
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage }))
);
const TicketDetail = lazy(() => import('./pages/TicketDetail').then((module) => ({ default: module.TicketDetail })));
const TicketList = lazy(() => import('./pages/TicketList').then((module) => ({ default: module.TicketList })));

function PageFallback() {
  return <p className="text-sm text-slate-500">Loading...</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<NewTicket />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="employees" element={<Employees />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
