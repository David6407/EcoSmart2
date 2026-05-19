import { createContext, useContext } from 'react';

export const UserContext = createContext({
  currentUser: null,
  isDark: false,
  selectedReportId: null,
  selectedReport: null,
  setSelectedReportId: () => {},
  setSelectedReport: () => {},
  reloadUser: async () => {},
  saveProfile: async () => ({ ok: false, message: 'No disponible.' }),
  logout: async () => {},
});

export function UserProvider({ value, children }) {
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
