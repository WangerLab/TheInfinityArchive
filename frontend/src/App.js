import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGate } from 'components/AuthGate';
import { ArchiveDataProvider } from 'context/ArchiveDataContext';
import { Landing } from 'pages/Landing';
import { AppLayout } from 'pages/AppLayout';
import { PhaseView } from 'pages/PhaseView';
import { Archive } from 'pages/Archive';
import { MapView } from 'pages/MapView';
import { Strategium } from 'pages/Strategium';
import { ServiceRecord } from 'pages/ServiceRecord';
import { BookDetail } from 'pages/BookDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <ArchiveDataProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<AppLayout />}>
              <Route path="/phases" element={<PhaseView />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/strategium" element={<Strategium />} />
              <Route path="/record" element={<ServiceRecord />} />
              <Route path="/book/:entryId" element={<BookDetail />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ArchiveDataProvider>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
