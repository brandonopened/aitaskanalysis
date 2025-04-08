import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { tasks, users } from "@db/schema";
import { eq, and, count } from "drizzle-orm";
import { analyzeTaskAIPotential, estimateTaskTime, getAIImplementationDetails } from "./lib/openai";
import { setupAuth } from "./auth";
import { organizations } from "@db/schema";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Set up authentication routes and middleware
  setupAuth(app);

  // Get all tasks for the current user only
  app.get("/api/tasks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("Fetching tasks for user:", req.user!.id, req.user!.username);

      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, req.user!.id))
        .orderBy(tasks.priority, tasks.createdAt);

      console.log("Found tasks:", allTasks.length, "Tasks:", JSON.stringify(allTasks, null, 2));

      res.json(allTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Add new task with current user's ID
  app.post("/api/tasks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("Creating task for user:", req.user!.id, req.user!.username);

      const { description, priority } = req.body;

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      if (!priority || !["high", "medium", "low"].includes(priority)) {
        return res.status(400).json({ message: "Valid priority level is required" });
      }

      const timeEstimates = await estimateTaskTime(description);

      // Explicitly set the user_id when creating the task
      const [newTask] = await db
        .insert(tasks)
        .values({
          description,
          priority,
          userId: req.user!.id, // Ensure this is set correctly
          aiPotential: "pending",
          estimatedMinutes: timeEstimates.manual,
          estimatedMinutesWithAI: timeEstimates.withAI,
          completed: false //Adding completed field
        })
        .returning();

      console.log("Created new task:", {
        taskId: newTask.id,
        userId: newTask.userId,
        description: newTask.description
      });

      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get AI implementation details for a task belonging to current user
  app.get("/api/tasks/:id/ai-details", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const taskId = parseInt(req.params.id);

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const [task] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, req.user!.id)
          )
        );

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const details = await getAIImplementationDetails(task.description);
      res.json({ details });
    } catch (error) {
      console.error("Error getting AI details:", error);
      res.status(500).json({ message: "Failed to get AI implementation details" });
    }
  });

  // Update task priority for current user's task
  app.patch("/api/tasks/:id/priority", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const taskId = parseInt(req.params.id);
      const { priority } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      if (!priority || !["high", "medium", "low"].includes(priority)) {
        return res.status(400).json({ message: "Valid priority level is required" });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({ priority })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, req.user!.id)
          )
        )
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task priority:", error);
      res.status(500).json({ message: "Failed to update task priority" });
    }
  });

  // Analyze all pending tasks for the current user
  app.post("/api/tasks/analyze", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const pendingTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.aiPotential, "pending"),
            eq(tasks.userId, req.user!.id)
          )
        );

      for (const task of pendingTasks) {
        const [analysis, timeEstimates] = await Promise.all([
          analyzeTaskAIPotential(task.description),
          estimateTaskTime(task.description)
        ]);

        await db
          .update(tasks)
          .set({
            aiPotential: analysis.potential,
            coachingTips: analysis.coachingTips,
            motivationalScore: analysis.motivationalScore,
            estimatedMinutes: timeEstimates.manual,
            estimatedMinutesWithAI: timeEstimates.withAI
          })
          .where(
            and(
              eq(tasks.id, task.id),
              eq(tasks.userId, req.user!.id)
            )
          );
      }

      const updatedTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, req.user!.id))
        .orderBy(tasks.priority, tasks.createdAt);

      res.json(updatedTasks);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze tasks" });
    }
  });

  // Delete task for current user
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      await db
        .delete(tasks)
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.userId, req.user!.id)
          )
        );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // New route to mark a task as complete
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const taskId = parseInt(req.params.id);
      const { completed } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({ completed })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, req.user!.id)
          )
        )
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task completion:", error);
      res.status(500).json({ message: "Failed to update task completion" });
    }
  });

  // Add route to get time savings stats
  app.get("/api/tasks/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const completedTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.user!.id),
            eq(tasks.completed, true)
          )
        );

      let totalTimeSaved = 0;
      let totalTasksCompleted = completedTasks.length;

      completedTasks.forEach(task => {
        if (task.estimatedMinutes && task.estimatedMinutesWithAI) {
          totalTimeSaved += task.estimatedMinutes - task.estimatedMinutesWithAI;
        }
      });

      res.json({
        totalTimeSaved,
        totalTasksCompleted
      });
    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });


  // Get organizations
  app.get("/api/organizations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const orgs = await db
        .select()
        .from(organizations)
        .orderBy(organizations.name);

      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const userId = parseInt(req.params.id);
      const { role, organizationId } = req.body;

      if (!["admin", "user"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Update the user
      const [updatedUser] = await db
        .update(users)
        .set({ 
          role,
          organizationId
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Update the admin stats endpoint to include user IDs and roles
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const completedTasks = await db
        .select({
          id: tasks.id,
          description: tasks.description,
          username: users.username,
          userId: users.id,
          userRole: users.role,
          organizationId: users.organizationId,
          organizationName: organizations.name,
          estimatedMinutes: tasks.estimatedMinutes,
          estimatedMinutesWithAI: tasks.estimatedMinutesWithAI,
          aiPotential: tasks.aiPotential,
          completedAt: tasks.createdAt,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.userId, users.id))
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .where(eq(tasks.completed, true));

      const stats = {
        totalTasks: completedTasks.length,
        totalTimeSaved: completedTasks.reduce((acc, task) => {
          if (task.estimatedMinutes && task.estimatedMinutesWithAI) {
            return acc + (task.estimatedMinutes - task.estimatedMinutesWithAI);
          }
          return acc;
        }, 0),
        tasksByUser: {} as Record<string, {
          userId: number;
          completed: number;
          timeSaved: number;
          organizationName: string;
          organizationId?: number;
          role: string;
        }>,
        tasksByAIPotential: {
          none: 0,
          some: 0,
          advanced: 0
        }
      };

      completedTasks.forEach(task => {
        const username = task.username;
        if (!stats.tasksByUser[username]) {
          stats.tasksByUser[username] = {
            userId: task.userId,
            completed: 0,
            timeSaved: 0,
            organizationName: task.organizationName || 'No Organization',
            organizationId: task.organizationId,
            role: task.userRole
          };
        }

        stats.tasksByUser[username].completed++;
        if (task.estimatedMinutes && task.estimatedMinutesWithAI) {
          stats.tasksByUser[username].timeSaved +=
            task.estimatedMinutes - task.estimatedMinutesWithAI;
        }

        if (task.aiPotential in stats.tasksByAIPotential) {
          stats.tasksByAIPotential[task.aiPotential as keyof typeof stats.tasksByAIPotential]++;
        }
      });

      res.json({
        stats,
        tasks: completedTasks
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  return httpServer;
}