import {
  branchF,
  getBranchForest as getBranchForestF,
  getValue as getValueF,
  isLeaf as isLeafF,
  leafF,
  type BranchF,
  type TreeF,
  type TreeFTypeLambda,
} from '#treeF'
import {Pair} from '#util'
import {Array, flow, Function, pipe} from 'effect'
import {fix, unfix} from 'effect-ts-folds'
import type {Branch, ForestOf, Leaf, Matcher, Tree} from './types.js'

export const [
  /**
   * Convert the non-recursive version of the tree with children of type
   * `Tree<A>` into the recursive {@link Tree} type.
   * @category basic
   * @function
   */
  fixTree,
  /**
   * Convert the recursive version of the tree to a non-recursive
   * {@link TreeF} version with children of type `Tree<A>`.
   * @category basic
   * @function
   */
  unfixTree,
]: [
  <A>(treeF: TreeF<A, Tree<A>>) => Tree<A>,
  <A>(fixed: Tree<A>) => TreeF<A, Tree<A>>,
] = [fix, unfix]

/**
 * Like {@link fixTree} but exclusively for branches.
 * @category basic
 * @function
 */
export const fixBranch = fix<TreeFTypeLambda> as <A>(
  branchF: BranchF<A, Tree<A>>,
) => Branch<A>

/**
 * Like {@link unfixTree} but exclusively for branches.
 * @category basic
 * @function
 */
export const unfixBranch = unfix<TreeFTypeLambda> as <A>(
  branchF: Branch<A>,
) => BranchF<A, Tree<A>>

/**
 * Create a new leaf from its value.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const leaf = Tree.leaf(1)
 *
 * expect(Tree.isLeaf(leaf), 'isLeaf').toBe(true)
 * expect(Tree.getValue(leaf), 'value').toBe(1)
 * @typeParam A Underlying tree type.
 * @param value The tree root value.
 * @returns A new leaf with the given value.
 * @category basic
 * @function
 */
export const leaf = flow(leafF, fixTree) as <A>(value: A) => Leaf<A>

/**
 * Create a new branch from its value and a non-empty list of child nodes.
 * child nodes.
 *
 * At the `flipped` key you will find a flipped curried version that accepts two
 * argument lists: the first with the value and the second with the forest.
 *
 * At the `tupled` key you will find a tupled version that accepts as its single
 * argument a tuple of value and forest.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const branch = Tree.branch(1, [Tree.of(2)])
 *
 * expect(Tree.isBranch(branch), 'isBranch').toBe(true)
 * expect(Tree.getValue(branch), 'value').toBe(1)
 * expect(Tree.getForest(branch), 'forest').toEqual([Tree.of(2)])
 * @typeParam A Underlying tree type.
 * @param value The tree root value.
 * @param forest A non-empty list of child nodes, all of the same type as this
 * parent node.
 * @returns A new branch with the given value and forest.
 * @category basic
 * @function
 */
export const branch: {
  <A>(value: A, forest: ForestOf<A>): Branch<A>
  <A>(forest: ForestOf<A>): (value: A) => Branch<A>
  flipped: <A>(value: A) => (forest: ForestOf<A>) => Branch<A>
  tupled: <A>(valueAndForest: [value: A, forest: ForestOf<A>]) => Branch<A>
} = Object.assign(
  Function.dual(2, <A>(value: A, forest: ForestOf<A>) =>
    fixBranch(branchF<A, Tree<A>>(value, forest)),
  ),
  {
    flipped:
      <A>(value: A) =>
      (forest: ForestOf<A>) =>
        fixBranch(branchF<A, Tree<A>>(value, forest)),

    tupled: <A>([value, forest]: [A, ForestOf<A>]): Branch<A> =>
      fixBranch(branchF<A, Tree<A>>(value, forest)),
  },
)

const _tree = <A>(value: A, forest: readonly Tree<A>[] = []): Tree<A> =>
  Array.isNonEmptyReadonlyArray(forest) ? branch(value, forest) : leaf(value)

/**
 * Create a new `Tree` from a node value and a possibly empty list of
 * child nodes. If the given forest is missing or empty a {@link Leaf}
 * will be returned, else a {@link Branch}.
 *
 * At the `curried` key you will find a curried version that accepts two
 * argument lists: the first with the optional forest and the second with the
 * required value.
 *
 * At the `flipped` key you will find a flipped curried version that accepts two
 * argument lists: the first with the required value and the second with the
 * optional forest.
 *
 * At the `tupled` key you will find a tupled version that accepts the arguments
 * as a single tuple argument of value and optional forest.
 * @typeParam A Underlying tree type.
 * @param value The tree root value.
 * @param forest A possibly empty or missing list of child nodes, all of the
 * same type as this parent node.
 * @returns A new tree with the given value and possibly empty forest.
 * @category basic
 * @function
 */
export const tree: {
  <A>(value: A, forest?: readonly Tree<A>[]): Tree<A>
  curried: <A>(forest: readonly Tree<A>[]) => (value: A) => Tree<A>
  flipped: <A>(value: A) => (forest?: readonly Tree<A>[]) => Tree<A>
  tupled: <A>(pair: readonly [A, (readonly Tree<A>[])?]) => Tree<A>
} = Object.assign(_tree, {
  curried:
    <A>(forest: readonly Tree<A>[]) =>
    (value: A): Tree<A> =>
      _tree(value, forest),

  flipped:
    <A>(value: A) =>
    (forest?: readonly Tree<A>[]): Tree<A> =>
      _tree(value, forest),

  tupled: <A>([value, forest]: readonly [A, (readonly Tree<A>[])?]): Tree<A> =>
    _tree(value, forest),
})

/**
 * A version of {@link tree} where the forest is a rest argument.
 * @typeParam A Underlying tree type.
 * @category basic
 * @function
 */
export const from = <A>(value: A, ...forest: Tree<A>[]): Tree<A> =>
  tree(value, forest)

/**
 * Type guard for the tree {@link Leaf} type.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const leaf = Tree.of(1)
 * const branch = Tree.branch(1, [Tree.of(2)])
 *
 * expect(Tree.isLeaf(leaf), 'branch').toBe(true)
 * expect(Tree.isLeaf(branch), 'branch').toBe(false)
 * @typeParam A Underlying tree type.
 * @category basic
 * @function
 */
export const isLeaf = <A>(self: Tree<A>): self is Leaf<A> =>
  isLeafF(self.unfixed)

/**
 * Type guard for the tree {@link Branch} type.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const leaf = Tree.of(1)
 * const branch = Tree.branch(1, [Tree.of(2)])
 *
 * expect(Tree.isBranch(leaf), 'branch').toBe(false)
 * expect(Tree.isBranch(branch), 'branch').toBe(true)
 * @typeParam A Underlying tree type.
 * @category basic
 * @function
 */
export const isBranch = <A>(self: Tree<A>): self is Branch<A> => !isLeaf(self)

/**
 * Get the value of a node.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const tree = Tree.of(1)
 *
 * expect(Tree.getValue(tree)).toBe(1)
 * @typeParam A Underlying tree type.
 * @param self the tree to query.
 * @returns Value of the tree root node.
 * @category basic
 * @function
 */
export const getValue: <A>(self: Tree<A>) => A = flow(unfixTree, getValueF)

/**
 * Get the forest of a branch node.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const branch = Tree.branch(1, [Tree.of(2)])
 *
 * expect(Tree.getForest(branch)).toEqual([Tree.of(2)])
 * @typeParam A Underlying tree type.
 * @param self the branch to query.
 * @returns The non-empty forest of the given branch..
 * @category basic
 * @function
 */
export const getBranchForest: <A>(self: Branch<A>) => ForestOf<A> = flow(
  unfixBranch,
  getBranchForestF,
)

/**
 * Match a {@link Tree} to leaves and branches.
 * @example
 * import * as Tree from 'effect-tree'
 *
 * const leaf = Tree.of(1)
 * const branch = Tree.from(2, leaf)
 *
 * const matcher= Tree.match<number, number>({
 *   onLeaf: value => value + 1,
 *   onBranch: (value, forest)  => value + forest.length,
 * })
 *
 * expect(matcher(leaf)).toBe(2)
 * expect(matcher(branch)).toBe(3)
 * @typeParam A Underlying tree type.
 * @param matcher A record with the keys `onLeaf` and `onBranch`.
 * @returns Result of the match.
 * @category basic
 * @function
 */
export const match =
  <A, R>({onLeaf, onBranch}: Matcher<A, R>): ((self: Tree<A>) => R) =>
  tree =>
    isBranch(tree)
      ? onBranch(...pipe(tree, Pair.fanout(getValue, getBranchForest)))
      : pipe(tree, getValue, onLeaf)
