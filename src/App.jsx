import { useAuth0 } from "@auth0/auth0-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";


function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white gap-6">
        
        <div className="text-3xl font-bold">
          <span className="text-green-500">&lt;</span>
          Pass
          <span className="text-green-500">OP/&gt;</span>
        </div>

        
        <div className="w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-green-500 animate-pulse"></div>
        </div>

        <p className="text-sm text-gray-400">Securing your vault...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      

      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Login />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
