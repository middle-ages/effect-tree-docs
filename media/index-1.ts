import {
  branchF,
  isLeaf as isLeafF,
  leafF,
  type BranchF,
  type TreeFTypeLambda,
} from '#treeF'
import {K, Pair} from '#util'
import {Array, flow, Function, pipe} from 'effect'
import {fix, unfix} from 'effect-ts-folds'
import {isNone, none, type Option} from 'effect/Option'
import type {
  Branch,
  ForestOf,
  Leaf,
  Matcher,
  Tree,
  UnfixedTree,
} from './types.js'

export const [fixTree, unfixTree]: [
  <A>(treeF: UnfixedTree<A>) => Tree<A>,
  <A>(fixed: Tree<A>) => UnfixedTree<A>,
] = [fix, unfix]

/** Like {@link fixTree} but exclusively for branches. */
export const fixBranch = fix<TreeFTypeLambda> as <A>(
  branchF: BranchF<A, Tree<A>>,
) => Branch<A>

/** Create a new leaf from a node value. */
export const leaf = flow(leafF, fixTree) as <A>(node: A) => Leaf<A>

/** Create a new branch from its value and a non-empty list of child nodes. */
export const branch: {
  <A>(node: A, forest: ForestOf<A>): Branch<A>
  <A>(forest: ForestOf<A>): (node: A) => Branch<A>
  flip: <A>(node: A) => (forest: ForestOf<A>) => Branch<A>
} = Object.assign(
  Function.dual(2, <A>(node: A, forest: ForestOf<A>) =>
    fixBranch(branchF<A, Tree<A>>(node, forest)),
  ),
  {
    flip:
      <A>(node: A) =>
      (forest: ForestOf<A>) =>
        fixBranch(branchF<A, Tree<A>>(node, forest)),
  },
)

/**
 * Create a new `Tree` from a node value and a possibly empty list of
 * child nodes.
 */
export const tree = <A>(node: A, forest: readonly Tree<A>[]): Tree<A> =>
  Array.isNonEmptyReadonlyArray(forest)
    ? {unfixed: {node, forest}}
    : {unfixed: {node}}

/** A curried version of {@link tree}. */
export const treeC =
  <A>(forest: Tree<A>[]): ((node: A) => Tree<A>) =>
  node =>
    tree(node, forest)

/** A flipped version of {@link tree} */
export const withForest: {
  <A>(forest: Tree<A>[], node: A): Tree<A>
  <A>(node: A): (forest: Tree<A>[]) => Tree<A>
} = Function.dual(
  2,
  <A>(forest: ForestOf<A>, node: A): Tree<A> => tree(node, forest),
)

/** A version of {@link tree} where the forest is a rest argument. */
export const from = <A>(node: A, ...forest: Tree<A>[]) => tree(node, forest)

/** Type guard for the tree {@link Leaf} type. */
export const isLeaf = <A>(tree: Tree<A>): tree is Leaf<A> =>
  isLeafF(tree.unfixed)

/** Type guard for the tree {@link Branch} type. */
export const isBranch = <A>(tree: Tree<A>): tree is Branch<A> => !isLeaf(tree)

/** Match a {@link Tree} to leaves and branches. */
export const match =
  <A, R>({onLeaf, onBranch}: Matcher<A, R>): ((tree: Tree<A>) => R) =>
  tree =>
    isBranch(tree)
      ? onBranch(...pipe(tree, Pair.fanout(getNode, getBranchForest)))
      : pipe(tree, getNode, onLeaf)

/** Compute child count for root node. */
export const length: <A>(tree: Tree<A>) => number = match({
  onLeaf: () => 0,
  onBranch: (_, forest) => forest.length,
})

/** Get the value of a node. */
export const getNode = <A>({unfixed: {node}}: Tree<A>): A => node

/** Get the forest of a branch node. */
export const getBranchForest = <A>({
  unfixed: {forest},
}: Branch<A>): ForestOf<A> => forest

/**
 * Get the forest of any tree node. Result could be an empty list if the given
 * node is a branch.
 */
export const getForest = <A>(tree: Tree<A>): readonly Tree<A>[] =>
  pipe(
    tree,
    match<A, readonly Tree<A>[]>({
      onLeaf: () => [],
      onBranch: (_, forest) => forest,
    }),
  )

/** Extract the node and possibly empty forest of a tree. */
export const destruct = <A>(self: Tree<A>): readonly [A, readonly Tree<A>[]] =>
  pipe(
    self,
    match<A, readonly [A, readonly Tree<A>[]]>({
      onLeaf: Pair.pair.withSecond([]),
      onBranch: Pair.pair,
    }),
  )

/** Set the node of a tree root to the a node of the same type. */
export const setNode: {
  <A>(tree: Tree<A>, node: A): Tree<A>
  <A>(node: A): (tree: Tree<A>) => Tree<A>
} = Function.dual(
  2,
  <A>(tree: Tree<A>, node: A): Tree<A> => ({
    unfixed: pipe(
      tree,
      match({
        onLeaf: () => ({node}),
        onBranch: (_, forest) => ({node, forest}),
      }),
    ),
  }),
)

/**
 * Set the forest of a tree root to the a forest of the same type.
 *
 * You can access a version with _flipped_ arguments via `setForest.flip`.
 */
export const setForest: {
  <A>(tree: Tree<A>, forest: ForestOf<A>): Branch<A>
  <A>(forest: ForestOf<A>): (tree: Tree<A>) => Branch<A>
  flip: <A>(tree: Tree<A>) => (forest: ForestOf<A>) => Branch<A>
} = Object.assign(
  Function.dual(
    2,
    <A>({unfixed: {node}}: Tree<A>, forest: ForestOf<A>): Tree<A> => ({
      unfixed: {node, forest},
    }),
  ),
  {
    flip:
      <A>({unfixed: {node}}: Tree<A>) =>
      (forest: ForestOf<A>) => ({
        unfixed: {node, forest},
      }),
  },
)

/**
 * Run the given function over the given tree if it is a branch, else return the
 * tree unchanged. This is like {@link match} where the `onLeaf` branch is set
 * to `identity`.
 */
export const modBranch =
  <A>(f: (branch: Branch<A>) => Tree<A>) =>
  (self: Tree<A>): Tree<A> =>
    isLeaf(self) ? self : f(self)

/**
 * Run a function to change the value, but not the type, of the top level
 * node of the given tree.
 */
export const modNode =
  <A>(f: (a: A) => A): ((self: Tree<A>) => Tree<A>) =>
  self =>
    setNode(self, pipe(self, getNode, f))

/**
 * Run a function to change the value, but not the type, of the top level
 * forest of the given tree. If the tree is a {@link Leaf} the given
 * function will receive the empty array as a parameter.
 */
export const modForest =
  <A>(f: (a: readonly Tree<A>[]) => Tree<A>[]): ((self: Tree<A>) => Tree<A>) =>
  self =>
    pipe(self, getForest, f, pipe(self, getNode, withForest<A>))

/**
 * Same as {@link modForest} but only accepts branches, so the given function is
 * guaranteed to get a non empty forest as its argument.
 */
export const modBranchForest =
  <A>(f: (a: ForestOf<A>) => ForestOf<A>): ((self: Branch<A>) => Branch<A>) =>
  self =>
    setForest(self, pipe(self, getBranchForest, f))

/** Return the 1st child tree of a branch. */
export const firstChild = <A>(self: Branch<A>): Tree<A> =>
  pipe(self, getBranchForest, Array.headNonEmpty)

/** Return the last child tree of a branch. */
export const lastChild = <A>(self: Branch<A>): Tree<A> =>
  pipe(self, getBranchForest, Array.lastNonEmpty)

const _nthChild = <A>(n: number, self: Tree<A>): Option<Tree<A>> =>
  pipe(
    self,
    match({
      onLeaf: K(none<Tree<A>>()),
      onBranch: (_, forest) => Array.get(forest, n),
    }),
  )

/**
 * Return the nth child tree of a tree or `Option.none()` if index is
 * out-of-bounds or if given tree is a leaf.
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

/** Drill down to get the child node at a given index path or none. */
export const getChildAtPath: {
  <A>(indexes: number[], self: Tree<A>): Option<Tree<A>>
  <A>(self: Tree<A>): (index: number[]) => Option<Tree<A>>
} = Function.dual(2, <A>(indexes: number[], self: Tree<A>): Option<Tree<A>> => {
  const [head, ...tail] = indexes
  if (head === undefined) return none()

  let child = nthChild(head, self)
  if (isNone(child)) return none()

  for (const index of tail) {
    child = nthChild(index, child.value)
    if (isNone(child)) return none()
  }

  return child
})
