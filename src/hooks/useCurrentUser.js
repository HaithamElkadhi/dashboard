import { useAuth } from '../contexts/AuthContext.jsx';


export function useCurrentUser() {
  const { user } = useAuth();
  return [user?.displayName || user?.username || ''];
}
