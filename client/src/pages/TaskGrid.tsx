import { useState } from "react";
import { useTasks, useTaskStats } from "@/lib/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@db/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useCompleteTask } from "@/lib/tasks";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 
    ? `${hours}h ${remainingMinutes}m`
    : `${remainingMinutes}m`;
}

function TaskTile({ task, onClick, isSelected }: { task: Task; onClick: () => void; isSelected: boolean }) {
  const completeTask = useCompleteTask();
  const timeSaved = task.estimatedMinutesWithAI && task.estimatedMinutes
    ? task.estimatedMinutes - task.estimatedMinutesWithAI
    : 0;
  const savingsPercentage = task.estimatedMinutesWithAI && task.estimatedMinutes
    ? Math.round((timeSaved / task.estimatedMinutes) * 100)
    : 0;

  return (
    <Card
      className={`mb-4 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''} ${
        task.completed ? 'opacity-75' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <h3 className="font-medium mb-2">{task.description}</h3>
          <Button
            variant="ghost"
            size="sm"
            className={task.completed ? 'text-green-500' : ''}
            onClick={(e) => {
              e.stopPropagation();
              completeTask.mutate({ taskId: task.id, completed: !task.completed });
            }}
          >
            <CheckCircle2 className={`h-5 w-5 ${task.completed ? 'fill-green-500' : ''}`} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Priority: {task.priority}</p>
          <p>AI Potential: {task.aiPotential}</p>
          {task.estimatedMinutes && task.estimatedMinutesWithAI && savingsPercentage > 0 && (
            <p>
              Time: {task.estimatedMinutes}m → {task.estimatedMinutesWithAI}m ({savingsPercentage}% faster)
            </p>
          )}
          {task.motivationalScore && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Motivation Score</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {task.motivationalScore}/100
                </span>
              </div>
              <Progress value={task.motivationalScore} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskDetails({ taskId }: { taskId: number }) {
  const { data: details, isLoading } = useQuery<{ details: string }>({
    queryKey: [`/api/tasks/${taskId}/ai-details`],
    enabled: !!taskId,
  });

  const { data: tasks } = useTasks();
  const task = tasks?.find(t => t.id === taskId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!details?.details || !task) {
    return null;
  }

  return (
    <div className="space-y-6">
      {task.coachingTips && (
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Coaching Insights</h3>
          <p className="text-muted-foreground">{task.coachingTips}</p>
        </div>
      )}
      <div className="prose prose-sm max-w-none">
        <h2 className="text-2xl font-bold mb-4">AI Implementation Guide</h2>
        <div className="whitespace-pre-wrap">{details.details}</div>
      </div>
    </div>
  );
}

export function TaskGrid() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: stats } = useTaskStats();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const aiTasks = tasks.filter(
    task => task.aiPotential === "advanced" || task.aiPotential === "some"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Task Analyzer
            </Button>
            {stats && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>{stats.totalTasksCompleted} tasks completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>{formatMinutes(stats.totalTimeSaved)} saved with AI</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-4">
              <h2 className="text-2xl font-bold mb-6">AI-Powered Tasks</h2>
              {aiTasks.map(task => (
                <TaskTile
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>

            <div className="col-span-8">
              <Card className="h-full">
                <CardContent className="p-6">
                  {selectedTaskId ? (
                    <TaskDetails taskId={selectedTaskId} />
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-4">Task Details</h2>
                      <p className="text-muted-foreground">
                        Select a task from the left to see detailed AI implementation suggestions.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}