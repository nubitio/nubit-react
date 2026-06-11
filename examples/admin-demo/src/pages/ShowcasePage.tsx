import { useState } from 'react';
import {
  AppDialog,
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DatePicker,
  DateRangePicker,
  Drawer,
  EmptyState,
  Skeleton,
  StatCard,
  TextField,
  ThemeSwitcher,
  Toggle,
} from '@nubitio/react-admin';

export function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [date, setDate] = useState('');
  const [range, setRange] = useState<[string, string]>(['', '']);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'auto' }}>
      <Card>
        <h3>Theme</h3>
        <ThemeSwitcher />
      </Card>

      <Card>
        <h3>Buttons & badges</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Badge>Badge</Badge>
          <Chip label="Chip" />
          <Toggle checked={toggled} onChange={setToggled} label="Toggle" />
        </div>
      </Card>

      <Card>
        <h3>Overlays</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button onClick={() => setConfirmOpen(true)}>Open confirm</Button>
          <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
        </div>
      </Card>

      <Card>
        <h3>Dates & inputs</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', maxWidth: 720 }}>
          <DatePicker value={date} onChange={setDate} />
          <DateRangePicker
            startValue={range[0]}
            endValue={range[1]}
            onChange={(start, end) => setRange([start, end])}
          />
          <TextField placeholder="Type here" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard title="Revenue">$12,400</StatCard>
        <StatCard title="Orders">356</StatCard>
        <Card>
          <Skeleton variant="text" lines={3} />
        </Card>
        <Card>
          <EmptyState icon="ph ph-tray" title="Nothing here" description="Empty state component" />
        </Card>
      </div>

      <AppDialog
        title="Demo dialog"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        footer={<Button onClick={() => setDialogOpen(false)}>Close</Button>}
      >
        <p>Dialog body content.</p>
      </AppDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm action"
        message="Are you sure? (English defaults from UiStrings)"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Demo drawer">
        <p>Drawer body content.</p>
      </Drawer>
    </div>
  );
}
