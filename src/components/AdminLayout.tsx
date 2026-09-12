import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { Brand } from "./Brand";
import {
  ArchiveIcon,
  FolderIcon,
  GridIcon,
  HomeIcon,
  LogoutIcon,
  MailIcon,
  SettingsIcon,
} from "./icons";

const navigation = [
  { label: "Dashboard", icon: GridIcon, active: true },
  { label: "Projects", icon: FolderIcon },
  { label: "Homepage", icon: HomeIcon },
  { label: "Site Settings", icon: SettingsIcon },
  { label: "Contact Enquiries", icon: MailIcon },
  { label: "Archive", icon: ArchiveIcon },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    setIsSigningOut(true);
    await authClient.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-frame">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand />
          <p className="nav-label">Workspace</p>
          <nav aria-label="Admin navigation">
            <ul className="nav-list">
              {navigation.map((item) => {
                const NavIcon = item.icon;
                return (
                  <li key={item.label}>
                    <button
                      className={`nav-item${item.active ? " nav-item-active" : ""}`}
                      type="button"
                      disabled={!item.active}
                      aria-current={item.active ? "page" : undefined}
                      title={item.active ? undefined : `${item.label} is coming next`}
                    >
                      <NavIcon />
                      <span>{item.label}</span>
                      {!item.active && <span className="nav-soon">Soon</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          disabled={isSigningOut}
        >
          <LogoutIcon />
          <span>{isSigningOut ? "Signing out…" : "Logout"}</span>
        </button>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
