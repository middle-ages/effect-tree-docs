/**
 * Tree Covariant.
 * @packageDocumentation
 */
import {Covariant as CO} from '@effect/typeclass'
import {Effect, flow, Function, pipe} from 'effect'
import {withForest, branch, leaf, match} from '../tree/index.js'
import type {Tree, TreeTypeLambda} from '../tree/types.js'

/**
 * Map an effectful function over the tree in post-order: parent effect is run
 * _after_ children.
 */
export const mapEffect = <A, B, E = unknown, R = never>(
  f: (a: A) => Effect.Effect<B, E, R>,
): ((self: Tree<A>) => Effect.Effect<Tree<B>, E, R>) =>
  match({
    onLeaf: flow(f, Effect.map(leaf)),
    onBranch: (value, forest) =>
      Effect.suspend(() =>
        pipe(
          forest,
          Effect.forEach(mapEffect(f)),
          Effect.flatMap(forest => pipe(value, f, Effect.map(branch(forest)))),
        ),
      ),
  })

/**
 * Map an effectful function over the tree in pre-order: parent effect is run
 * _before_ children.
 */
mapEffect.pre = <A, B, E = unknown, R = never>(
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
            Effect.map(withForest(value)),
          ),
        ),
      ),
  })

export const map: CO.Covariant<TreeTypeLambda>['map'] = Function.dual(
  2,
  <A, B>(self: Tree<A>, f: (a: A) => B): Tree<B> =>
    pipe(self, mapEffect.pre(flow(f, Effect.succeed)), Effect.runSync),
)

export const imap = CO.imap<TreeTypeLambda>(map)

/** Covariant instance for `Tree<A>`. */
export const Covariant: CO.Covariant<TreeTypeLambda> = {map, imap}

export const flap: {
  <A, B>(self: Tree<(a: A) => B>): (a: A) => Tree<B>
  <A, B>(a: A, self: Tree<(a: A) => B>): Tree<B>
} = CO.flap(Covariant)
