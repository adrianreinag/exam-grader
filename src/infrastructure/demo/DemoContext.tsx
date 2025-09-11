"use client";

import { createContext, useContext, ReactNode } from "react";

const DemoContext = createContext<boolean>(false);

export function DemoStatusProvider({ isDemo, children }: { isDemo: boolean; children: ReactNode; }) {
    return <DemoContext.Provider value={isDemo}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);