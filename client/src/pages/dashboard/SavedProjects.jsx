import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ProjectCard from '../../components/ProjectCard.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function SavedProjects() {
  const [projects, setProjects] = useState(null);

  const load = () => api.get('/saved').then((r) => setProjects(r.projects));
  useEffect(() => { load(); }, []);

  const toggleSave = async (id) => { await api.post(`/saved/${id}`); load(); };

  if (!projects) return <Spinner />;

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Saved projects</h2></div>
      {projects.length === 0 ? (
        <div className="empty-state"><h3>Nothing saved yet</h3></div>
      ) : (
        <div className="card-grid">{projects.map((p) => <ProjectCard project={p} key={p.id} onToggleSave={toggleSave} saved />)}</div>
      )}
    </>
  );
}
