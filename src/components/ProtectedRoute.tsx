import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { LoadingScreen } from "./LoadingScreen";

export function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
