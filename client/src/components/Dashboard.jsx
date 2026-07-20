import { useContext, useEffect, useState} from 'react';
import { AuthContext } from '../context/authContext';
import '../dashboard.css';

export const Dashboard = () => {
    const {user, token, logout } = useContext(AuthContext);
    const [members, setMembers] = useState([]);
    const [subunits, setSubunits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    const isAdmin = user?.role === 'admin';
    const memberCount = members.length;
    const subunitCount = subunits.length;

    useEffect(() => {
        if (!token) return; //only fetched if we're logged in

        const fetchData = async() => {
            setLoading(true);
            setError(null);

            try{
                // Fetch members from roster-core-service
                const membersResponse = await fetch(
                    `${import.meta.env.VITE_ROSTER_SERVICE_URL}/members`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if(!membersResponse.ok) throw new Error('Failed to fetch members');
                const membersData = await membersResponse.json();
                setMembers(membersData.members || []);

                // Fetch subunits from roster-core-services
                const subunitsResponse = await fetch(
                    `${import.meta.env.VITE_ROSTER_SERVICE_URL}/subunits`,
                    {
                        headers: { Authorization: `Bearer ${token}`},
                    }
                );

                if(!subunitsResponse.ok) throw new Error('Failed to fetch subunits');
                const subunitsData = await subunitsResponse.json();
                setSubunits(subunitsData.subunits || [])

            } catch(fetchError){
                setError(fetchError);
            } finally {
                setLoading(false)
            }
        }
        fetchData();
    }, [token]);

    if(!user) {
        return <div>Not logged in</div>
    }

    const statusMessage = loading
        ? 'Refreshing dashboard data...'
        : error
        ? 'Unable to load data right now.'
        : `${memberCount} members · ${subunitCount} subunits`;

  //   return (
  //   <div style={{ padding: '2rem' }}>
  //     <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
  //       <h1>Welcome, {user.name}!</h1>
  //       <button onClick={logout}>Logout</button>
  //     </div>

  //     {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
  //     {loading && <div>Loading...</div>}

  //     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
  //       <div>
  //         <h2>Subunits</h2>
  //         <ul>
  //           {subunits.map((s) => (
  //             <li key={s.id}>{s.name}</li>
  //           ))}
  //         </ul>
  //       </div>

  //       <div>
  //         <h2>Members</h2>
  //         <ul>
  //           {members.map((m) => (
  //             <li key={m.id}>
  //               {m.user?.name} ({m.subunit?.name})
  //             </li>
  //           ))}
  //         </ul>
  //       </div>
  //     </div>
  //   </div>
  // );

 return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-top">
            <div className="branding">
              <div className="profile-avatar">{user.name?.[0] || 'U'}</div>
              <div className="profile-info">
                <h2>{user.name}</h2>
                <p>{isAdmin ? 'Product Designer' : 'Team Member'}</p>
              </div>
            </div>
            <nav className="sidebar-nav">
              <button className="active">Dashboard</button>
              <button>Members</button>
              <button>Subunits</button>
              <button>Duties</button>
              <button>Roster</button>
              <button>Settings</button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <p>History available</p>
            <p style={{ marginTop: '0.75rem', color: '#111827', fontWeight: 700 }}>
              Check your weekly transaction reports
            </p>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                Track your team activity and subunit performance in one place.
              </p>
              <p style={{ color: '#6b7280', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                {statusMessage}
              </p>
            </div>
            <div className="dashboard-actions">
              <div className="small-pill">Search</div>
              <div className="small-pill">Notifications</div>
              <div className="small-pill">New duty</div>
            </div>
          </header>

          <section className="stats-grid">
            <article className="metric-card">
              <div className="metric-card-header">
                <div className="metric-icon">M</div>
                <span className="metric-subtitle">Total members</span>
              </div>
              <p className="metric-value">{memberCount || 0}</p>
              <p className="metric-subtitle">Active roster</p>
            </article>
            <article className="metric-card">
              <div className="metric-card-header">
                <div className="metric-icon">S</div>
                <span className="metric-subtitle">Total subunits</span>
              </div>
              <p className="metric-value">{subunitCount || 0}</p>
              <p className="metric-subtitle">Organized groups</p>
            </article>
            <article className="metric-card">
              <div className="metric-card-header">
                <div className="metric-icon">D</div>
                <span className="metric-subtitle">Upcoming duties</span>
              </div>
              <p className="metric-value">{Math.max(3, Math.floor(memberCount / 4))}</p>
              <p className="metric-subtitle">Scheduled tasks</p>
            </article>
          </section>

          <section className="overview-panel">
            <div className="overview-header">
              <h2>Roster Overview</h2>
              <select>
                <option>Weekly assignments</option>
              </select>
            </div>
            <div className="chart-placeholder">
              Attendance and duty assignment chart coming soon.
            </div>
          </section>

          <section className="activity-panel">
            <div className="activity-list">
              <h3>Recent Activity</h3>
              <div className="activity-item">
                <div>
                  <strong>Member Added</strong>
                  <p>10:42:23 AM</p>
                </div>
                <span className="activity-status">Completed</span>
              </div>
              <div className="activity-item">
                <div>
                  <strong>Subunit Updated</strong>
                  <p>12:50:40 AM</p>
                </div>
                <span className="activity-status">Pending</span>
              </div>
            </div>
            <div className="order-panel">
              <h3>Upcoming Duties</h3>
              <div className="order-row order-header">
                <span>Date</span>
                <span>Subunit</span>
                <span>Status</span>
              </div>
              <div className="order-row active">
                <span>Jun 10</span>
                <span>Worship Team</span>
                <span>Confirmed</span>
              </div>
              <div className="order-row">
                <span>Jun 12</span>
                <span>Hospitality</span>
                <span>Assigned</span>
              </div>
              <div className="order-row">
                <span>Jun 14</span>
                <span>Media</span>
                <span>Pending</span>
              </div>
              <div className="order-row">
                <span>Jun 16</span>
                <span>Kids Ministry</span>
                <span>Assigned</span>
              </div>
            </div>
          </section>

          <button onClick={logout} style={{ marginTop: '1rem', padding: '0.9rem 1.15rem', borderRadius: '18px', background: '#111827', color: '#ffffff', cursor: 'pointer' }}>
            Logout
          </button>
        </main>
      </div>
    </div>
  );
 }