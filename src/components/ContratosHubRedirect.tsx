import { Navigate } from "react-router-dom";

// Contratos atualmente é uma única página — encaminha direto.
export default function ContratosHubRedirect() {
  return <Navigate to="/contratos" replace />;
}
