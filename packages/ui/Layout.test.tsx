import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';
import { Col } from './Col';
import { Grid } from './Grid';
import { Page } from './Page';
import { PageHeader } from './PageHeader';
import { Stack } from './Stack';

describe('layout kit', () => {
  it('renders Page with header and grid columns', () => {
    render(
      <Page data-testid="tenants-page">
        <PageHeader title="Tenants" subtitle="Manage tenants" />
        <Grid cols={12} data-testid="tenant-grid">
          <Col spanMd={4}>sidebar</Col>
          <Col spanMd={8}>main</Col>
        </Grid>
      </Page>,
    );

    expect(screen.getByTestId('tenants-page')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tenants' })).toBeTruthy();
    expect(screen.getByText('Manage tenants')).toBeTruthy();
    expect(screen.getByTestId('tenant-grid').className).toContain('nb-grid--cols-12');
    expect(screen.getByText('sidebar').className).toContain('nb-col--span-md-4');
    expect(screen.getByText('main').className).toContain('nb-col--span-md-8');
  });

  it('renders alert tones and stack gap class', () => {
    render(
      <Stack gap={3} data-testid="stack">
        <Alert tone="danger">Failed to load</Alert>
      </Stack>,
    );

    expect(screen.getByTestId('stack').className).toContain('nb-stack--gap-3');
    expect(screen.getByRole('alert').className).toContain('nb-alert--danger');
    expect(screen.getByText('Failed to load')).toBeTruthy();
  });
});