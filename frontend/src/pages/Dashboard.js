import { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data.data.projects || []);
      } catch (err) {
        console.error("Failed to load projects", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>Dashboard</h2>

      {projects.length === 0 && <p>No projects found</p>}

      {projects.map((p) => (
        <div
          key={p.id}
          style={{ cursor: "pointer", marginBottom: 10 }}
          onClick={() => navigate(`/projects/${p.id}`)}
        >
          📁 {p.name}
        </div>
      ))}
    </div>
  );
}
