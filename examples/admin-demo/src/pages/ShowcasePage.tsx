import { useState } from 'react';
import {
  AppDialog,
  Avatar,
  Badge,
  Button,
  Chip,
  CollapsibleSection,
  ConfirmDialog,
  DatePicker,
  DateRangePicker,
  Drawer,
  EmptyState,
  IconButton,
  SelectField,
  Skeleton,
  StatCard,
  TextAreaField,
  TextField,
  ThemeSwitcher,
  Toggle,
} from '@nubitio/react-admin';
import './ShowcasePage.css';

export function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toggled, setToggled] = useState(true);
  const [date, setDate] = useState('');
  const [range, setRange] = useState<[string, string]>(['', '']);
  const [sectionOpen, setSectionOpen] = useState(false);

  return (
    <div className="view-wrapper-scroll">
      <div className="showcase">
        <header className="showcase__header">
          <h1>UI Showcase</h1>
          <p>The @nubitio/ui primitives, styled by the design tokens and the active theme.</p>
        </header>

        <div className="showcase__grid">
          <section className="showcase__section">
            <h2>Buttons</h2>
            <div className="showcase__row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <IconButton icon="ph ph-gear" label="Settings" />
            </div>
            <div className="showcase__row">
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="primary">
                <i className="ph ph-plus" /> With icon
              </Button>
            </div>
          </section>

          <section className="showcase__section">
            <h2>Badges, chips &amp; avatars</h2>
            <div className="showcase__row">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
            <div className="showcase__row">
              <Chip label="All" active />
              <Chip label="Pending" count={3} />
              <Chip label="Archived" icon="ph ph-archive" />
            </div>
            <div className="showcase__row">
              <Avatar owner="Johan Guerreros" />
              <Avatar owner="Ada Lovelace" />
              <Avatar owner="Grace Hopper" />
              <Toggle checked={toggled} onChange={setToggled} label="Notifications" />
            </div>
          </section>

          <section className="showcase__section">
            <h2>Form controls</h2>
            <div className="showcase__stack">
              <TextField placeholder="Your name" />
              <SelectField defaultValue="">
                <option value="" disabled>
                  Choose a plan…
                </option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </SelectField>
              <TextAreaField placeholder="Notes…" rows={2} />
            </div>
          </section>

          <section className="showcase__section">
            <h2>Dates</h2>
            <div className="showcase__stack">
              <DatePicker value={date} onChange={setDate} />
              <DateRangePicker
                startValue={range[0]}
                endValue={range[1]}
                onChange={(start, end) => setRange([start, end])}
              />
            </div>
          </section>

          <section className="showcase__section">
            <h2>Overlays</h2>
            <div className="showcase__row">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Dialog
              </Button>
              <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
                Drawer
              </Button>
            </div>
            <CollapsibleSection label="Collapsible section" open={sectionOpen} onToggle={() => setSectionOpen((v) => !v)}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Hidden content lives here — useful for advanced filters or settings.
              </p>
            </CollapsibleSection>
          </section>

          <section className="showcase__section">
            <h2>Feedback</h2>
            <Skeleton variant="text" lines={3} />
            <EmptyState
              icon="ph ph-tray"
              title="Nothing here yet"
              description="Empty state with icon, title and description."
            />
          </section>

          <section className="showcase__section showcase__section--wide">
            <h2>Stat cards</h2>
            <div className="showcase__stats">
              <StatCard title="Revenue (month)">
                <div className="showcase__stat-value">$12,480</div>
                <div className="showcase__stat-trend">▲ 12.4% vs last month</div>
              </StatCard>
              <StatCard title="Orders">
                <div className="showcase__stat-value">356</div>
                <div className="showcase__stat-trend">▲ 4.1%</div>
              </StatCard>
              <StatCard title="Active customers">
                <div className="showcase__stat-value">1,209</div>
              </StatCard>
              <StatCard title="Loading state" isLoading>
                <div className="showcase__stat-value">—</div>
              </StatCard>
            </div>
          </section>

          <section className="showcase__section">
            <h2>Theme</h2>
            <div className="showcase__row">
              <ThemeSwitcher />
              <span style={{ color: 'var(--text-secondary)' }}>
                Cycles light / dark / system — every component re-themes from the tokens.
              </span>
            </div>
          </section>
        </div>
      </div>

      <AppDialog
        title="Demo dialog"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Accept
            </Button>
          </>
        }
      >
        <p>Dialogs trap focus, close on Escape, and restore focus on close.</p>
      </AppDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete record"
        message="This action cannot be undone."
        variant="danger"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Demo drawer" width={420}>
        <p style={{ marginTop: 0 }}>Drawers slide in from the side and keep the page visible.</p>
        <Skeleton variant="text" lines={4} />
      </Drawer>
    </div>
  );
}
