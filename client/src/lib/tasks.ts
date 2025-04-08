import { Task } from "@db/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });
}

export function useTaskStats() {
  return useQuery<{ totalTimeSaved: number; totalTasksCompleted: number }>({
    queryKey: ['/api/tasks/stats'],
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { description: string; priority: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error('Failed to add task');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });
}

export function useAnalyzeTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tasks/analyze', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to analyze tasks');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });
}

export function useUpdateTaskPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, priority }: { taskId: number; priority: "high" | "medium" | "low" }) => {
      const res = await fetch(`/api/tasks/${taskId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task priority');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number; completed: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task completion status');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
    },
  });
}