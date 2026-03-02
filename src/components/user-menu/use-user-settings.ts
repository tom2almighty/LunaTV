import { useState } from 'react';

export function useUserSettings() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
  };
}
