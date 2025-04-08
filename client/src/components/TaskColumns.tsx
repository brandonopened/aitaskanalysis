import { useState } from "react";
import { Task } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUp, ArrowRight, ArrowDown, Wand2, GripVertical } from "lucide-react";
import { useDeleteTask, useAnalyzeTasks, useUpdateTaskPriority } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type Column = {
  title: string;
  description: string;
  filter: (task: Task) => boolean;
};

const columns: Column[] = [
  {
    title: "No AI Potential",
    description: "Tasks best done without AI",
    filter: (task) => task.aiPotential === "none",
  },
  {
    title: "Some AI",
    description: "Tasks that can be partially automated",
    filter: (task) => task.aiPotential === "some",
  },
  {
    title: "High AI",
    description: "Tasks that are perfect for AI assistance!",
    filter: (task) => task.aiPotential === "advanced",
  },
];

const priorityIcons = {
  high: <ArrowUp className="h-4 w-4 text-red-500" />,
  medium: <ArrowRight className="h-4 w-4 text-yellow-500" />,
  low: <ArrowDown className="h-4 w-4 text-green-500" />,
};

const priorityOrder = ["high", "medium", "low"] as const;

interface DraggableTaskProps {
  task: Task;
  onDelete: (id: number) => Promise<void>;
  isDeleting: boolean;
  index: number;
  moveTask: (dragPriority: string, dragIndex: number, dropPriority: string, dropIndex: number) => void;
}

function formatTime(minutes: number): string {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

function TimeEstimates({ manual, withAI }: { manual: number | null; withAI: number | null }) {
  if (!manual) return null;

  const timeSaved = withAI ? manual - withAI : 0;
  const savingsPercentage = withAI ? Math.round((timeSaved / manual) * 100) : 0;

  return (
    <div className="flex gap-2 text-xs text-muted-foreground">
      <span>Est. time: {formatTime(manual)}</span>
      {withAI && (
        <>
          <span>•</span>
          <span className="text-green-600">
            With AI: {formatTime(withAI)} ({savingsPercentage}% faster)
          </span>
        </>
      )}
    </div>
  );
}

const DraggableTask = ({ task, onDelete, isDeleting, index, moveTask }: DraggableTaskProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { index, priority: task.priority },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TASK',
    hover: (item: { index: number, priority: string }) => {
      if (item.index !== index || item.priority !== task.priority) {
        moveTask(item.priority, item.index, task.priority, index);
        item.index = index;
        item.priority = task.priority;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        "p-4 rounded-lg border bg-card flex justify-between items-start gap-2",
        "transition-colors duration-200",
        isDragging && "opacity-50",
        "cursor-move"
      )}
    >
      <div className="flex items-center gap-4">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm">{task.description}</p>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-xs text-muted-foreground">
              Added {new Date(task.createdAt).toLocaleTimeString()}
            </span>
            <TimeEstimates
              manual={task.estimatedMinutes}
              withAI={task.estimatedMinutesWithAI}
            />
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={isDeleting}
        onClick={() => onDelete(task.id)}
        className="h-8 w-8 shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function TaskColumns({ tasks }: { tasks: Task[] }) {
  const deleteTask = useDeleteTask();
  const analyzeTasks = useAnalyzeTasks();
  const updatePriority = useUpdateTaskPriority();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const unanalyzedTasks = tasks.filter(task => task.aiPotential === "pending");
  const analyzedTasks = tasks.filter(task => task.aiPotential !== "pending");

  const handleDelete = async (taskId: number) => {
    setDeletingId(taskId);
    try {
      await deleteTask.mutateAsync(taskId);
    } finally {
      setDeletingId(null);
    }
  };

  const moveTask = async (dragPriority: string, dragIndex: number, dropPriority: string, dropIndex: number) => {
    const dragTask = unanalyzedTasks
      .filter(t => t.priority === dragPriority)[dragIndex];

    if (!dragTask) return;

    console.log('Moving task:', {
      taskId: dragTask.id,
      fromPriority: dragPriority,
      toPriority: dropPriority,
      fromIndex: dragIndex,
      toIndex: dropIndex
    });

    // Only update if priority changed
    if (dragPriority !== dropPriority) {
      try {
        await updatePriority.mutateAsync({
          taskId: dragTask.id,
          priority: dropPriority as "high" | "medium" | "low"
        });
        console.log('Priority update successful');
      } catch (error) {
        console.error('Failed to update priority:', error);
      }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-8">
        {/* Unanalyzed Tasks Section */}
        {unanalyzedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Tasks to Analyze</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Drag tasks to reorder priority or click analyze to determine AI potential
                  </p>
                </div>
                <Button
                  onClick={() => analyzeTasks.mutate()}
                  disabled={analyzeTasks.isPending}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  {analyzeTasks.isPending ? "Analyzing..." : "Analyze All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {priorityOrder.map((priority) => {
                  const tasksWithPriority = unanalyzedTasks.filter(
                    (task) => task.priority === priority
                  );

                  if (tasksWithPriority.length === 0) return null;

                  return (
                    <div key={priority} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {priorityIcons[priority]}
                        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Tasks
                      </div>
                      <div className="space-y-2 pl-6">
                        {tasksWithPriority.map((task, index) => (
                          <DraggableTask
                            key={task.id}
                            task={task}
                            index={index}
                            onDelete={handleDelete}
                            isDeleting={deletingId === task.id}
                            moveTask={moveTask}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analyzed Tasks Columns */}
        {analyzedTasks.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analysis Results</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => (
                <Card key={column.title} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">{column.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{column.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {priorityOrder.map((priority) => {
                        const tasksWithPriority = analyzedTasks
                          .filter(column.filter)
                          .filter((task) => task.priority === priority);

                        if (tasksWithPriority.length === 0) return null;

                        return (
                          <div key={priority} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {priorityIcons[priority]}
                              {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                            </div>
                            <div className="space-y-2 pl-6">
                              {tasksWithPriority.map((task) => (
                                <div
                                  key={task.id}
                                  className="p-4 rounded-lg border bg-card flex justify-between items-start gap-2"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm">{task.description}</p>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <span className="text-xs text-muted-foreground">
                                        Added {new Date(task.createdAt).toLocaleTimeString()}
                                      </span>
                                      <TimeEstimates
                                        manual={task.estimatedMinutes}
                                        withAI={task.estimatedMinutesWithAI}
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingId === task.id}
                                    onClick={() => handleDelete(task.id)}
                                    className="h-8 w-8 shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DndProvider>
  );
}