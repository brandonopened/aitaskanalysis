import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTask } from "@/lib/tasks";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  description: z.string().min(1, "Task description is required"),
  priority: z.enum(["high", "medium", "low"], {
    required_error: "Please select a priority level",
  }),
});

export function TaskForm() {
  const { toast } = useToast();
  const addTask = useAddTask();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      priority: "medium",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await addTask.mutateAsync(values);
      form.reset();
      toast({
        title: "Task added successfully",
        description: "Your task will now be analyzed for AI potential.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add task. Please try again.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Enter a task you do regularly..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="flex-1">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            disabled={addTask.isPending}
            className="min-w-[100px]"
          >
            {addTask.isPending ? "Adding..." : "Add Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}