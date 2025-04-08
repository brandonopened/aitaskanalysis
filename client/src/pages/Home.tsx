import { TaskForm } from "@/components/TaskForm";
import { TaskColumns } from "@/components/TaskColumns";
import { useTasks } from "@/lib/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";

export function Home() {
  const [, navigate] = useLocation();
  const { data: tasks, isLoading, error } = useTasks();

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">Error loading tasks</h3>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnalyzedTasks = tasks?.some(task => task.aiPotential !== "pending");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl font-bold text-center mb-2">AI Task Analyzer</h1>
            <p className="text-muted-foreground text-center mb-8">
              Enter your tasks and we'll analyze their AI automation potential
            </p>
            <TaskForm />
          </div>

          {hasAnalyzedTasks && (
            <div className="flex justify-end mb-6">
              <Button
                onClick={() => navigate("/tasks")}
                className="gap-2"
              >
                View AI Tasks <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[300px] animate-pulse" />
              ))}
            </div>
          ) : (
            <TaskColumns tasks={tasks || []} />
          )}
        </div>
      </main>
    </div>
  );
}