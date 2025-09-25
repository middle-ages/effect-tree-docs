import {Covariant as CO} from '@effect/typeclass'
import {Effect, flow, Function, pipe} from 'effect'
import {branch, leaf, match, tree} from '../tree/index.js'
import type {Tree, TreeTypeLambda} from '../tree/types.js'

const _mapEffect = <A, B, E = unknown, R = never>(
  self: Tree<A>,
  f: (a: A) => Effect.Effect<B, E, R>,
): Effect.Effect<Tree<B>, E, R> =>
  pipe(
    self,
    match({
      onLeaf: flow(f, Effect.map(leaf)),
      onBranch: (value, forest) =>
        Effect.suspend(() =>
          pipe(
            forest,
            Effect.forEach(mapEffect(f)),
            Effect.flatMap(forest =>
              pipe(value, f, Effect.map(branch(forest))),
            ),
          ),
        ),
    }),
  )

const _mapEffectPreOrder = <A, B, E = unknown, R = never>(
  f: (a: A) => Effect.Effect<B, E, R>,
): ((self: Tree<A>) => Effect.Effect<Tree<B>, E, R>) =>
  match({
    onLeaf: flow(f, Effect.map(leaf)),
    onBranch: (value, forest) =>
      Effect.suspend(() =>
        Effect.flatMap(f(value), value =>
          pipe(
            forest,
            Effect.forEach(mapEffect.pre(f)),
            Effect.map(tree.flipped(value)),
          ),
        ),
      ),
  })

/**
 * Map an effectful function over the tree in post-order: parent effect is run
 * _after_ children.
 *
 * At the key `pre` you will find a function that runs the effect in
 * depth-first pre-order.
 * @category instances
 * @function
 */
export const mapEffect: {
  <A, B, E = unknown, R = never>(
    self: Tree<A>,
    f: (a: A) => Effect.Effect<B, E, R>,
  ): Effect.Effect<Tree<B>, E, R>

  <A, B, E = unknown, R = never>(
    f: (a: A) => Effect.Effect<B, E, R>,
  ): (self: Tree<A>) => Effect.Effect<Tree<B>, E, R>

  pre: <A, B, E = unknown, R = never>(
    f: (a: A) => Effect.Effect<B, E, R>,
  ) => (self: Tree<A>) => Effect.Effect<Tree<B>, E, R>
} = Object.assign(Function.dual(2, _mapEffect), {pre: _mapEffectPreOrder})

/**
 * Map over all tree nodes using the given function.
 * @category instances
 * @function
 */
export const map: CO.Covariant<TreeTypeLambda>['map'] = Function.dual(
  2,
  <A, B>(self: Tree<A>, f: (a: A) => B): Tree<B> =>
    pipe(self, mapEffect.pre(flow(f, Effect.succeed)), Effect.runSync),
)

/**
 * @category instances
 * @function
 */
export const imap = CO.imap<TreeTypeLambda>(map)

/**
 * Covariant instance for {@link Tree}.
 * @category instances
 */
export const Covariant: CO.Covariant<TreeTypeLambda> = {map, imap}

/**
 * @category instances
 * @function
 */
export const flap: {
  <A, B>(self: Tree<(a: A) => B>): (a: A) => Tree<B>
  <A, B>(a: A, self: Tree<(a: A) => B>): Tree<B>
} = CO.flap(Covariant)
