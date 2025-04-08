import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, Wand2, Building2, Pencil } from "lucide-react";
import { UserEditDialog } from "@/components/UserEditDialog";

type TaskStats = {
  stats: {
    totalTasks: number;
    totalTimeSaved: number;
    tasksByUser: Record<string, {
      userId: number;
      completed: number;
      timeSaved: number;
      organizationName: string;
      organizationId?: number;
      role: string;
    }>;
    tasksByAIPotential: {
      none: number;
      some: number;
      advanced: number;
    };
  };
  tasks: Array<{
    id: number;
    description: string;
    username: string;
    organizationName: string;
    estimatedMinutes: number | null;
    estimatedMinutesWithAI: number | null;
    aiPotential: "none" | "some" | "advanced";
    completedAt: string;
  }>;
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 
    ? `${hours}h ${remainingMinutes}m`
    : `${remainingMinutes}m`;
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery<TaskStats>({
    queryKey: ['/api/admin/stats'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, tasks } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto space-y-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Total Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalTasks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Total Time Saved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMinutes(stats.totalTimeSaved)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-500" />
                  AI Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>Advanced: {stats.tasksByAIPotential.advanced}</p>
                  <p>Some: {stats.tasksByAIPotential.some}</p>
                  <p>None: {stats.tasksByAIPotential.none}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                User Performance by Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tasks Completed</TableHead>
                    <TableHead>Time Saved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.tasksByUser).map(([username, userStats]) => (
                    <TableRow key={username}>
                      <TableCell>{username}</TableCell>
                      <TableCell>{userStats.organizationName}</TableCell>
                      <TableCell className="capitalize">{userStats.role}</TableCell>
                      <TableCell>{userStats.completed}</TableCell>
                      <TableCell>{formatMinutes(userStats.timeSaved)}</TableCell>
                      <TableCell>
                        <UserEditDialog
                          userId={userStats.userId}
                          username={username}
                          currentRole={userStats.role}
                          currentOrganizationId={userStats.organizationId}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit user</span>
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Task List */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>AI Potential</TableHead>
                    <TableHead>Time Saved</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.username}</TableCell>
                      <TableCell>{task.organizationName}</TableCell>
                      <TableCell>{task.description}</TableCell>
                      <TableCell className="capitalize">{task.aiPotential}</TableCell>
                      <TableCell>
                        {task.estimatedMinutes && task.estimatedMinutesWithAI
                          ? formatMinutes(task.estimatedMinutes - task.estimatedMinutesWithAI)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(task.completedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}