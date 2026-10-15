import { useState } from 'react';
import {
  AppDialog,
  Avatar,
  Badge,
  Button,
  Checkbox,
  RadioGroup,
  Tabs,
  Spinner,
  Progress,
  Combobox,
  MultiSelect,
  Tooltip,
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
  Timeline,
  TimelineItem,
  Toggle,
} from '@nubitio/react-admin';
import type { ComboboxLoader } from '@nubitio/react-admin';
import './ShowcasePage.css';
import { OverlayExamples } from './OverlayExamples';

const countryOptions = [
  { value: 'pe', label: 'Peru' },
  { value: 'cl', label: 'Chile' },
  { value: 'co', label: 'Colombia' },
];
const contacts = [
  { value: 'ada', label: 'Ada Lovelace' },
  { value: 'grace', label: 'Grace Hopper' },
  { value: 'linus', label: 'Linus Torvalds' },
  { value: 'margaret', label: 'Margaret Hamilton' },
];

/** In-memory async provider keeps the showcase usable without a demo server. */
const loadContacts: ComboboxLoader = async (query, { signal, cursor }) => {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 120);
    function abort() {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    }
    signal.addEventListener('abort', abort, { once: true });
  });
  const matching = contacts.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  const offset = Number(cursor ?? 0);
  return {
    options: matching.slice(offset, offset + 2),
    nextCursor: offset + 2 < matching.length ? offset + 2 : null,
  };
};

export function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toggled, setToggled] = useState(true);
  const [date, setDate] = useState('');
  const [range, setRange] = useState<[string, string]>(['', '']);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [updates, setUpdates] = useState(true);
  const [channel, setChannel] = useState('email');
  const [activeTab, setActiveTab] = useState('general');
  const [country, setCountry] = useState<string | null>('pe');
  const [countries, setCountries] = useState(['pe']);
  const [contact, setContact] = useState<string | null>(null);

  return (
    <div className="view-wrapper-scroll">
      <div className="showcase">
        <header className="showcase__header">
          <h1>UI Showcase</h1>
          <p>The @nubitio/ui primitives, styled by the design tokens and the active theme.</p>
        </header>

        <div className="showcase__grid">
          <OverlayExamples />
          <section className="showcase__section">
            <h2>Multiple selection and remote search</h2>
            <MultiSelect
              label="Countries"
              name="countries"
              options={countryOptions}
              value={countries}
              onChange={setCountries}
            />
            <Combobox
              label="Contact"
              options={[]}
              value={contact}
              onChange={setContact}
              loadOptions={loadContacts}
            />
          </section>
          <section className="showcase__section">
            <h2>Searchable selection and tooltips</h2>
            <Combobox
              label="Country"
              name="country"
              value={country}
              onChange={setCountry}
              helpText="Type to filter countries; use arrow keys to choose."
              options={[
                { value: 'pe', label: 'Peru' },
                { value: 'cl', label: 'Chile' },
                { value: 'co', label: 'Colombia' },
                { value: 'ar', label: 'Argentina', disabled: true },
              ]}
            />
            <Tooltip content="Download a copy of your report" delay={0}>
              <Button>Report help</Button>
            </Tooltip>
          </section>
          <section className="showcase__section">
            <h2>Selection controls</h2>
            <Checkbox
              label="Receive updates"
              checked={updates}
              onChange={(event) => setUpdates(event.target.checked)}
            />
            <Checkbox label="Partially selected" indeterminate />
            <Checkbox label="Disabled selection" disabled />
            <RadioGroup
              label="Contact channel"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'phone', label: 'Phone (unavailable)', disabled: true },
              ]}
            />
          </section>
          <section className="showcase__section">
            <h2>Tabs and loading states</h2>
            <Tabs
              aria-label="Account sections"
              value={activeTab}
              onChange={setActiveTab}
              keepMounted
              items={[
                {
                  value: 'general',
                  label: 'General',
                  content: <TextField aria-label="Account name" defaultValue="Nubit" />,
                },
                { value: 'activity', label: 'Activity', content: 'Recent account activity' },
                { value: 'billing', label: 'Billing', content: null, disabled: true },
              ]}
            />
            <div className="showcase__row">
              <Spinner size="sm" />
              <Spinner label="Loading preview" />
              <Spinner size="lg" />
            </div>
            <Progress label="Upload progress" value={65} />
            <Progress label="Preparing report" />
          </section>
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
              <TextField placeholder="Your name" aria-label="Your name" />
              <SelectField defaultValue="" aria-label="Plan">
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
            <CollapsibleSection
              label="Collapsible section"
              open={sectionOpen}
              onToggle={() => setSectionOpen((v) => !v)}
            >
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
            <h2>Timelines</h2>
            <Timeline variant="stepper" orientation="horizontal" aria-label="Checkout steps">
              <TimelineItem status="complete" title="Cart" marker={<i className="ph ph-check" />} />
              <TimelineItem
                status="complete"
                title="Shipping"
                marker={<i className="ph ph-check" />}
              />
              <TimelineItem status="current" title="Payment" marker="3" />
              <TimelineItem status="pending" title="Confirmation" marker="4" />
            </Timeline>
            <div className="showcase__row" style={{ alignItems: 'flex-start', gap: 24 }}>
              <Timeline
                variant="stepper"
                title="F001-672"
                description="Document lifecycle"
                aria-label="Document lifecycle"
              >
                <TimelineItem status="complete" title="Draft created" />
                <TimelineItem status="complete" title="Sent to tax authority" />
                <TimelineItem status="current" title="Awaiting acknowledgement" />
                <TimelineItem status="error" title="Rejected · code 2017" />
              </Timeline>
              <Timeline
                variant="log"
                title="ACME Corp"
                description="Change history"
                aria-label="Change history"
              >
                <TimelineItem
                  status="complete"
                  tone="info"
                  title="jane@example.com"
                  timestamp="6/12/2026, 8:23 AM"
                  dateTime="2026-06-12T08:23:00"
                >
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    Phone: <s style={{ color: 'var(--error-color)' }}>903 303 704</s> →{' '}
                    <span style={{ color: 'var(--success-color)' }}>999 888 777</span>
                  </p>
                </TimelineItem>
                <TimelineItem
                  status="complete"
                  tone="success"
                  title="jane@example.com"
                  timestamp="6/11/2026, 4:02 PM"
                  dateTime="2026-06-11T16:02:00"
                >
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Record created</p>
                </TimelineItem>
              </Timeline>
            </div>
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

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Demo drawer"
        width={420}
      >
        <p style={{ marginTop: 0 }}>Drawers slide in from the side and keep the page visible.</p>
        <Skeleton variant="text" lines={4} />
      </Drawer>
    </div>
  );
}
