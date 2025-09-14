/**
 * Tree Traversable.
 * @packageDocumentation
 */
import {
  Applicative,
  SemiApplicative,
  Traversable as traversable,
} from '@effect/typeclass'
import {Traversable as ArrayTraversable} from '@effect/typeclass/data/Array'
import {getApplicative as getEffectApplicative} from '@effect/typeclass/data/Effect'
import {Effect, flow, Function, HKT, identity, pipe} from 'effect'
import {succeedBy} from 'effect-ts-folds'
import {leaf, match, tree} from '../tree/index.js'
import type {Tree, TreeTypeLambda} from '../tree/types.js'

// Two types of depth-first order for N-ary trees.
type DepthFirst = 'pre' | 'post'

const orderedTraverseEffect =
  (order: DepthFirst) =>
  <F extends HKT.TypeLambda>(F: Applicative.Applicative<F>) =>
  <A, B, E1 = unknown, R1 = unknown, I = never, E2 = never, R2 = never>(
    f: (a: A) => Effect.Effect<HKT.Kind<F, I, R1, E1, B>, E2, R2>,
  ) =>
  (self: Tree<A>): Effect.Effect<HKT.Kind<F, I, R1, E1, Tree<B>>, E2, R2> => {
    const buildTree = treeK(F)

    const run: (
      self: Tree<A>,
    ) => Effect.Effect<HKT.Kind<F, I, R1, E1, Tree<B>>, E2, R2> = match({
      onLeaf: flow(f, Effect.map(F.map(leaf))),
      onBranch: (value, forest) =>
        Effect.suspend(() => {
          return order === 'post'
            ? pipe(
                forest,
                Effect.forEach(run),
                Effect.flatMap(forest =>
                  Effect.map(f(value), buildTree(forest)),
                ),
              )
            : pipe(
                value,
                f,
                Effect.flatMap(value =>
                  pipe(
                    forest,
                    Effect.forEach(run),
                    Effect.map(forest => buildTree(value, forest)),
                  ),
                ),
              )
        }),
    })

    return run(self)
  }

export const traverseEffect = Object.assign(orderedTraverseEffect('pre'), {
  post: orderedTraverseEffect('post'),
})

export const traverse: traversable.Traversable<TreeTypeLambda>['traverse'] = <
  F extends HKT.TypeLambda,
>(
  F: Applicative.Applicative<F>,
) =>
  Function.dual(
    2,
    <I, R1, E1, A, _1, _2, _3, B>(
      self: Tree<A>,
      f: (a: A) => HKT.Kind<F, I, R1, E1, B>,
    ) => pipe(self, traverseEffect(F)(succeedBy(f)), Effect.runSync),
  )

/** Convert a `Tree<F<A>>` into a `F<Tree<A>>`. */
export const sequence: <F extends HKT.TypeLambda>(
  F: Applicative.Applicative<F>,
) => <A, E = unknown, R = unknown, I = never>(
  self: Tree<HKT.Kind<F, I, R, E, A>>,
) => HKT.Kind<F, I, R, E, Tree<A>> = F => self =>
  pipe(self, traverse(F)(identity))

/**
 * Traversable instance for the `Tree` datatype. */
export const Traversable: traversable.Traversable<TreeTypeLambda> = {traverse}

/** Convert a `Tree<Effect<A>>` into an `Effect<Tree<A>>`. */
export const sequenceEffect: <A, E = unknown, O = unknown>(
  self: Tree<Effect.Effect<A, E, O>>,
) => Effect.Effect<Tree<A>, E, O> = traversable.sequence(Traversable)(
  getEffectApplicative(),
)

/**
 * Like the {@link tree} constructor, creates a new tree from its node and
 * forest, except both are inside some data type whose applicative is
 * given in the first argument.
 */
export const treeK = <F extends HKT.TypeLambda>(
  F: Applicative.Applicative<F>,
): {
  <A, E = unknown, O = unknown, R = never>(
    value: HKT.Kind<F, R, O, E, A>,
    forest: HKT.Kind<F, R, O, E, Tree<A>>[],
  ): HKT.Kind<F, R, O, E, Tree<A>>
  <A, E = unknown, O = unknown, R = never>(
    forest: HKT.Kind<F, R, O, E, Tree<A>>[],
  ): (value: HKT.Kind<F, R, O, E, A>) => HKT.Kind<F, R, O, E, Tree<A>>
} =>
  Function.dual(
    2,
    <A, E = unknown, O = unknown, R = never>(
      value: HKT.Kind<F, R, O, E, A>,
      forest: HKT.Kind<F, R, O, E, Tree<A>>[],
    ): HKT.Kind<F, R, O, E, Tree<A>> =>
      SemiApplicative.lift2(F)((self: A, that: readonly Tree<A>[]) =>
        tree(self, that),
      )(value, pipe(forest, traversable.sequence(ArrayTraversable)(F))),
  )
