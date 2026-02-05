//frontend/app/dashboard/tasks/page.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { MoreHorizontal, PlusCircle, Check, Play, Edit, Loader2, Timer } from "lucide-react"

import { api, ApiTask, ApiUser, ApiActivity } from "@/lib/api"
import { formatDateTime } from "@/lib/date-format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

import { TaskDataTable } from "@/components/tasks/task-data-table"
import { CreateTaskModal } from "@/components/tasks/create-task-modal"
import { TaskDetailModal } from "@/components/tasks/task-detail-modal"
import { ManageActivitiesModal } from "@/components/tasks/manage-activities-modal"
import { LogActivityModal } from "@/components/activity/log-activity-modal"

export default function TasksPage() {
    const { toast: legacyToast } = useToast();
    const [tasks, setTasks] = useState<ApiTask[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
    
    const [isCreateModalOpen, setCreateModalOpen] = useState(false)
    const [isManageActivitiesModalOpen, setManageActivitiesModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    
    const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null)

    const router = useRouter()

    // FETCHING ALL TASKS (Salesperson Independent)
    // Calling getTasksForUser() without an ID sends "0" to the backend,
    // which returns all tasks for all users.
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const userTasks = await api.getTasksForUser()
            setTasks(userTasks || [])
        } catch (error) {
            console.error("Failed to fetch tasks:", error)
            toast.error("Failed to load tasks.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const userFromStorage = localStorage.getItem("user")
        if (userFromStorage) {
            const parsedUser = JSON.parse(userFromStorage) as ApiUser
            setCurrentUser(parsedUser)
            fetchData()
        } else {
            router.push("/login")
        }
    }, [fetchData, router])
    
    const handleTaskAction = () => {
        if (currentUser) {
            fetchData()
        }
    }

    const handleViewDetails = (task: ApiTask) => {
        setSelectedTask(task);
        setDetailModalOpen(true);
    };

    const handleStartTask = async (taskId: number) => {
        try {
            await api.updateTaskStatus(taskId, 'In Progress')
            toast.success("Task moved to 'In Progress'.")
            if (currentUser) fetchData()
        } catch (error: any) {
            toast.error("Failed to start task.", { description: error.message })
        }
    }

    const handleOpenCompleteModal = (task: ApiTask) => {
        setSelectedTask(task);
        setManageActivitiesModalOpen(true);
    }

    const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'Pending'), [tasks])
    const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'In Progress'), [tasks])
    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'Completed'), [tasks])

    const columns: ColumnDef<ApiTask>[] = [
        {
            accessorKey: "title",
            header: "Task Title",
            cell: ({ row }) => (
                <div 
                    className="flex flex-col cursor-pointer hover:underline"
                    onClick={() => handleViewDetails(row.original)}
                >
                    <span className="font-medium">{row.original.title}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-xs">{row.original.details}</span>
                </div>
            ),
        },
        {
            accessorKey: "company_names",
            header: "Related Lead",
            cell: ({ row }) => {
                const leadName = row.original.company_names;
                if (!leadName || leadName === "") return <Badge variant="secondary">General Task</Badge>;
                return <Badge variant="outline">{leadName}</Badge>;
            },
        },
        {
            accessorKey: "due_date",
            header: "Due Date",
            cell: ({ row }) => formatDateTime(row.original.due_date),
        },
        {
            accessorKey: "duration_minutes",
            header: "Time Taken",
            cell: ({ row }) => {
                const task = row.original;
                if (task.status === 'Completed' && task.duration_minutes != null && task.duration_minutes >= 0) {
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <span>{task.duration_minutes} min</span>
                        </div>
                    );
                }
                return <span className="text-muted-foreground text-center">—</span>;
            },
        },
        // Displaying Assigned To (Salesperson) to distinguish tasks
        {
            accessorKey: "assigned_to_username",
            header: "Assigned To",
            cell: ({ row }) => <span className="font-medium text-xs">{row.original.assigned_to_username}</span>
        },
        {
            accessorKey: "created_by_username",
            header: "Assigned By",
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.created_by_username}</span>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const task = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(task)}>
                                <Edit className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            {task.status === 'Pending' && (
                                <DropdownMenuItem onClick={() => handleStartTask(task.id)}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Task
                                </DropdownMenuItem>
                            )}
                            {task.status !== 'Completed' && (
                                <DropdownMenuItem onClick={() => handleOpenCompleteModal(task)}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Mark as Complete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    if (loading || !currentUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-3 md:space-y-4 px-3 sm:px-4 md:px-0">
            {/* Desktop: Show heading with description */}
            <div className="hidden md:block space-y-1">
                {/* <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Task Management</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    All tasks across the sales team.
                </p> */}
            </div>

            <Card className="border-0 md:border shadow-none md:shadow-sm">
                <CardHeader className="pb-2 md:pb-4">
                    <div className="flex justify-between items-center gap-2">
                        {/* Mobile: Show "Tasks" text with buttons in same row */}
                        <CardTitle className="text-sm sm:text-base md:text-lg">All Tasks</CardTitle>
                        <div className="flex gap-1.5 sm:gap-2">
                           <Button
                                variant="outline"
                                onClick={() => setIsLogActivityModalOpen(true)}
                                size="sm"
                                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                           >
                                <span className="hidden sm:inline">Log Activity</span>
                                <span className="sm:hidden">Log Activity</span>
                           </Button>
                            {currentUser.role === 'admin' && (
                                <Button
                                    onClick={() => setCreateModalOpen(true)}
                                    size="sm"
                                    className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                                >
                                    <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Create New Task</span>
                                    <span className="sm:hidden">Create Task</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-3 md:px-6">
                    <Tabs defaultValue="todo">
                        <TabsList className="w-full grid grid-cols-3 h-9 sm:h-10">
                            <TabsTrigger value="todo" className="text-xs sm:text-sm px-1 sm:px-3">
                                <span className="hidden sm:inline">To-Do ({pendingTasks.length})</span>
                                <span className="sm:hidden">To-Do ({pendingTasks.length})</span>
                            </TabsTrigger>
                            <TabsTrigger value="in_progress" className="text-xs sm:text-sm px-1 sm:px-3">
                                <span className="hidden sm:inline">In Progress ({inProgressTasks.length})</span>
                                <span className="sm:hidden">Progress ({inProgressTasks.length})</span>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="text-xs sm:text-sm px-1 sm:px-3">
                                <span className="hidden sm:inline">Completed ({completedTasks.length})</span>
                                <span className="sm:hidden">Done ({completedTasks.length})</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="todo" className="mt-3 md:mt-4">
                            <TaskDataTable columns={columns} data={pendingTasks} />
                        </TabsContent>
                        <TabsContent value="in_progress" className="mt-3 md:mt-4">
                            <TaskDataTable columns={columns} data={inProgressTasks} />
                        </TabsContent>
                        <TabsContent value="completed" className="mt-3 md:mt-4">
                            <TaskDataTable columns={columns} data={completedTasks} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            
            {currentUser.role === 'admin' && (
                <CreateTaskModal
                    currentUser={currentUser}
                    isOpen={isCreateModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => { setCreateModalOpen(false); handleTaskAction(); }}
                />
            )}
            
            <LogActivityModal
                currentUser={currentUser}
                isOpen={isLogActivityModalOpen}
                onClose={() => setIsLogActivityModalOpen(false)}
                onSuccess={() => { setIsLogActivityModalOpen(false); handleTaskAction(); }}
            />

            <ManageActivitiesModal
                task={selectedTask}
                isOpen={isManageActivitiesModalOpen}
                isCompleting={true} // This modal is now only for the final completion step
                onClose={() => setManageActivitiesModalOpen(false)}
                onSuccess={() => { setManageActivitiesModalOpen(false); handleTaskAction(); }}
            />
            
            <TaskDetailModal
                task={selectedTask}
                isOpen={isDetailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                onActivityAdded={handleTaskAction}
            />
        </div>
    )
}