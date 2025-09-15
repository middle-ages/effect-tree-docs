import {
  branchF,
  getBranchForest as getBranchForestF,
  getValue as getValueF,
  isLeaf as isLeafF,
  leafF,
  treeF,
  type BranchF,
  type TreeF,
  type TreeFTypeLambda,
} from '#treeF'
import {K, Pair} from '#util'
import {Array, flow, Function, pipe} from 'effect'
import {fix, unfix} from 'effect-ts-folds'
import {isNone, none, type Option} from 'effect/Option'
import type {Branch, ForestOf, Leaf, Matcher, Tree} from './types.js'

export const [fixTree, unfixTree]: [
  <A>(treeF: TreeF<A, Tree<A>>) => Tree<A>,
  <A>(fixed: Tree<A>) => TreeF<A, Tree<A>>,
] = [fix, unfix]

/**
 * Like {@link fixTree} but exclusively for branches.
 * @category basic
 */
export const fixBranch = fix<TreeFTypeLambda> as <A>(
  branchF: BranchF<A, Tree<A>>,
) => Branch<A>

/**
 * Like {@link unfixTree} but exclusively for branches.
 * @category basic
 */
export const unfixBranch = unfix<TreeFTypeLambda> as <A>(
  branchF: Branch<A>,
) => BranchF<A, Tree<A>>

/**
 * Create a new leaf from its value.
 * @typeParam A - Tree type.
 * @param value - The tree root value.
 * @returns A new leaf with the given value.
 * @category basic
 */
export const leaf = flow(leafF, fixTree) as <A>(value: A) => Leaf<A>

/**
 * Create a new branch from its value and a non-empty list of child nodes.
 * child nodes.
 * @typeParam A - Tree type.
 * @param value - The tree root value.
 * @param forest - A non-empty list of child nodes, all of the same type as this
 * parent node.
 * @returns A new branch with the given value and forest.
 * @category basic
 */
export const branch: {
  <A>(value: A, forest: ForestOf<A>): Branch<A>
  <A>(forest: ForestOf<A>): (value: A) => Branch<A>
  flip: <A>(value: A) => (forest: ForestOf<A>) => Branch<A>
} = Object.assign(
  Function.dual(2, <A>(value: A, forest: ForestOf<A>) =>
    fixBranch(branchF<A, Tree<A>>(value, forest)),
  ),
  {
    flip:
      <A>(value: A) =>
      (forest: ForestOf<A>) =>
        fixBranch(branchF<A, Tree<A>>(value, forest)),
  },
)

/**
 * Create a new `Tree` from a node value and a possibly empty list of
 * child nodes.
 * @typeParam A - Tree type.
 * @param value - The tree root value.
 * @param forest - A possibly empty or missing list of child nodes, all of the
 * same type as this parent node.
 * @returns A new tree with the given value and possibly empty forest.
 * @category basic
 */
export const tree: {
  <A>(value: A, forest?: readonly Tree<A>[]): Tree<A>
  <A>(forest?: readonly Tree<A>[]): (value: A) => Tree<A>
} = Function.dual(
  2,
  <A>(value: A, forest: readonly Tree<A>[] = []): Tree<A> =>
    Array.isNonEmptyReadonlyArray(forest) ? branch(value, forest) : leaf(value),
)

/**
 * A curried version of {@link tree}.
 * @category basic
 */
export const treeC =
  <A>(forest: Tree<A>[]): ((value: A) => Tree<A>) =>
  value =>
    tree(value, forest)

/**
 * A flipped version of {@link tree}.
 * @category basic
 */
export const withForest: {
  <A>(forest: Tree<A>[], value: A): Tree<A>
  <A>(value: A): (forest: Tree<A>[]) => Tree<A>
} = Function.dual(
  2,
  <A>(forest: ForestOf<A>, value: A): Tree<A> => tree(value, forest),
)

/** A version of {@link tree} where the forest is a rest argument. */
export const from = <A>(value: A, ...forest: Tree<A>[]): Tree<A> =>
  tree(value, forest)

/**
 * Type guard for the tree {@link Leaf} type.
 * @typeParam A - Tree type.
 * @param self - The tree being queried.
 * @returns Numeric child count.
 * @category basic
 */
export const isLeaf = <A>(self: Tree<A>): self is Leaf<A> =>
  isLeafF(self.unfixed)

/**
 * Type guard for the tree {@link Branch} type.
 * @typeParam A - Tree type.
 * @param self - The tree being queried.
 * @returns Numeric child count.
 * @category basic
 */
export const isBranch = <A>(self: Tree<A>): self is Branch<A> => !isLeaf(self)

/**
 * Match a {@link Tree} to leaves and branches.
 * @category basic
 */
export const match =
  <A, R>({onLeaf, onBranch}: Matcher<A, R>): ((self: Tree<A>) => R) =>
  tree =>
    isBranch(tree)
      ? onBranch(...pipe(tree, Pair.fanout(getValue, getBranchForest)))
      : pipe(tree, getValue, onLeaf)

/**
 * Compute child count for root node.
 * @typeParam A - Tree type.
 * @param self - The tree being queried.
 * @returns Numeric child count.
 * @category basic
 */
export const length: <A>(self: Tree<A>) => number = match({
  onLeaf: () => 0,
  onBranch: (_, forest) => forest.length,
})

/**
 * Get the value of a node.
 * @typeParam A - tree type.
 * @param self - the tree to query.
 * @returns The tree that is first in the forest of the given branch.
 * @category basic
 */
export const getValue: <A>(self: Tree<A>) => A = flow(unfixTree, getValueF)

/**
 * Get the forest of a branch node.
 * @typeParam A - tree type.
 * @param self - the tree to query.
 * @returns The tree that is first in the forest of the given branch.
 * @category basic
 */
export const getBranchForest: <A>(self: Branch<A>) => ForestOf<A> = flow(
  unfixBranch,
  getBranchForestF,
)

/**
 * Get the forest of any tree node. Result could be an empty list if the given
 * node is a branch.
 * @typeParam A - Tree type.
 * @param self - The tree being changed.
 * @returns A new tree where the root value has been replaced by the given value.
 * @category basic
 */
export const getForest = <A>(self: Tree<A>): readonly Tree<A>[] =>
  pipe(
    self,
    match<A, readonly Tree<A>[]>({
      onLeaf: () => [],
      onBranch: (_, forest) => forest,
    }),
  )

/**
 * Deconstruct the node and possibly empty forest of a tree.
 * @typeParam A - Tree type.
 * @param self - The tree being deconstructed.
 * @returns A pair of the tree node value and a possibly empty list of child trees.
 * @category basic
 */
export const destruct = <A>(self: Tree<A>): readonly [A, readonly Tree<A>[]] =>
  pipe(
    self,
    match<A, readonly [A, readonly Tree<A>[]]>({
      onLeaf: Pair.pair.withSecond([]),
      onBranch: Pair.pair,
    }),
  )

/**
 * Same as {@link destruct} but only for _branches_, so you are guaranteed a
 * non-empty forest.
 * @typeParam A - Tree type.
 * @param self - The branch being deconstructed.
 * @returns A pair of the tree node value and a non-empty list of child trees.
 * @category basic
 */
export const destructBranch = <A>({
  unfixed: {node, forest},
}: Branch<A>): [A, Array.NonEmptyReadonlyArray<Tree<A>>] => [node, forest]

/**
 * Set the value of a tree root to a given value of the same type.
 * @typeParam A - Tree type.
 * @param self - The tree being changed.
 * @param value - New value for the root node.
 * @returns A new tree where the root value has been replaced by the given value.
 * @category basic
 */
export const setValue: {
  <A>(self: Tree<A>, value: A): Tree<A>
  <A>(value: A): (self: Tree<A>) => Tree<A>
} = Function.dual(
  2,
  <A>(self: Tree<A>, value: A): Tree<A> => ({
    unfixed: pipe(
      self,
      match({
        onLeaf: () => leafF(value),
        onBranch: (_, forest) => branchF(value, forest),
      }),
    ),
  }),
)

const _setForest = <A>(self: Tree<A>, forest: ForestOf<A>) =>
  pipe(self, getValue, treeF(forest), fixTree) as Branch<A>

/**
 * Set the forest of a tree root to a given forest of the same type.
 * @typeParam A - Tree type.
 * @param self - The tree being changed.
 * @param value - New forest.
 * @returns A new tree where the forest has been replaced by the given forest.
 * @category basic
 */
export const setForest: {
  <A>(self: Tree<A>, forest: ForestOf<A>): Branch<A>
  <A>(forest: ForestOf<A>): (self: Tree<A>) => Branch<A>
  flip: <A>(self: Tree<A>) => (forest: ForestOf<A>) => Branch<A>
} = Object.assign(Function.dual(2, _setForest), {
  flip:
    <A>(self: Tree<A>) =>
    (forest: ForestOf<A>) =>
      _setForest(self, forest),
})

/**
 * Run the given function over the given tree if it is a branch, else return the
 * tree unchanged. This is like {@link match} where the `onLeaf` branch is set
 * to `identity`.
 * @category basic
 */
export const modBranch =
  <A>(f: (branch: Branch<A>) => Tree<A>) =>
  (self: Tree<A>): Tree<A> =>
    isLeaf(self) ? self : f(self)

/**
 * Run a function to change the value, but not the type, of the top level
 * node of the given tree.
 * @category basic
 */
export const modValue =
  <A>(f: (a: A) => A): ((self: Tree<A>) => Tree<A>) =>
  self =>
    setValue(self, pipe(self, getValue, f))

/**
 * Run a function to change the value, but not the type, of the top level
 * forest of the given tree. If the tree is a {@link Leaf} the given
 * function will receive the empty array as a parameter.
 * @category basic
 */
export const modForest =
  <A>(f: (a: readonly Tree<A>[]) => Tree<A>[]): ((self: Tree<A>) => Tree<A>) =>
  self =>
    pipe(self, getForest, f, pipe(self, getValue, withForest<A>))

/**
 * Same as {@link modForest} but only accepts branches, so the given function is
 * guaranteed to get a non empty forest as its argument.
 * @category basic
 */
export const modBranchForest =
  <A>(f: (a: ForestOf<A>) => ForestOf<A>): ((self: Branch<A>) => Branch<A>) =>
  self =>
    setForest(self, pipe(self, getBranchForest, f))

/**
 * Return the first child tree of a branch.
 * @typeParam A - tree type.
 * @returns The tree that is first in the forest of the given branch.
 * @category basic
 */
export const firstChild = <A>(self: Branch<A>): Tree<A> =>
  pipe(self, getBranchForest, Array.headNonEmpty)

/**
 * Return the last child tree of a branch.
 * @typeParam A - tree type.
 * @returns The tree that is last in the forest of the given branch.
 * @category basic
 */
export const lastChild = <A>(self: Branch<A>): Tree<A> =>
  pipe(self, getBranchForest, Array.lastNonEmpty)

const _nthChild = <A>(n: number, self: Tree<A>): Option<Tree<A>> =>
  pipe(
    self,
    match({
      onLeaf: K(none<Tree<A>>()),
      onBranch: (_, forest) => Array.get(forest, n < 0 ? forest.length + n : n),
    }),
  )

/**
 * Return the nth child tree of a tree or `Option.none()` if index is
 * out-of-bounds or if given tree is a leaf.
 *
 * Negative indexes are handled as offsets from the end of the forest with `-1`
 * being the last child, `-2` the child before it, and so on.
 * @typeParam A - tree type.
 * @param n - index of requested node in parent forest. Negative indexes are
 * accepted.
 * @param self - node will be taken from the forest of this node.
 * @returns An optional tree.
 * @category basic
 */
export const nthChild: {
  <A>(n: number, self: Tree<A>): Option<Tree<A>>
  <A>(self: Tree<A>): (n: number) => Option<Tree<A>>
  flip: (n: number) => <A>(self: Tree<A>) => Option<Tree<A>>
} = Object.assign(
  Function.dual(2, <A>(n: number, self: Tree<A>) => _nthChild(n, self)),
  {
    flip:
      (n: number) =>
      <A>(self: Tree<A>) =>
        _nthChild(n, self),
  },
)

const _drill = <A>(path: number[], self: Tree<A>): Option<Tree<A>> => {
  const [head, ...tail] = path
  if (head === undefined) return none()

  let child = nthChild(head, self)
  if (isNone(child)) return none()

  for (const index of tail) {
    child = nthChild(index, child.value)
    if (isNone(child)) return none()
  }

  return child
}

/**
 * Drill down to get the child node at a given index path or none. Negative
 * indexes are handled as in {@link nthChild}: as offsets from the end
 * of the forest with `-1` being the last child, `-2` the child before it, and
 * so on.
 *
 * An empty path will return the given tree.
 * @typeParam A - tree type.
 * @param path - a possibly empty array of numeric indexes that form a path from
 * root node to some child node.
 * accepted.
 * @param self - node will be taken from the forest of this node.
 * @returns An optional tree.
 * @category basic
 */
export const drill: {
  <A>(path: number[], self: Tree<A>): Option<Tree<A>>
  <A>(self: Tree<A>): (path: number[]) => Option<Tree<A>>
  flip: (path: number[]) => <A>(self: Tree<A>) => Option<Tree<A>>
} = Object.assign(Function.dual(2, _drill), {
  flip:
    (path: number[]) =>
    <A>(self: Tree<A>) =>
      drill(path, self),
})
