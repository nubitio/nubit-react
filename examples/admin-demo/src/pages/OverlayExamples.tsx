import { useState } from 'react';
import {
  AppDialog,
  AppDropdown,
  Button,
  Checkbox,
  Combobox,
  ConfirmDialog,
  ContextMenu,
  DatePicker,
  DateRangePicker,
  Drawer,
  Popover,
  SearchableAppDropdown,
  TextField,
  Tooltip,
} from '@nubitio/react-admin';

const options = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review', disabled: true },
  { value: 'published', label: 'Published' },
];

/** Interactive nesting examples double as the browser regression surface. */
export function OverlayExamples() {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [escape, setEscape] = useState(true);
  const [outside, setOutside] = useState(true);
  const [status, setStatus] = useState('draft');
  const [country, setCountry] = useState<string | null>(null);
  const [date, setDate] = useState('2026-10-15');
  const [range, setRange] = useState<[string, string]>(['', '']);
  const [action, setAction] = useState('No action');
  return (
    <section className="showcase__section">
      <h2>Nested overlays</h2>
      <Button onClick={() => setOpen(true)}>Open overlay playground</Button>
      <p>Keyboard navigation, nested menus and modal focus boundaries.</p>
      <AppDialog
        title="Overlay playground"
        open={open}
        onClose={() => setOpen(false)}
        keepMounted
        width={560}
        closeOnEscape={escape}
        closeOnOutsideClick={outside}
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <div className="showcase__stack">
          <TextField aria-label="Working title" defaultValue="Quarterly report" />
          <Combobox
            label="Destination"
            options={[
              { value: 'pe', label: 'Peru' },
              { value: 'cl', label: 'Chile' },
            ]}
            value={country}
            onChange={setCountry}
          />
          <AppDropdown
            label="Publication status"
            options={options}
            value={status}
            onChange={setStatus}
          />
          <SearchableAppDropdown
            label="Search status"
            options={options}
            value={status}
            onChange={setStatus}
          />
          <DatePicker ariaLabel="Publication date" value={date} onChange={setDate} />
          <DateRangePicker
            ariaLabel="Publication window"
            startValue={range[0]}
            endValue={range[1]}
            onChange={(start, end) => setRange([start, end])}
          />
          <div className="showcase__row">
            <Tooltip content="Only this report will be updated" delay={0}>
              <Button>Report scope</Button>
            </Tooltip>
            <ContextMenu
              triggerLabel="Report actions"
              items={[
                { label: 'Preview report', onClick: () => setAction('Preview selected') },
                { label: 'Unavailable action', disabled: true },
                {
                  label: 'Archive report',
                  separator: true,
                  onClick: () => setAction('Archive selected'),
                },
              ]}
            />
            <Popover
              ariaLabel="Report details"
              trigger={({ open, toggle }) => (
                <Button aria-expanded={open} onClick={toggle}>
                  Report details
                </Button>
              )}
              panel={({ close }) => (
                <div style={{ padding: 16 }}>
                  <TextField aria-label="Report note" />
                  <Button onClick={close}>Close details</Button>
                </div>
              )}
            />
          </div>
          <p role="status">{action}</p>
          <Checkbox
            label="Close with Escape"
            checked={escape}
            onChange={(event) => setEscape(event.target.checked)}
          />
          <Checkbox
            label="Close on backdrop"
            checked={outside}
            onChange={(event) => setOutside(event.target.checked)}
          />
          <Button onClick={() => setDrawer(true)}>Open nested drawer</Button>
          <Drawer
            title="Nested drawer"
            isOpen={drawer}
            onClose={() => setDrawer(false)}
            width={420}
            footer={<Button onClick={() => setDrawer(false)}>Back to report</Button>}
          >
            <TextField aria-label="Drawer note" />
            <Combobox
              label="Drawer destination"
              options={[
                { value: 'pe', label: 'Peru' },
                { value: 'cl', label: 'Chile' },
              ]}
              value={country}
              onChange={setCountry}
            />
            <Button onClick={() => setConfirm(true)}>Confirm changes</Button>
            <ConfirmDialog
              open={confirm}
              title="Apply report changes"
              message="Apply these changes to this report?"
              onCancel={() => setConfirm(false)}
              onConfirm={() => setConfirm(false)}
            />
          </Drawer>
        </div>
      </AppDialog>
    </section>
  );
}
