import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof formSchema>;

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loginMutation, registerMutation } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      if (isLogin) {
        await loginMutation.mutateAsync(values);
      } else {
        await registerMutation.mutateAsync(values);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Login to manage your AI-powered tasks"
                : "Sign up to start optimizing your workflow with AI"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Please wait</span>
                    </div>
                  ) : isLogin ? (
                    "Login"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                form.reset();
              }}
              className="text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden md:flex flex-col justify-center p-8 bg-muted/50">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-4">
            AI-Powered Task Management
          </h1>
          <p className="text-muted-foreground mb-8">
            Revolutionize your workflow with intelligent task analysis and AI-driven optimization. Get personalized coaching and discover new ways to be more productive.
          </p>
          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold">Smart Task Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  AI analyzes your tasks and suggests the best automation strategies
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold">AI Implementation Guide</h3>
                <p className="text-sm text-muted-foreground">
                  Get step-by-step guidance on how to leverage AI for each task
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl">📈</span>
              </div>
              <div>
                <h3 className="font-semibold">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor time savings and efficiency improvements with AI assistance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}