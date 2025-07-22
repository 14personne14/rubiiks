import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import CubeDetail from './pages/CubeDetail';
import Login from './pages/Login';
import CubeForm from './pages/CubeForm';

function App() {
  return (
		<AuthProvider>
			<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<Layout>
					<Routes>
						<Route path='/' element={<Home />} />
						<Route path='/cube/:id' element={<CubeDetail />} />
						<Route path='/login' element={<Login />} />
						<Route path='/admin' element={<Navigate to='/' replace />} />
						<Route path='/admin/add' element={<CubeForm />} />
						<Route path='/admin/edit/:id' element={<CubeForm />} />
					</Routes>
				</Layout>
			</Router>
		</AuthProvider>
  );
}

export default App;
