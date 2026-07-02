import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGate } from 'components/AuthGate';
import { ArchiveDataProvider } from 'context/ArchiveDataContext';
import { PhaseView } from 'pages/PhaseView';

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <ArchiveDataProvider>
          <Routes>
            <Route path="*" element={<PhaseView />} />
          </Routes>
        </ArchiveDataProvider>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
