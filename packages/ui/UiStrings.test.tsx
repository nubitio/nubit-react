import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DensityProvider } from './theme/DensityProvider';
import { FeatureGate } from './FeatureGate';
import { SettingsPanel } from './SettingsPanel';
import { EN_UI_STRINGS, ES_UI_STRINGS, UiStringsProvider } from './UiStrings';

describe('UiStrings', () => {
  it('ships the same keys in English and Spanish, none of them empty', () => {
    expect(Object.keys(ES_UI_STRINGS).sort()).toEqual(Object.keys(EN_UI_STRINGS).sort());
    for (const [key, value] of Object.entries({ ...EN_UI_STRINGS, ...ES_UI_STRINGS })) {
      expect(value, key).not.toBe('');
    }
  });

  it('localizes the display-settings panel instead of mixing languages', () => {
    const { rerender } = render(
      <DensityProvider>
        <SettingsPanel />
      </DensityProvider>,
    );
    expect(screen.getByRole('menu', { name: 'Display settings' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Accent colors' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Interface density' })).toBeTruthy();

    rerender(
      <DensityProvider>
        <UiStringsProvider strings={ES_UI_STRINGS}>
          <SettingsPanel />
        </UiStringsProvider>
      </DensityProvider>,
    );
    expect(screen.getByRole('menu', { name: 'Ajustes de visualización' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Colores de acento' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Densidad de interfaz' })).toBeTruthy();
  });

  it('localizes the locked-feature tooltip, and lets the prop win', () => {
    const { rerender } = render(
      <UiStringsProvider strings={ES_UI_STRINGS}>
        <FeatureGate featureKey="reports">x</FeatureGate>
      </UiStringsProvider>,
    );
    expect(screen.getByTitle('Esta función no está disponible en tu plan actual.')).toBeTruthy();

    rerender(
      <UiStringsProvider strings={ES_UI_STRINGS}>
        <FeatureGate featureKey="reports" lockTooltip="Custom">
          x
        </FeatureGate>
      </UiStringsProvider>,
    );
    expect(screen.getByTitle('Custom')).toBeTruthy();
  });
});
