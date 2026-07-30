import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/common/Toast';
import { CapturePage } from './pages/CapturePage';
import { GalleryPage } from './pages/GalleryPage';
import { SharedSessionPage } from './pages/SharedSessionPage';

const App: React.FC = () => (
  <BrowserRouter>
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<CapturePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/session/:token" element={<SharedSessionPage />} />
      </Routes>
      <ToastContainer />
    </div>
  </BrowserRouter>
);

export default App;
