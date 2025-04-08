import { Switch, Route } from "wouter";
import { Home } from "@/pages/Home";
import { TaskGrid } from "@/pages/TaskGrid";
import { AuthPage } from "@/pages/AuthPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/tasks" component={TaskGrid} />
        <ProtectedRoute path="/admin" component={AdminDashboard} requiredRole="admin" />
        <ProtectedRoute path="/" component={Home} />
      </Switch>
    </AuthProvider>
  );
}

export default App;