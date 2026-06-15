import { createContext, useContext, ReactNode } from "react";

export type DemoMode = "enterprise" | "regional" | null;

export type DemoConfig = {
  mode: DemoMode;
  plantId: string | null;
  plantName: string | null;
  isDemo: boolean;
};

const DemoContext = createContext<DemoConfig>({
  mode: null,
  plantId: null,
  plantName: null,
  isDemo: false,
});

// Plant IDs — must match seed data
export const DEMO_PLANT_IDS = {
  enterprise: "e0000000-0000-0000-0000-000000000001",
  regional:   "f47ac10b-58cc-4372-a567-0e02b2c3d479", // existing Riverbank Meats
};

export const DEMO_PLANT_NAMES = {
  enterprise: "Southern Cross Meats — Toowoomba",
  regional:   "Riverbank Meats — Dubbo",
};

export function DemoProvider({
  mode,
  children,
}: {
  mode: DemoMode;
  children: ReactNode;
}) {
  const config: DemoConfig = {
    mode,
    plantId: mode ? DEMO_PLANT_IDS[mode] : null,
    plantName: mode ? DEMO_PLANT_NAMES[mode] : null,
    isDemo: mode !== null,
  };

  return <DemoContext.Provider value={config}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  return useContext(DemoContext);
}
