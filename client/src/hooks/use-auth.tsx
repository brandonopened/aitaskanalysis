import { ReactNode, createContext, useContext } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { User, InsertUser } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User & { redirectUrl?: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User & { redirectUrl?: string }, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Invalid username or password');
      }
      return res.json();
    },
    onSuccess: (response) => {
      // Update the user data in the cache
      queryClient.setQueryData(['/api/user'], response);
      // Invalidate tasks query to force a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Navigate to main page
      setLocation('/');
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (response) => {
      // Update the user data in the cache
      queryClient.setQueryData(['/api/user'], response);
      // Invalidate tasks query to force a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Navigate to main page
      setLocation('/');
      toast({
        title: "Registration successful",
        description: "Welcome to AI Task Analyzer!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/logout', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to logout');
      }
    },
    onSuccess: () => {
      // Clear the user data from the cache
      queryClient.setQueryData(['/api/user'], null);
      // Clear tasks from the cache on logout
      queryClient.removeQueries({ queryKey: ['/api/tasks'] });
      setLocation('/auth');
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}