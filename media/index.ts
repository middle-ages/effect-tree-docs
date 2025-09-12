import {Pair} from '#util'
import {Array, Function, pipe} from 'effect'
import type {NonEmptyReadonlyArray} from 'effect/Array'
import type {BranchF, LeafF, MatcherF, TreeF} from './types.js'

/** Create a leaf from its value. */
export const leafF = <A>(node: A): TreeF<A> => ({node})

/** Create a branch from its value and a non-empty list of children. */
export const branchF: {
  <A, C>(node: A, forest: NonEmptyReadonlyArray<C>): BranchF<A, C>
  <C>(forest: NonEmptyReadonlyArray<C>): <A>(node: A) => BranchF<A, C>
  tupled: <A, C>([node, forest]: [A, Array.NonEmptyArray<C>]) => BranchF<A, C>
} = Object.assign(
  Function.dual(
    2,
    <A, C>(node: A, forest: NonEmptyReadonlyArray<C>): TreeF<A, C> => ({
      node,
      forest,
    }),
  ),
  {
    /** A tupled version of {@link branchF}. */
    tupled: <A, C>([node, forest]: [A, Array.NonEmptyArray<C>]): BranchF<
      A,
      C
    > => ({node, forest}),
  },
)

/**
 * Create a new `TreeF` from a node value and a possibly empty list of
 * child nodes.
 */
export const treeF: {
  <A, C>(node: A, forest: readonly C[]): TreeF<A, C>
  <C>(forest: readonly C[]): <A>(node: A) => TreeF<A, C>
} = Function.dual(
  2,
  <A, C>(node: A, forest: readonly C[]): TreeF<A, C> =>
    Array.isNonEmptyReadonlyArray(forest) ? {node, forest} : {node},
)

/** A flipped version of {@link treeF} */
export const withForest: {
  <A, C>(forest: C[], node: A): TreeF<A, C>
  <A>(node: A): <C>(forest: C[]) => TreeF<A, C>
} = Function.dual(
  2,
  <A, C>(forest: TreeF<A, C>[], node: A): TreeF<A, C> => treeF(node, forest),
)

/** True if the tree has no children. */
export const isLeaf = <A, C>(self: TreeF<A, C>): self is LeafF<A> =>
    !('forest' in self),
  /** True if the tree has no children. */
  isBranch = <A, C>(treeF: TreeF<A, C>): treeF is BranchF<A, C> =>
    !isLeaf(treeF)

/** Match a `TreeF` to leaves and branches. */
export const match =
  <A, C, R>({onLeaf, onBranch}: MatcherF<A, C, R>) =>
  (treeF: TreeF<A, C>): R =>
    isBranch(treeF) ? onBranch(treeF.node, treeF.forest) : onLeaf(treeF.node)

export const destruct = <A, B>(self: TreeF<A, B>): readonly [A, B[]] =>
  pipe(
    self,
    match({
      onLeaf: Pair.pair.withSecond([] as B[]),
      onBranch: (node, forest) => [node, [...forest]] as const,
    }),
  )

/** Compute child count for given tree node. */
export const length: <A, C>(self: TreeF<A, C>) => number = match({
  onLeaf: () => 0,
  onBranch: (_, forest) => forest.length,
})

export const [getNode, getForest, getBranchForest] = [
  <A, C>({node}: TreeF<A, C>): A => node,
  <A, C>(self: TreeF<A, C>): readonly C[] =>
    isBranch(self) ? self.forest : [],
  <A, C>({forest}: BranchF<A, C>): Array.NonEmptyReadonlyArray<C> => forest,
]

export const setNode: {
    <A, B, C>(node: B, self: TreeF<A, C>): TreeF<B, C>
    <A, C>(self: TreeF<A, C>): <B>(node: B) => TreeF<B, C>
  } = Function.dual(
    2,
    <A, B, C>(node: B, self: TreeF<A, C>): TreeF<B, C> =>
      pipe(
        self,

        match({
          onLeaf: () => ({node}),
          onBranch: (_, forest) => ({node, forest}),
        }),
      ),
  ),
  setForest: {
    <A, B, C>(forest: Array.NonEmptyArray<B>, self: TreeF<A, C>): TreeF<A, B>
    <A, C>(
      self: TreeF<A, C>,
    ): <B>(forest: Array.NonEmptyArray<B>) => TreeF<A, B>
  } = Function.dual(
    2,
    <A, B, C>(forest: Array.NonEmptyArray<B>, self: TreeF<A, C>): TreeF<A, B> =>
      pipe(
        self,
        match({
          onLeaf: node => ({node, forest}),
          onBranch: node => ({node, forest}),
        }),
      ),
  )

export const mapNode: {
  <A, B, C>(self: TreeF<A, C>, f: (a: A) => B): TreeF<B, C>
  <A, B>(f: (a: A) => B): <C>(self: TreeF<A, C>) => TreeF<B, C>
} = Function.dual(
  2,
  <A, B, C>(self: TreeF<A, C>, f: (a: A) => B): TreeF<B, C> =>
    pipe(self, getNode, f, setNode(self)),
)
