import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  { label: "Dashboard", icon: GridIcon, to: "/" },
  { label: "Projects", icon: FolderIcon, to: "/projects" },
  { label: "Homepage", icon: HomeIcon },
  { label: "Site Settings", icon: SettingsIcon, to: "/site-settings" },
  { label: "Contact Enquiries", icon: MailIcon, to: "/contact-enquiries" },
  { label: "Archive", icon: ArchiveIcon, to: "/archive" },
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
                    {item.to ? (
                      <NavLink
                        className={({ isActive }) =>
                          `nav-item${isActive ? " nav-item-active" : ""}`
                        }
                        to={item.to}
                        end={item.to === "/"}
                      >
                        <NavIcon />
                        <span>{item.label}</span>
                      </NavLink>
                    ) : (
                      <button
                        className="nav-item"
                        type="button"
                        disabled
                        title={`${item.label} is coming next`}
                      >
                        <NavIcon />
                        <span>{item.label}</span>
                        <span className="nav-soon">Soon</span>
                      </button>
                    )}
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
