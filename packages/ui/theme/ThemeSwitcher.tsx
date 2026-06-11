import React from 'react';
import { IconButton } from '../Button';
import { useTheme } from './ThemeProvider';

const iconByMode = {
  light: 'ph ph-sun',
  dark: 'ph ph-moon',
  auto: 'ph ph-desktop',
} as const;

const labelByMode = {
  light: 'Theme: Light',
  dark: 'Theme: Dark',
  auto: 'Theme: System',
} as const;

export interface ThemeSwitcherProps {
  labelByMode?: Partial<Record<keyof typeof labelByMode, string>>;
}

export const ThemeSwitcher = ({ labelByMode: overrides }: ThemeSwitcherProps = {}) => {
  const { mode, switchTheme } = useTheme();
  const labels = { ...labelByMode, ...overrides };
  const label = labels[mode];

  return (
    <div>
      <IconButton
        className="theme-button"
        icon={iconByMode[mode]}
        label={label}
        onClick={switchTheme}
      />
    </div>
  );
};
