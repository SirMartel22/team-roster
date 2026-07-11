import { useContext, useEffect, useState} from 'react';
import { AuthContext } from '../context/authContext';

export const Dashboard = () => {
    const {user, token, logout } = useContext(AuthContext);
    const [members, setMembers] = useState([]);
    const [subunits, setSubunits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

            } catch(error){
                setError(error)
            } finally {
                setLoading(false)
            }
        }
        fetchData();
    }, [token]);

    if(!user) {
        return <div>Not logged in</div>
    }


    return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <h1>Welcome, {user.name}!</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {loading && <div>Loading...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h2>Subunits</h2>
          <ul>
            {subunits.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Members</h2>
          <ul>
            {members.map((m) => (
              <li key={m.id}>
                {m.user?.name} ({m.subunit?.name})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
 }