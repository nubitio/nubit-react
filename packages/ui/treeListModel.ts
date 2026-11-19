export type TreeNodeId = string | number;

export interface TreeNode<T> {
  id: TreeNodeId;
  item: T;
  children: TreeNode<T>[];
  depth: number;
}

export interface TreeListModelOptions<T> {
  getId: (item: T) => TreeNodeId;
  getParentId?: (item: T) => TreeNodeId | null | undefined;
  getChildren?: (item: T) => readonly T[] | null | undefined;
}

/**
 * Normalizes either nested records or a flat parentId collection into a
 * deterministic tree. A record may not be supplied through both relationships.
 */
export function buildTreeListModel<T>(
  items: readonly T[],
  options: TreeListModelOptions<T>,
): TreeNode<T>[] {
  const { getId, getParentId, getChildren } = options;
  const records = new Map<TreeNodeId, T>();
  const nestedChildren = new Map<TreeNodeId, TreeNodeId[]>();

  const visitNested = (item: T, ancestors: Set<TreeNodeId>): void => {
    const id = getId(item);
    if (records.has(id)) throw new Error(`TreeList contains duplicate id "${id}".`);
    if (ancestors.has(id)) throw new Error(`TreeList contains a cycle at id "${id}".`);

    records.set(id, item);
    const children = getChildren?.(item) ?? [];
    const nextAncestors = new Set(ancestors).add(id);
    const childIds: TreeNodeId[] = [];
    for (const child of children) {
      const childId = getId(child);
      childIds.push(childId);
      visitNested(child, nextAncestors);
    }
    nestedChildren.set(id, childIds);
  };

  for (const item of items) visitNested(item, new Set());

  const nestedIds = new Set<TreeNodeId>();
  for (const ids of nestedChildren.values()) {
    for (const id of ids) nestedIds.add(id);
  }

  const parentById = new Map<TreeNodeId, TreeNodeId | null>();
  for (const [id, item] of records) {
    const parentId = getParentId?.(item);
    if (parentId != null && nestedIds.has(id)) {
      throw new Error(`TreeList record "${id}" has both nested and parentId relationships.`);
    }
    parentById.set(id, parentId == null ? null : parentId);
  }
  for (const [parentId, childIds] of nestedChildren) {
    for (const childId of childIds) parentById.set(childId, parentId);
  }

  const childrenByParent = new Map<TreeNodeId | null, TreeNodeId[]>();
  for (const [id, parentId] of parentById) {
    if (parentId != null && !records.has(parentId)) {
      throw new Error(`TreeList record "${id}" refers to missing parent "${parentId}".`);
    }
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(id);
    childrenByParent.set(parentId, siblings);
  }

  const visiting = new Set<TreeNodeId>();
  const built = new Map<TreeNodeId, TreeNode<T>>();
  const makeNode = (id: TreeNodeId, depth: number): TreeNode<T> => {
    if (visiting.has(id)) throw new Error(`TreeList contains a parentId cycle at id "${id}".`);
    const existing = built.get(id);
    if (existing) return existing;
    visiting.add(id);
    const node: TreeNode<T> = {
      id,
      item: records.get(id) as T,
      depth,
      children: (childrenByParent.get(id) ?? []).map((childId) => makeNode(childId, depth + 1)),
    };
    visiting.delete(id);
    built.set(id, node);
    return node;
  };

  const roots = childrenByParent.get(null) ?? [];
  const result = roots.map((id) => makeNode(id, 0));
  if (built.size !== records.size) {
    const orphanedCycle = [...records.keys()].find((id) => !built.has(id));
    throw new Error(`TreeList contains an unreachable parentId cycle at id "${orphanedCycle}".`);
  }
  return result;
}

export function flattenVisibleTree<T>(
  roots: readonly TreeNode<T>[],
  expandedIds: ReadonlySet<TreeNodeId>,
): TreeNode<T>[] {
  const visible: TreeNode<T>[] = [];
  const visit = (node: TreeNode<T>): void => {
    visible.push(node);
    if (expandedIds.has(node.id)) node.children.forEach(visit);
  };
  roots.forEach(visit);
  return visible;
}

export function getDescendantIds<T>(node: TreeNode<T>): TreeNodeId[] {
  const ids: TreeNodeId[] = [];
  const visit = (current: TreeNode<T>): void => {
    for (const child of current.children) {
      ids.push(child.id);
      visit(child);
    }
  };
  visit(node);
  return ids;
}
