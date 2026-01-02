import { useEffect, useState,useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";

export default function ProjectTasks() {
  const { projectId } = useParams();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const tenantId = currentUser?.tenantId;

  // ---------------- LOAD TASKS ----------------
  const loadTasks = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data.data.tasks || []);
    } catch (err) {
      console.error("Load tasks error", err);
    }
  };

  // ---------------- LOAD USERS ----------------
  const loadUsers = async () => {
    try {
      const res = await api.get(`/tenants/${tenantId}/users`);
      console.log("USERS LOADED:", res.data.data.users);
      setUsers(res.data.data.users || []);
    } catch (err) {
      console.error("Load users error", err);
    }
  };

  // ---------------- CREATE TASK ----------------
  const createTask = async () => {
    if (!title) {
      alert("Enter task title");
      return;
    }

    await api.post(`/projects/${projectId}/tasks`, { title });
    setTitle("");
    loadTasks();
  };

  // ---------------- UPDATE STATUS ----------------
  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}/status`, { status });
    loadTasks();
  };

  // ---------------- ASSIGN USER ----------------
  const assignUser = async (taskId, userId) => {
    await api.put(`/tasks/${taskId}`, {
      assignedTo: userId || null,
    });
    loadTasks();
  };

// ---------------- USE EFFECT ----------------
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  loadTasks();
  loadUsers();
}, [projectId]);

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20 }}>
      <h2>Tasks</h2>

      {/* CREATE TASK */}
      <input
        placeholder="New task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={createTask}>Add Task</button>

      <hr />

      {/* TASK LIST */}
      <ul>
        {tasks.map((t) => (
          <li key={t.id} style={{ marginBottom: 15 }}>
            <strong>{t.title}</strong> — {t.status}

            <br />

            {/* STATUS */}
            <button onClick={() => updateStatus(t.id, "todo")}>Todo</button>
            <button onClick={() => updateStatus(t.id, "in_progress")}>
              In Progress
            </button>
            <button onClick={() => updateStatus(t.id, "completed")}>
              Completed
            </button>

            <br />

            {/* ASSIGN USER */}
            <select onChange={(e) => assignUser(t.id, e.target.value)}>
  <option value="">Unassigned</option>

  {users.length > 0 &&
    users.map((u) => (
      <option key={u.id} value={u.id}>
        {u.email}
      </option>
    ))}
</select>

          </li>
        ))}
      </ul>
    </div>
  );
}
