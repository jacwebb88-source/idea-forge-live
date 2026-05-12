import { UserRole } from "@/contexts/AuthContext";

type Props = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

// Auth gate is currently open — no login required for demos.
// To re-enable: swap this file for the full ProtectedRoute implementation.
export function ProtectedRoute({ children }: Props) {
  return <>{children}</>;
}
