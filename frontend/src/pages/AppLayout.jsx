import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppNav } from 'components/AppNav';

export function AppLayout() {
  return (
    <>
      <AppNav />
      <Outlet />
    </>
  );
}
