/**
 * Tree Foldable.
 * @packageDocumentation
 */
import * as TreeF from '#treeF'
import {fanout} from '#util/Pair'
import {Foldable as FO, Monoid} from '@effect/typeclass'
import * as Boolean from '@effect/typeclass/data/Boolean'
import {Array, Effect, flow, Function, pipe} from 'effect'
import {type Predicate} from 'effect/Predicate'
import {treeCata, type TreeFold, type TreeFolder} from '../schemes/fold.js'
import {match} from '../tree/index.js'
import {type Tree, type TreeTypeLambda} from '../tree/types.js'

export const reduce: FO.Foldable<TreeTypeLambda>['reduce'] = Function.dual(
  3,
  <B, A>(self: Tree<A>, initial: B, reducer: (b: B, a: A) => B): B =>
    pipe(initial, reduceEffect(reducer, self), Effect.runSync),
)

const reduceEffect =
  <A, B = A>(reducer: (previous: B, current: A) => B, self: Tree<A>) =>
  (initial: B): Effect.Effect<B> =>
    pipe(
      self,
      match({
        onLeaf: node => Effect.succeed(reducer(initial, node)),
        onBranch: (node, forest) =>
          Array.reduce(
            forest,
            Effect.succeed(reducer(initial, node)),
            (initial, tree) =>
              Effect.suspend(() =>
                pipe(initial, Effect.flatMap(reduceEffect(reducer, tree))),
              ),
          ),
      }),
    )

/** Foldable instance for `Tree<A>`. */
export const Foldable: FO.Foldable<TreeTypeLambda> = {reduce}

/** Fold a `Tree<A>` into an `A` using a `Monoid<A>`. */
export const foldMap: <A>(M: Monoid.Monoid<A>) => TreeFold<A, A> = monoid =>
  treeCata(monoidFold(monoid))

/** Fold a single level of a tree using a monoid of the node type. */
export const monoidFold =
  <A>(M: Monoid.Monoid<A>): TreeFolder<A, A> =>
  self =>
    pipe(
      self,
      TreeF.match<A, A, A>({
        onLeaf: node => M.combine(M.empty, node),
        onBranch: (node, forest) =>
          Array.reduce(forest, M.combine(M.empty, node), M.combine),
      }),
    )

/**
 * Fold single level in a tree of type `A` using a predicate of `A` and
 * a boolean monoid.
 * @category fold
 */
export const predicateFold =
  (M: Monoid.Monoid<boolean>) =>
  <A>(predicate: Predicate<A>): TreeFolder<A, boolean> =>
  (self: TreeF.TreeF<A, boolean>) =>
    M.combine(
      ...pipe(
        self,
        fanout(
          flow(TreeF.getNode, predicate),
          flow(TreeF.getForest, Array.reduce(M.empty, M.combine)),
        ),
      ),
    )

export type BooleanFolder = <A>(
  predicate: Predicate<A>,
) => TreeFolder<A, boolean>

/** Type of tree folder that folds into a boolean value using a predicate. */
export type BooleanFold = <A>(predicate: Predicate<A>) => TreeFold<A, boolean>

export const [everyFold, someFold, xorFold, eqvFold]: [
  BooleanFolder,
  BooleanFolder,
  BooleanFolder,
  BooleanFolder,
] = [
  predicateFold(Boolean.MonoidEvery),
  predicateFold(Boolean.MonoidSome),
  predicateFold(Boolean.MonoidXor),
  predicateFold(Boolean.MonoidEqv),
]

/** True if every node in the given boolean tree is true. */
export const every: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidEvery)

/** True if some nodes in the given boolean tree are true. */
export const some: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidSome)

/** Fold with `xor` over a boolean tree. */
export const xor: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidXor)

/**
 * Threads the logical connective `eqv`, also known as
 * _bidirectional implication_, through all the nodes of a boolean tree and
 * returns the boolean result.
 */
export const eqv: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidEqv)

/**
 * True if the given predicate is true for every node in the given tree.
 */
export const everyOf: BooleanFold = flow(everyFold, treeCata)

/**
 * True if the given predicate is true for _some_ node or nodes in the given
 * tree.
 */
export const someOf: BooleanFold = flow(someFold, treeCata)
