import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/api/auth';
import { useAuth } from '@/features/auth/AuthContext';

export function useLogin() {
  const { setAuthenticated } = useAuth();
  return useMutation({
    mutationFn: async (password: string) => {
      const token = await login(password);
      if (!token) throw new Error('密码错误');
      return token;
    },
    onSuccess: (token) => {
      setAuthenticated(true, token);
    },
  });
}
