import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const FeedPage = lazy(() => import('./pages/FeedPage.jsx'))
const RankingPage = lazy(() => import('./pages/RankingPage.jsx'))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage.jsx'))
const ClubPage = lazy(() => import('./pages/ClubPage.jsx'))
const MyPage = lazy(() => import('./pages/MyPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const RacePage = lazy(() => import('./pages/RacePage.jsx'))
const ClubListPage = lazy(() => import('./pages/ClubListPage.jsx'))
const ClubDetailPage = lazy(() => import('./pages/ClubDetailPage.jsx'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage.jsx'))
const NoticePage = lazy(() => import('./pages/NoticePage.jsx'))
const Layout = lazy(() => import('./components/Layout.jsx'))

const PageLoader = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh',color:'#4DB8FF',fontSize:28}}>⏳</div>
)

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<FeedPage />} />
              <Route path="ranking" element={<RankingPage />} />
              <Route path="workout" element={<WorkoutPage />} />
              <Route path="club" element={<ClubPage />} />
              <Route path="my" element={<MyPage />} />
              <Route path="races" element={<RacePage />} />
              <Route path="clubs" element={<ClubListPage />} />
              <Route path="clubs/:id" element={<ClubDetailPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="users/:id" element={<UserProfilePage />} />
              <Route path="notices" element={<NoticePage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
