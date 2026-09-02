import { useState, useEffect } from 'react';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>({
    id: 'usr-admin-1',
    name: 'Inspector Vikram Rao',
    email: 'admin@crimeintel.demo',
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  return { user, loading, isAuthenticated: !!user };
}
