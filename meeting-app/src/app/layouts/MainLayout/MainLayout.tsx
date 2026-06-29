import { Outlet } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader/AppHeader";

export const MainLayout = () => {
  return (
    <>
      <AppHeader />

      <Outlet />
    </>
  );
};
