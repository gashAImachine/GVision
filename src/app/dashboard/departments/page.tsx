"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";

// ─── Types ───
type DepartmentKey = "IT" | "Maintenance" | "Housekeeping" | "Front Office";
type TaskStatus = "open" | "in_progress" | "due_today" | "overdue" | "completed";
type TaskPriority = "urgent" | "high" | "normal";
type TaskType = "IT Support" | "Hardware" | "Software" | "Network" | "Other" | "Maintenance" | "Pest Control" | "Refurbishment" | "Deep Clean" | "Housekeeping" | "Turndown" | "Guest Request" | "Concierge" | "Admin" | "Front Desk";
type TaskScope = "single_room" | "general_area" | "batch_by_floor";

interface Task {
  id: string;
  department: DepartmentKey;
  room?: string;
  floor?: string;
  type: TaskType;
  description: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  created_at: string;
  scope?: TaskScope;
}

interface Department {
  name: DepartmentKey;
  icon: string;
  color: string;
}

const DEPARTMENTS: Record<DepartmentKey, Department> = {
  IT: { name: "IT", icon: "💻", color: "text-blue-400" },
  Maintenance: { name: "Maintenance", icon: "🔧", color: "text-orange-400" },
  Housekeeping: { name: "Housekeeping", icon: "🧹", color: "text-purple-400" },
  "Front Office": { name: "Front Office", icon: "🛎️", color: "text-pink-400" },
};

const TASK_TYPES: Record<DepartmentKey, TaskType[]> = {
  IT: ["IT Support", "Hardware", "Software", "Network", "Other"],
  Maintenance: ["Maintenance", "Pest Control", "Refurbishment", "Deep Clean", "Other"],
  Housekeeping: ["Deep Clean", "Housekeeping", "Refurbishment", "Turndown", "Other"],
  "Front Office": ["Guest Request", "Concierge", "Admin", "Front Desk", "Other"],
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  open: "bg-orange-500/15 text-orange-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  due_today: "bg-yellow-500/15 text-yellow-400",
  overdue: "bg-red-500/15 text-red-400",
  completed: "bg-green-500/15 text-green-400",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  due_today: "Due Today",
  overdue: "Overdue",
  completed: "Completed",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: "bg-red-500/15 text-red-400 font-semibold",
  high: "bg-orange-500/15 text-orange-400",
  normal: "bg-night-500/15 text-night-400",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
};

// ─── Demo tasks ───
const generateDemoTasks = (): Task[] => {
  const tasks: Task[] = [];
  const rooms = ["R0812", "R0604", "R1015", "R0307", "R0519", "R1408"];
  const today = new Date();

  for (let i = 0; i < 24; i++) {
    const dept = Object.keys(DEPARTMENTS)[i % 4] as DepartmentKey;
    const daysOffset = Math.floor(Math.random() * 5) - 2;
    const dueDate = new Date(today.getTime() + daysOffset * 24 * 60 * 60 * 1000);

    let status: TaskStatus = "open";
    if (i % 5 === 0) status = "completed";
    else if (i % 7 === 0) status = "in_progress";
    else if (daysOffset < 0) status = "overdue";
    else if (daysOffset === 0) status = "due_today";

    tasks.push({
      id: `demo-${i}`,
      department: dept,
      room: i % 3 === 0 ? undefined : rooms[i % rooms.length],
      type: TASK_TYPES[dept][i % TASK_TYPES[dept].length],
      description: [
        "Fix broken AC unit",
        "Replace light bulbs",
        "Clean guest bathroom",
        "Update WiFi router firmware",
        "Refill toiletries",
        "Repair door lock",
        "Power outlet not working",
        "Deep clean carpet",
        "Network cable issue",
        "Guest checkout assistance",
      ][i % 10],
      due_date: dueDate.toISOString().split("T")[0],
      priority: (["normal", "high", "urgent"][i % 3] as TaskPriority),
      status,
      notes: i % 4 === 0 ? "Waiting for parts" : undefined,
      created_at: new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      scope: "single_room",
    });
  }

  return tasks;
};

export default function DepartmentsPage() {
  const supabase = useSupabase();
  const [tasks, setTasks] = useState<Task[]>(generateDemoTasks());
  const [isDemo, setIsDemo] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentKey | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "schedule">("tasks");

  // Filter state
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");

  // Schedule form state
  const [scheduleScope, setScheduleScope] = useState<TaskScope>("single_room");
  const [scheduleRoom, setScheduleRoom] = useState("");
  const [scheduleFloor, setScheduleFloor] = useState("");
  const [scheduleType, setScheduleType] = useState<TaskType>("Other");
  const [schedulePriority, setSchedulePriority] = useState<TaskPriority>("normal");
  const [scheduleDueDate, setScheduleDueDate] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Bulk action state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gvision_tasks");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
          setIsDemo(false);
        }
      }
    } catch {
      // Ignore parse errors, use demo data
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("gvision_tasks", JSON.stringify(tasks));
    } catch {
      // Ignore storage errors
    }
  }, [tasks]);

  const getDeptTasks = useCallback((dept: DepartmentKey) => {
    return tasks.filter((t) => t.department === dept);
  }, [tasks]);

  const getTaskStats = useCallback((dept: DepartmentKey) => {
    const deptTasks = getDeptTasks(dept);
    return {
      open: deptTasks.filter((t) => t.status === "open").length,
      overdue: deptTasks.filter((t) => t.status === "overdue").length,
      completed: deptTasks.filter((t) => t.status === "completed").length,
      total: deptTasks.length,
    };
  }, [getDeptTasks]);

  const getKPIs = useCallback((dept: DepartmentKey) => {
    const deptTasks = getDeptTasks(dept);
    return {
      open: deptTasks.filter((t) => t.status === "open").length,
      in_progress: deptTasks.filter((t) => t.status === "in_progress").length,
      due_today: deptTasks.filter((t) => t.status === "due_today").length,
      overdue: deptTasks.filter((t) => t.status === "overdue").length,
      completed: deptTasks.filter((t) => t.status === "completed").length,
    };
  }, [getDeptTasks]);

  const getFilteredTasks = useCallback((dept: DepartmentKey) => {
    let filtered = getDeptTasks(dept);

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }

    return filtered.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [getDeptTasks, filterStatus, filterPriority]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDepartment || !scheduleType || !scheduleDueDate || !scheduleDescription) {
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      department: selectedDepartment,
      room: scheduleScope === "single_room" ? scheduleRoom : undefined,
      floor: scheduleScope === "batch_by_floor" ? scheduleFloor : undefined,
      type: scheduleType,
      description: scheduleDescription,
      due_date: scheduleDueDate,
      priority: schedulePriority,
      status: "open",
      notes: scheduleNotes || undefined,
      created_at: new Date().toISOString(),
      scope: scheduleScope,
    };

    setTasks([...tasks, newTask]);

    // Reset form
    setScheduleScope("single_room");
    setScheduleRoom("");
    setScheduleFloor("");
    setScheduleType("Other");
    setSchedulePriority("normal");
    setScheduleDueDate("");
    setScheduleDescription("");
    setScheduleNotes("");
    setActiveTab("tasks");
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const handleDeleteTasks = (taskIds: string[]) => {
    setTasks(tasks.filter((t) => !taskIds.includes(t.id)));
    setSelectedTasks(new Set());
  };

  const handleBulkStatusChange = (newStatus: TaskStatus) => {
    if (selectedTasks.size === 0) return;
    setTasks(
      tasks.map((t) => (selectedTasks.has(t.id) ? { ...t, status: newStatus } : t))
    );
    setSelectedTasks(new Set());
  };

  // Department Overview (grid view)
  if (!selectedDepartment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Department Centre</h1>
          <p className="text-night-400 mt-1">
            {isDemo ? "Demo data" : "Manage departments and tasks"}
          </p>
        </div>

        {/* Department cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(DEPARTMENTS).map((dept) => {
            const stats = getTaskStats(dept.name);
            return (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="glass rounded-xl p-6 text-left hover:border-brand-500/50 hover:bg-night-900/50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{dept.icon}</span>
                  <h3 className="text-lg font-semibold text-white">{dept.name}</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-night-400 text-sm">Open Tasks</span>
                    <span className="text-2xl font-bold text-white">{stats.open}</span>
                  </div>

                  {stats.overdue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-night-400 text-sm">Overdue</span>
                      <span className="text-lg font-semibold text-red-400">{stats.overdue}</span>
                    </div>
                  )}

                  {stats.completed > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-night-400 text-sm">Completed</span>
                      <span className="text-lg font-semibold text-green-400">{stats.completed}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Department detail view
  const dept = DEPARTMENTS[selectedDepartment];
  const kpis = getKPIs(selectedDepartment);
  const filteredTasks = getFilteredTasks(selectedDepartment);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setSelectedDepartment(null);
            setSelectedTasks(new Set());
          }}
          className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white hover:bg-night-800 transition-colors text-sm"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">
            <span className="mr-2">{dept.icon}</span>
            {selectedDepartment}
          </h1>
          <p className="text-night-400 mt-1">Task management & scheduling</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-night-400 text-xs uppercase tracking-wide">Open</p>
          <p className="text-2xl font-bold text-white mt-2">{kpis.open}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-night-400 text-xs uppercase tracking-wide">In Progress</p>
          <p className="text-2xl font-bold text-white mt-2">{kpis.in_progress}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-night-400 text-xs uppercase tracking-wide">Due Today</p>
          <p className="text-2xl font-bold text-yellow-400 mt-2">{kpis.due_today}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-night-400 text-xs uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{kpis.overdue}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-night-400 text-xs uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-2">{kpis.completed}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "tasks"
                ? "text-brand-400 border-b-2 border-brand-500"
                : "text-night-400 hover:text-white"
            }`}
          >
            My Tasks
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "schedule"
                ? "text-brand-400 border-b-2 border-brand-500"
                : "text-night-400 hover:text-white"
            }`}
          >
            Schedule Task
          </button>
        </div>

        <div className="p-6">
          {activeTab === "tasks" ? (
            // My Tasks tab
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "all")}
                  className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="due_today">Due Today</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "all")}
                  className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              {/* Bulk actions */}
              {selectedTasks.size > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-night-900/50 rounded-lg border border-white/10">
                  <span className="text-sm text-night-400 py-1">{selectedTasks.size} selected</span>
                  <button
                    onClick={() => handleBulkStatusChange("in_progress")}
                    className="px-3 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("completed")}
                    className="px-3 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    Mark Done
                  </button>
                  <button
                    onClick={() => handleDeleteTasks(Array.from(selectedTasks))}
                    className="px-3 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {/* Tasks table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-night-400 font-medium">
                        <input
                          type="checkbox"
                          checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
                            } else {
                              setSelectedTasks(new Set());
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Room</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Description</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Due</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Priority</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-night-400 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-night-500">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(task.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedTasks);
                                if (e.target.checked) {
                                  newSet.add(task.id);
                                } else {
                                  newSet.delete(task.id);
                                }
                                setSelectedTasks(newSet);
                              }}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-white font-mono text-xs">{task.room || "—"}</td>
                          <td className="px-4 py-3 text-night-300">{task.type}</td>
                          <td className="px-4 py-3 text-white max-w-[200px] truncate">{task.description}</td>
                          <td className="px-4 py-3 text-night-300 whitespace-nowrap">{task.due_date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}>
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={task.status}
                              onChange={(e) => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
                              className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[task.status]} bg-transparent border-0 focus:outline-none cursor-pointer`}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="due_today">Due Today</option>
                              <option value="overdue">Overdue</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteTasks([task.id])}
                              className="text-night-400 hover:text-red-400 transition-colors text-sm"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Schedule Task tab
            <form onSubmit={handleScheduleSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Task Scope</label>
                  <select
                    value={scheduleScope}
                    onChange={(e) => setScheduleScope(e.target.value as TaskScope)}
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="single_room">Single Room</option>
                    <option value="general_area">General Area</option>
                    <option value="batch_by_floor">Batch by Floor</option>
                  </select>
                </div>

                {scheduleScope === "single_room" && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Room Code</label>
                    <input
                      type="text"
                      value={scheduleRoom}
                      onChange={(e) => setScheduleRoom(e.target.value)}
                      placeholder="e.g. R0812"
                      className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                {scheduleScope === "batch_by_floor" && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Floor Number</label>
                    <input
                      type="text"
                      value={scheduleFloor}
                      onChange={(e) => setScheduleFloor(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Task Type</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {TASK_TYPES[selectedDepartment].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Priority</label>
                  <select
                    value={schedulePriority}
                    onChange={(e) => setSchedulePriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Due Date</label>
                  <input
                    type="date"
                    value={scheduleDueDate}
                    onChange={(e) => setScheduleDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={scheduleDescription}
                  onChange={(e) => setScheduleDescription(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes (optional)</label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Any additional notes or special instructions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleRoom("");
                    setScheduleFloor("");
                    setScheduleType(TASK_TYPES[selectedDepartment][0]);
                    setSchedulePriority("normal");
                    setScheduleDueDate("");
                    setScheduleDescription("");
                    setScheduleNotes("");
                  }}
                  className="px-4 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm font-medium hover:bg-night-800 transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
