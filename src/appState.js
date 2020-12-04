import React, { createContext, useContext, useState } from 'react'

export const StateContext = createContext({});

export default function AppStateProvider(props) {
  const [authenticated, setAuthenticated] = useState(false);
  let contextValue = {
    authenticated,
    setAuthenticated
  }
  return <StateContext.Provider value={{ ...contextValue }}>{props.children}</StateContext.Provider>;
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within the AppStateProvider');
  }
  return context;
}