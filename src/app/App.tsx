import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { ArchivePage } from "@/pages/ArchivePage";
import { LoginPage } from "@/pages/LoginPage";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { ProjectEditPage } from "@/pages/ProjectEditPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ContactEnquiriesPage } from "@/pages/ContactEnquiriesPage";
import { SiteSettingsPage } from "@/pages/SiteSettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:id" element={<ProjectEditPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="contact-enquiries" element={<ContactEnquiriesPage />} />
          <Route path="site-settings" element={<SiteSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
