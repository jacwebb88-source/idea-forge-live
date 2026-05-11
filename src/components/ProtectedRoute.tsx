import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
  /** If provided, only these roles can access. Others are redirected to /unauthorized */
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Role exists but isn't permitted — send to their home
    const roleHome: Record<UserRole, string> = {
      ops:        "/",
      buyer:      "/buyer-portal",
      supplier:   "/buyer-request",
      transport:  "/transport",
      management: "/",
    };
    return <Navigate to={roleHome[role] ?? "/"} replace />;
  }

  return <>{children}</>;
}
