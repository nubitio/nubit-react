import { describe, expect, it } from 'vitest';
import {
  buildTreeListModel,
  flattenVisibleTree,
  getDescendantIds,
  getParentIds,
  getSelectionStates,
  reconcileSelection,
} from './treeListModel';

interface Item {
  id: number;
  parentId?: number | null;
  children?: Item[];
}

const options = {
  getId: (item: Item) => item.id,
  getParentId: (item: Item) => item.parentId,
  getChildren: (item: Item) => item.children,
};

describe('buildTreeListModel', () => {
  it('builds a hierarchy from flat parentId records', () => {
    const tree = buildTreeListModel<Item>(
      [{ id: 3, parentId: 1 }, { id: 1 }, { id: 2, parentId: 1 }],
      options,
    );

    expect(tree.map((node) => node.id)).toEqual([1]);
    expect(tree[0].children.map((node) => node.id)).toEqual([3, 2]);
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('normalizes nested children', () => {
    const tree = buildTreeListModel<Item>(
      [{ id: 1, children: [{ id: 2, children: [{ id: 3 }] }] }],
      options,
    );

    expect(flattenVisibleTree(tree, new Set([1, 2])).map((node) => node.id)).toEqual([1, 2, 3]);
    expect(getDescendantIds(tree[0])).toEqual([2, 3]);
  });

  it('rejects duplicate ids and missing parents', () => {
    expect(() => buildTreeListModel<Item>([{ id: 1 }, { id: 1 }], options)).toThrow(/duplicate id/);
    expect(() => buildTreeListModel<Item>([{ id: 2, parentId: 99 }], options)).toThrow(
      /missing parent/,
    );
  });

  it('rejects parentId cycles rather than silently hiding records', () => {
    expect(() =>
      buildTreeListModel<Item>(
        [
          { id: 1, parentId: 2 },
          { id: 2, parentId: 1 },
        ],
        options,
      ),
    ).toThrow(/cycle/);
  });
});

describe('recursive selection', () => {
  // 1 ─ 2, 3 ─ (3 ─ 4, 5)      6 (a leaf root)
  const tree = buildTreeListModel<Item>(
    [{ id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }, { id: 5 }] }] }, { id: 6 }],
    options,
  );

  it('reads membership alone when it is not recursive', () => {
    const states = getSelectionStates(tree, new Set([1]), false);
    expect(states.get(1)).toBe('checked');
    expect(states.get(2)).toBe('unchecked');
  });

  it('derives a parent from its children: all, some or none', () => {
    const all = getSelectionStates(tree, new Set([2, 4, 5]), true);
    expect(all.get(3)).toBe('checked');
    expect(all.get(1)).toBe('checked');

    const some = getSelectionStates(tree, new Set([4]), true);
    expect(some.get(3)).toBe('indeterminate');
    expect(some.get(1)).toBe('indeterminate');
    expect(some.get(2)).toBe('unchecked');

    const none = getSelectionStates(tree, new Set([6]), true);
    expect(none.get(1)).toBe('unchecked');
    expect(none.get(6)).toBe('checked');
  });

  it('ignores the id of a parent that its children contradict', () => {
    expect(getSelectionStates(tree, new Set([1, 3]), true).get(1)).toBe('unchecked');
  });

  it('reconciles parents so a parent is in the set exactly when all of its children are', () => {
    expect([...reconcileSelection(tree, new Set([2, 4, 5])).values()].sort()).toEqual(
      [1, 2, 3, 4, 5].sort(),
    );
    expect([...reconcileSelection(tree, new Set([1, 3, 4])).values()].sort()).toEqual([4]);
  });

  it('lists the nodes that can be expanded', () => {
    expect([...getParentIds(tree)].sort()).toEqual([1, 3]);
  });
});
