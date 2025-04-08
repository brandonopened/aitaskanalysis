import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Task Analyzer</h1>
        <div className="flex items-center gap-4">
          {user?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </header>
  );
}