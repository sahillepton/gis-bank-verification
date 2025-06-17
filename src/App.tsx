import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { BankAssignment } from './components/BankAssignment'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <h1 className="text-3xl font-bold text-center mb-8">Bank Assignment System</h1>
          <Routes>
            <Route path="/" element={<BankAssignment />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
