import { describe, expect, it } from 'vitest';
import { buildTreeListModel, flattenVisibleTree, getDescendantIds } from './treeListModel';

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
