import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import FeedPage from './pages/FeedPage.jsx'
import RankingPage from './pages/RankingPage.jsx'
import WorkoutPage from './pages/WorkoutPage.jsx'
import ClubPage from './pages/ClubPage.jsx'
import MyPage from './pages/MyPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import Layout from './components/Layout.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh',color:'#4DB8FF',fontSize:28}}>⏳</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<FeedPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="workout" element={<WorkoutPage />} />
            <Route path="club" element={<ClubPage />} />
            <Route path="my" element={<MyPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
