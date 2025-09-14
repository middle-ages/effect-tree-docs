/**
 * Counting nodes and tree levels.
 * @packageDocumentation
 */
import {
  treeCata,
  treeCataEffect,
  type Tree,
  type TreeEffectFolderOf,
  type TreeFold,
  type TreeFolder,
  type TreeFolderOf,
  type TreeFoldOf,
} from '#tree'
import * as TreeF from '#treeF'
import {Effect, Number, pipe, Predicate} from 'effect'
import {constFalse, constTrue} from 'effect/Function'

/** Compute how many nodes in a tree satisfy the given `predicate`. */
export const countOf = <A>(
  predicate: Predicate.Predicate<A>,
): TreeFold<A, number> => pipe(predicate, countOfFold, treeCata)

/**
 * Count total node count at level.
 * @category fold
 */
export const descendantCountFold: TreeFolderOf<number> = TreeF.match({
  onLeaf: () => 1,
  onBranch: (_, forest) => Number.sumAll(forest) + 1,
})

/**
 * Measure max node height from its deepest descendant at tree level.
 * @category fold
 */
export const maximumHeightFold: TreeFolderOf<number> = TreeF.match({
  onLeaf: () => 1,
  onBranch: (_, forest) => Math.max(...forest) + 1,
})

/**
 * Measure max node degree at a tree level.
 * @category fold
 */
export const maximumDegreeFold: TreeFolderOf<number> = TreeF.match({
  onLeaf: () => 0,
  onBranch: (_, forest) => Math.max(forest.length, ...forest),
})

/**
 * Measure node degree at a tree level.
 * @category fold
 */
export const degreeFold: TreeFolderOf<number> = TreeF.length

/**
 * Count tree nodes of a tree level that satisfy the given predicate.
 * @category fold
 */
export const countOfFold = <A>(
  predicate: Predicate.Predicate<A>,
): TreeFolder<A, number> =>
  TreeF.match({
    onLeaf: value => (predicate(value) ? 1 : 0),
    onBranch: (value, forest) =>
      (predicate(value) ? 1 : 0) + Number.sumAll(forest),
  })

/**
 * Count all nodes that are descendants of the root node and the root node
 * itself.
 */
export const nodeCount: TreeFoldOf<number> = self =>
  pipe(self, treeCata(descendantCountFold))

/** Compute the maximum node depth of all nodes in a tree. */
export const maximumNodeHeight: TreeFoldOf<number> = self =>
  pipe(self, treeCata(maximumHeightFold))

/** Compute the maximum child count of any node in the tree. */
export const maximumNodeDegree: TreeFoldOf<number> = self =>
  pipe(self, treeCata(maximumDegreeFold))

/** Fails if node count is at least the given number. */
export const nodeCountAtLeastFold: (
  atLeast: number,
) => TreeEffectFolderOf<number, void> = atLeast => self => {
  const nodeCount = descendantCountFold(self)
  return nodeCount >= atLeast ? Effect.fail({}) : Effect.succeed(nodeCount)
}

/**
 * True if node count is at least the given number.  Will short-circuit when
 * condition is reached rather than traverse entire tree.
 */
export const nodeCountAtLeast =
  (atLeast: number) =>
  <A>(self: Tree<A>): boolean =>
    pipe(
      self,
      treeCataEffect(nodeCountAtLeastFold(atLeast)<A>),
      Effect.match({
        onFailure: constTrue,
        onSuccess: constFalse,
      }),
      Effect.runSync,
    )
