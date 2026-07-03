import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGate } from 'components/AuthGate';
import { ArchiveDataProvider } from 'context/ArchiveDataContext';
import { Landing } from 'pages/Landing';
import { PhaseView } from 'pages/PhaseView';

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <ArchiveDataProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/phases" element={<PhaseView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ArchiveDataProvider>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
