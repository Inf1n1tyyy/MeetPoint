import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuth, isLoading } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
