/**
 * The HTML Field-Type module.
 *
 * This one carries a structural constraint the other field types do not: TipTap
 * is an optional peer, so the editor is loaded lazily and reached through a
 * namespace import. That keeps three packages out of every consumer's build,
 * and it is exactly the kind of arrangement that rots silently — a stray static
 * import anywhere in the chain puts TipTap back in the entry and nothing fails
 * until someone else's build breaks.
 *
 * So the control test here is not decoration: awaiting the editor is the only
 * thing that proves the lazy boundary still resolves.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { FieldType } from '../../FieldType';
import { getFieldTypeModule } from '../registry';
import type { Field } from '../../Field';
import type { FieldControlProps } from '../FieldTypeModule';

const mod = getFieldTypeModule(FieldType.HTML);

const field = (): Field => ({ name: 'body', label: 'Body', type: FieldType.HTML }) as Field;

describe('HTML field type', () => {
  it('reduces stored markup to plain text for the grid and the filter', () => {
    // The cell shows text, not tags: a title with markup must still sort and
    // filter as the words a person would search for.
    expect(mod.cellText(field(), '<p>Hello <b>world</b></p>', {} as never)).toBe('Hello world');
    expect(mod.cellText(field(), 'no tags here', {} as never)).toBe('no tags here');
    expect(mod.cellText(field(), null, {} as never)).toBe('');
  });

  it('renders stored markup in the grid cell', () => {
    render(<>{mod.CellRender?.({ value: '<em>italic</em>' } as never)}</>);
    expect(screen.getByText('italic')).toBeTruthy();
  });

  it('loads the TipTap editor lazily, so the peer stays optional', async () => {
    const setFieldValue = vi.fn();
    const props: FieldControlProps = {
      field: field(),
      value: '<p>draft</p>',
      error: undefined,
      errorClass: '',
      disabled: undefined,
      readOnly: false,
      commonProps: { name: 'body', id: 'body' } as never,
      setFieldValue,
      ctx: {} as never,
    };

    // The Suspense boundary is required, not decorative: without it React
    // throws on the lazy element. Vitest resolves the dynamic import from the
    // module graph, so the fallback may never paint — what matters is that the
    // editor arrives through it.
    render(<Suspense fallback={<span>loading</span>}>{mod.ControlRender(props)}</Suspense>);

    await waitFor(() => expect(document.querySelector('.nb-html-editor')).toBeTruthy());
  });

  it('formats through the toolbar and reports the markup back', async () => {
    const setFieldValue = vi.fn();
    const props: FieldControlProps = {
      field: field(),
      value: '<p>draft</p>',
      error: undefined,
      errorClass: '',
      disabled: undefined,
      readOnly: false,
      commonProps: { name: 'body', id: 'body' } as never,
      setFieldValue,
      ctx: {} as never,
    };

    render(<Suspense fallback={null}>{mod.ControlRender(props)}</Suspense>);
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeTruthy());

    // Every button runs a TipTap chain against the live editor; clicking them
    // is what proves the lazy module is a working editor and not just a shell
    // that mounted.
    for (const title of ['Bold (Ctrl+B)', 'Italic (Ctrl+I)', 'Strikethrough', 'Heading 2']) {
      fireEvent.click(screen.getByTitle(title));
    }

    await waitFor(() => expect(setFieldValue).toHaveBeenCalled());
    const [name, html] = setFieldValue.mock.calls.at(-1) as [string, string];
    expect(name).toBe('body');
    expect(typeof html).toBe('string');
  });
});
