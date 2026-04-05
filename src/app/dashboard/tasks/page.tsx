"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils";

// ─── Types ───
interface Task {
  id: string;
  mode: "single" | "batch";
  floor: string;
  room: string | null; // null for batch
  side: string | null; // null for single
  type: string;
  priority: "Normal" | "High" | "Urgent";
  dueDate: string;
  endDate: string;
  description: string;
  department: string;
  status: "open" | "completed";
  createdAt: string;
}

// ─── Demo Tasks ───
const DEMO_TASKS: Task[] = [
  {
    id: "task-001",
    mode: "single",
    floor: "L08",
    room: "R0812",
    side: null,
    type: "Maintenance",
    priority: "High",
    dueDate: "2026-04-07",
    endDate: "2026-04-08",
    description: "Air conditioning unit not cooling properly",
    department: "Maintenance",
    status: "open",
    createdAt: "2026-04-05T08:00:00Z",
  },
  {
    id: "task-002",
    mode: "single",
    floor: "L06",
    room: "R0604",
    side: null,
    type: "Deep Clean",
    priority: "Normal",
    dueDate: "2026-04-10",
    endDate: "2026-04-11",
    description: "Room deep clean required before guest arrival",
    department: "Housekeeping",
    status: "open",
    createdAt: "2026-04-05T09:15:00Z",
  },
  {
    id: "task-003",
    mode: "batch",
    floor: "L10",
    room: null,
    side: "Low 01-11",
    type: "Pest Control",
    priority: "High",
    dueDate: "2026-04-09",
    endDate: "2026-04-10",
    description: "Quarterly pest control spray for low-numbered rooms",
    department: "Maintenance",
    status: "open",
    createdAt: "2026-04-05T10:30:00Z",
  },
  {
    id: "task-004",
    mode: "single",
    floor: "L15",
    room: "R1508",
    side: null,
    type: "IT Support",
    priority: "Urgent",
    dueDate: "2026-04-05",
    endDate: "2026-04-05",
    description: "WiFi router replacement in penthouse",
    department: "IT",
    status: "open",
    createdAt: "2026-04-05T11:45:00Z",
  },
  {
    id: "task-005",
    mode: "single",
    floor: "L12",
    room: "R1201",
    side: null,
    type: "Refurbishment",
    priority: "Normal",
    dueDate: "2026-04-15",
    endDate: "2026-04-20",
    description: "Suite refurbishment: new carpet and wall paint",
    department: "Maintenance",
    status: "completed",
    createdAt: "2026-04-01T14:00:00Z",
  },
  {
    id: "task-006",
    mode: "batch",
    floor: "L19",
    room: null,
    side: "Both",
    type: "Maintenance",
    priority: "Normal",
    dueDate: "2026-04-12",
    endDate: "2026-04-13",
    description: "Check all mini-bar readings and restock if needed",
    department: "Housekeeping",
    status: "completed",
    createdAt: "2026-03-28T09:00:00Z",
  },
];

// ─── Floor Constants ───
const FLOORS = ["L02", "L03", "L04", "L05", "L06", "L07", "L08", "L09", "L10", "L11", "L12", "L13", "L14", "L15", "L16", "L17", "L18", "L19"];
const ROOM_RANGES = Array.from({ length: 21 }, (_, i) => String(i + 1).padStart(2, "0"));
const TASK_TYPES = ["Pest Control", "Maintenance", "Refurbishment", "Deep Clean", "IT Support", "Other"];
const DEPARTMENTS = ["IT", "Maintenance", "Housekeeping", "Front Office", "unassigned"];

// ─── Helper: Check if task is overdue ───
const isOverdue = (task: Task): boolean => {
  if (task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

// ─── Priority Color ───
const PRIORITY_COLOR: Record<string, string> = {
  Normal: "bg-blue-500/15 text-blue-400",
  High: "bg-orange-500/15 text-orange-400",
  Urgent: "bg-red-500/15 text-red-400",
};

// ─── Main Component ───
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [activeTab, setActiveTab] = useState<"open" | "add" | "completed">("open");

  // ─── Add Task Form State ───
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [floor, setFloor] = useState("L08");
  const [room, setRoom] = useState("01");
  const [side, setSide] = useState("Both");
  const [taskType, setTaskType] = useState("Maintenance");
  const [priority, setPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [dueDate, setDueDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("unassigned");

  // ─── Open Tasks State ───
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "task" | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);

  // ─── Load tasks from localStorage on mount ───
  useEffect(() => {
    const stored = localStorage.getItem("gvision_tasks");
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
        setIsDemo(false);
      } catch {
        setTasks(DEMO_TASKS);
      }
    } else {
      setTasks(DEMO_TASKS);
    }
  }, []);

  // ─── Save tasks to localStorage ───
  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("gvision_tasks", JSON.stringify(newTasks));
  }, []);

  // ─── Add new task ───
  const handleAddTask = () => {
    if (!dueDate || !endDate || !description) {
      alert("Please fill in all required fields");
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      mode,
      floor,
      room: mode === "single" ? `R${floor.replace("L", "")}${room}` : null,
      side: mode === "batch" ? side : null,
      type: taskType,
      priority,
      dueDate,
      endDate,
      description,
      department,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const newTasks = [newTask, ...tasks];
    saveTasks(newTasks);
    setIsDemo(false);

    // Reset form
    setMode("single");
    setFloor("L08");
    setRoom("01");
    setSide("Both");
    setTaskType("Maintenance");
    setPriority("Normal");
    setDueDate("");
    setEndDate("");
    setDescription("");
    setDepartment("unassigned");

    setActiveTab("open");
  };

  // ─── Mark task(s) as done ───
  const handleMarkDone = () => {
    const updated = tasks.map((t) => {
      if (selectedTasks.has(t.id) && t.status === "open") {
        return { ...t, status: "completed" as const };
      }
      return t;
    });
    saveTasks(updated);
    setSelectedTasks(new Set());
  };

  // ─── Delete task(s) ───
  const handleDelete = () => {
    const updated = tasks.filter((t) => !selectedTasks.has(t.id));
    saveTasks(updated);
    setSelectedTasks(new Set());
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // ─── Delete single task ───
  const handleDeleteSingle = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    setShowDeleteConfirm(false);
    setTargetTaskId(null);
  };

  // ─── Reopen task ───
  const handleReopen = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id && t.status === "completed") {
        return { ...t, status: "open" as const };
      }
      return t;
    });
    saveTasks(updated);
  };

  // ─── Filter open tasks ───
  const openTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "open")
      .filter((t) => {
        if (filterDepartment !== "all" && t.department !== filterDepartment) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        if (searchText) {
          const s = searchText.toLowerCase();
          return (
            t.description.toLowerCase().includes(s) ||
            t.room?.toLowerCase().includes(s) ||
            t.type.toLowerCase().includes(s)
          );
        }
        return true;
      });
  }, [tasks, filterDepartment, filterPriority, searchText]);

  // ─── Filter completed tasks ───
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "completed");
  }, [tasks]);

  // ─── Progress bar ───
  const openCount = tasks.filter((t) => t.status === "open").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ─── Select all checkbox ───
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(openTasks.map((t) => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const allSelected = openTasks.length > 0 && selectedTasks.size === openTasks.length;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-night-400 mt-1">
            {completedCount} of {totalCount} completed {isDemo ? "(demo data)" : ""}
          </p>
        </div>
      </div>

      {/* ─── Progress Bar ─── */}
      {totalCount > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-night-400">Overall Progress</span>
            <span className="text-white font-medium">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-2 bg-night-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-night-500 text-right">{progressPercent}% complete</div>
        </div>
      )}

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 bg-night-900/50 rounded-lg p-1 border border-white/10 w-fit">
        {(["open", "add", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-brand-600 text-white"
                : "text-night-300 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab === "open" && `Open Tasks (${openCount})`}
            {tab === "add" && "Add Task"}
            {tab === "completed" && `Completed (${completedCount})`}
          </button>
        ))}
      </div>

      {/* ─── OPEN TASKS TAB ─── */}
      {activeTab === "open" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by room, type, or description..."
              className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[240px]"
            />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Bulk Actions Bar */}
          {selectedTasks.size > 0 && (
            <div className="glass rounded-xl p-4 flex items-center justify-between border-l-4 border-brand-500">
              <span className="text-white text-sm font-medium">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkDone}
                  className="px-3 py-2 rounded-lg bg-green-600/20 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-colors border border-green-500/20"
                >
                  Mark Done
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget("selected");
                    setShowDeleteConfirm(true);
                  }}
                  className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors border border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-4 py-3 text-night-400 font-medium">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer accent-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-night-400 font-medium">Room</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Description</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Due</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Priority</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {openTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-night-500">
                        No open tasks. Great work!
                      </td>
                    </tr>
                  ) : (
                    openTasks.map((task) => {
                      const overdue = isOverdue(task);
                      return (
                        <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(task.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedTasks);
                                if (e.target.checked) {
                                  newSelected.add(task.id);
                                } else {
                                  newSelected.delete(task.id);
                                }
                                setSelectedTasks(newSelected);
                              }}
                              className="w-4 h-4 rounded cursor-pointer accent-brand-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {overdue && (
                                <span className="text-lg" title="Overdue">
                                  ⚠️
                                </span>
                              )}
                              <span className="text-white font-mono text-xs">
                                {task.mode === "single"
                                  ? task.room
                                  : `${task.floor} - ${task.side}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-night-300">{task.type}</td>
                          <td className="px-4 py-3 text-white max-w-[300px] truncate">
                            {task.description}
                          </td>
                          <td className="px-4 py-3 text-night-300 whitespace-nowrap">
                            {formatDate(task.dueDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[task.priority] || ""}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-night-400 text-xs">{task.department}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD TASK TAB ─── */}
      {activeTab === "add" && (
        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-3 block">Task Mode</label>
              <div className="flex gap-3">
                {(["single", "batch"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      mode === m
                        ? "bg-brand-600 text-white"
                        : "bg-night-900 border border-white/10 text-night-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {m === "single" ? "Single Room" : "Full Floor (Batch)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Floor Selection */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Floor *</label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {FLOORS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Single Room or Batch Selection */}
            {mode === "single" ? (
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Room Number *</label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {ROOM_RANGES.map((r) => (
                    <option key={r} value={r}>
                      R{floor.replace("L", "")}{r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Side *</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Both">Both (01-21)</option>
                  <option value="Low 01-11">Low (01-11)</option>
                  <option value="High 12-21">High (12-21)</option>
                </select>
              </div>
            )}

            {/* Task Type */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Task Type *</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "Normal" | "High" | "Urgent")}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task details, notes, and requirements..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            {/* Assign To Department */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Assign To Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAddTask}
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium transition-all text-sm"
            >
              Create Task
            </button>
          </div>
        </div>
      )}

      {/* ─── COMPLETED TAB ─── */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-4 py-3 text-night-400 font-medium">Room</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Description</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Completed</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Priority</th>
                    <th className="px-4 py-3 text-night-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-night-500">
                        No completed tasks yet
                      </td>
                    </tr>
                  ) : (
                    completedTasks.map((task) => (
                      <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors opacity-75">
                        <td className="px-4 py-3">
                          <span className="text-white font-mono text-xs">
                            {task.mode === "single"
                              ? task.room
                              : `${task.floor} - ${task.side}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-night-300">{task.type}</td>
                        <td className="px-4 py-3 text-white max-w-[300px] truncate">
                          {task.description}
                        </td>
                        <td className="px-4 py-3 text-night-300 whitespace-nowrap">
                          {formatDate(task.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[task.priority] || ""}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReopen(task.id)}
                              className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                            >
                              Reopen
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget("task");
                                setTargetTaskId(task.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Dialog ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-sm w-full space-y-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white">Delete Task{selectedTasks.size > 1 ? "s" : ""}?</h3>
            <p className="text-night-400 text-sm">
              {deleteTarget === "selected"
                ? `You are about to delete ${selectedTasks.size} task${selectedTasks.size !== 1 ? "s" : ""}. This action cannot be undone.`
                : "This task will be permanently deleted. This action cannot be undone."}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                  setTargetTaskId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-night-900 border border-white/10 text-white hover:bg-night-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget === "selected") {
                    handleDelete();
                  } else if (deleteTarget === "task" && targetTaskId) {
                    handleDeleteSingle(targetTaskId);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
