import * as TreeF from '#treeF'
import {fanout} from '#util/Pair'
import {Foldable as FO, Monoid} from '@effect/typeclass'
import * as Boolean from '@effect/typeclass/data/Boolean'
import {Array, Effect, flow, Function, pipe} from 'effect'
import {type Predicate} from 'effect/Predicate'
import {treeCata, type TreeFold, type TreeFolder} from '../schemes/fold.js'
import {match} from '../tree/index.js'
import {type Tree, type TreeTypeLambda} from '../tree/types.js'

/**
 * Reduce a tree to a value of type `B` by applying the given reducer repeatedly
 * over each element and the previous result of the reducer.
 * @typeParam A - The tree type.
 * @param self - The tree being reduced.
 * @param initial - The initial value will appear as the _previous_ value in the
 * first iteration of the reducer.
 * @returns - Reduced value of the same type as the given `initial` value.
 * @category instances
 */
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
        onLeaf: value => Effect.succeed(reducer(initial, value)),
        onBranch: (value, forest) =>
          Array.reduce(
            forest,
            Effect.succeed(reducer(initial, value)),
            (initial, tree) =>
              Effect.suspend(() =>
                pipe(initial, Effect.flatMap(reduceEffect(reducer, tree))),
              ),
          ),
      }),
    )

/**
 * Foldable instance for {@link Tree}.
 * @category instances
 */
export const Foldable: FO.Foldable<TreeTypeLambda> = {reduce}

/**
 * Fold a `Tree<A>` into an `A` using a `Monoid<A>`.
 * @category instances
 */
export const foldMap: <A>(M: Monoid.Monoid<A>) => TreeFold<A, A> = monoid =>
  treeCata(monoidFold(monoid))

/**
 * Fold a single level of a tree using a monoid of the node type.
 * @category instances
 */
export const monoidFold =
  <A>(M: Monoid.Monoid<A>): TreeFolder<A, A> =>
  self =>
    pipe(
      self,
      TreeF.match<A, A, A>({
        onLeaf: value => M.combine(M.empty, value),
        onBranch: (value, forest) =>
          Array.reduce(forest, M.combine(M.empty, value), M.combine),
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
          flow(TreeF.getValue, predicate),
          flow(TreeF.getForest, Array.reduce(M.empty, M.combine)),
        ),
      ),
    )

/**
 * The type of function the builds a tree folder from a predicate.
 * @category instances
 */
export type BooleanFolder = <A>(
  predicate: Predicate<A>,
) => TreeFolder<A, boolean>

/**
 * The type of function the builds a tree fold from a predicate.
 * @category instances
 */
export type BooleanFold = <A>(predicate: Predicate<A>) => TreeFold<A, boolean>

/**
 * @category instances
 */
export const everyFold: BooleanFolder = predicateFold(Boolean.MonoidEvery)

/**
 * @category instances
 */
export const someFold: BooleanFolder = predicateFold(Boolean.MonoidSome)

/**
 * @category instances
 */
export const xorFold: BooleanFolder = predicateFold(Boolean.MonoidXor)

/**
 * @category instances
 */
export const eqvFold: BooleanFolder = predicateFold(Boolean.MonoidEqv)

/**
 * True if every node in the given boolean tree is true.
 * @category instances
 */
export const every: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidEvery)

/**
 * True if some nodes in the given boolean tree are true.
 * @category instances
 */
export const some: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidSome)

/**
 * Fold with `xor` over a boolean tree.
 * @category instances
 */
export const xor: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidXor)

/**
 * Threads the logical connective `eqv`, also known as
 * _bidirectional implication_, through all the nodes of a boolean tree and
 * returns the boolean result.
 * @category instances
 */
export const eqv: Predicate<Tree<boolean>> = foldMap(Boolean.MonoidEqv)

/**
 * True if the given predicate is true for every node in the given tree.
 * @category instances
 */
export const everyOf: BooleanFold = flow(everyFold, treeCata)

/**
 * True if the given predicate is true for _some_ node or nodes in the given
 * tree.
 * @category instances
 */
export const someOf: BooleanFold = flow(someFold, treeCata)
