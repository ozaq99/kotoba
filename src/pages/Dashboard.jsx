import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>Welcome to Dashboard 🎉</h1>
      <p>Logged in as: {user?.email}</p>
      <button onClick={handleLogout}>Log Out</button>
    </div>
  )
}