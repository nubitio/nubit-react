import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Timeline, TimelineItem } from './Timeline';

afterEach(cleanup);

describe('Timeline', () => {
  it('renders stepper items with title and timestamps', () => {
    render(
      <Timeline variant="stepper" title="Status timeline" description="Document lifecycle widget.">
        <TimelineItem status="complete" title="Draft created" timestamp="20/04/2026 09:14" />
        <TimelineItem status="current" title="Awaiting CDR" />
        <TimelineItem status="pending" title="Accepted" />
      </Timeline>,
    );

    expect(screen.getByText('Status timeline')).toBeDefined();
    expect(screen.getByText('Document lifecycle widget.')).toBeDefined();
    expect(screen.getByText('Draft created')).toBeDefined();
    expect(screen.getByText('20/04/2026 09:14')).toBeDefined();
    expect(screen.getByText('Awaiting CDR')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
  });

  it('renders log variant children', () => {
    render(
      <Timeline variant="log" aria-label="Change history">
        <TimelineItem status="complete" tone="info" title="Updated">
          <p>Field diff</p>
        </TimelineItem>
      </Timeline>,
    );

    expect(screen.getByLabelText('Change history')).toBeDefined();
    expect(screen.getByText('Updated')).toBeDefined();
    expect(screen.getByText('Field diff')).toBeDefined();
  });
});