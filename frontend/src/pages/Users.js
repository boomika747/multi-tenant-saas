import { useEffect, useState } from "react";
import api from "../api/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const tenantId = user?.tenantId;
  const isAdmin = user?.role === "tenant_admin";

  const loadUsers = async () => {
    if (!isAdmin) return;
    const res = await api.get(`/tenants/${tenantId}/users`);
    setUsers(res.data.data.users);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔒 Render check AFTER hooks
  if (!isAdmin) {
    return <h3>Access Denied</h3>;
  }

  const addUser = async () => {
    if (!email || !password || !fullName) {
      return alert("All fields required");
    }

    await api.post(`/tenants/${tenantId}/users`, {
      email,
      password,
      fullName,
    });

    setEmail("");
    setPassword("");
    setFullName("");
    loadUsers();
  };

  const deleteUser = async (userId) => {
    await api.delete(`/users/${userId}`);
    loadUsers();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Users</h2>

      {/* ADD USER */}
      <input
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <br />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />

      <button onClick={addUser}>Add User</button>

      <hr />

      {/* USERS LIST */}
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.fullName} — {u.email} ({u.role})
            <button
              style={{ marginLeft: 10 }}
              onClick={() => deleteUser(u.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
