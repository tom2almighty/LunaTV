type RefreshConfig = () => Promise<void>;

type ShowAlert = (options: {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  showConfirm?: boolean;
  timer?: number;
}) => void;

type AddUserPayload = {
  username: string;
  password: string;
  userGroup?: string;
};

export function useUserConfigActions(
  refreshConfig: RefreshConfig,
  showAlert: ShowAlert,
) {
  const addUser = async (payload: AddUserPayload) => {
    const { username, password, userGroup } = payload;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        userGroup,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error || `操作失败: ${res.status}`;
      showAlert({
        type: 'error',
        title: '错误',
        message,
        showConfirm: true,
      });
      throw new Error(message);
    }

    await refreshConfig();
  };

  return {
    addUser,
  };
}
