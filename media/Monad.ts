/**
 * Tree Monad.
 * @packageDocumentation
 */
import * as TreeF from '#treeF'
import type {FlatMap} from '@effect/typeclass'
import {Monad as MD} from '@effect/typeclass'
import {Effect, flow, Function, identity, pipe} from 'effect'
import {cata, cataE} from 'effect-ts-folds'
import {branch, getValue, leaf} from '../tree/index.js'
import type {Tree, TreeTypeLambda} from '../tree/types.js'
import {Covariant, mapEffect} from './Covariant.js'

/** Flatten a single level of a nested tree. */
export const flattenFold = <A>(self: TreeF.TreeF<Tree<A>, Tree<A>>): Tree<A> =>
  pipe(
    self,
    TreeF.match({
      onLeaf: identity<Tree<A>>,
      onBranch: (node, forest) => branch(getValue(node), forest),
    }),
  )

/** Flatten a nested tree. */
export const flatten: <A>(self: Tree<Tree<A>>) => Tree<A> = cata(
  TreeF.Traversable,
)(flattenFold)

/** Flatten a nested tree into an effect. */
export const flattenEffect: <A>(self: Tree<Tree<A>>) => Effect.Effect<Tree<A>> =
  cataE(TreeF.Traversable)(flow(flattenFold, Effect.succeed))

/** `Flatmap` with an effectful function of a tree. */
export const flatMapEffect =
  <A, B, E = unknown, R = never>(
    f: (a: A) => Effect.Effect<Tree<B>, E, R>,
  ): ((self: Tree<A>) => Effect.Effect<Tree<B>, E, R>) =>
  self =>
    pipe(self, mapEffect(f), Effect.flatMap(flattenEffect))

/** Tree `flatMap`. */
export const flatMap: FlatMap.FlatMap<TreeTypeLambda>['flatMap'] =
  Function.dual(2, <A, B>(self: Tree<A>, f: (a: A) => Tree<B>) =>
    pipe(self, flatMapEffect(flow(f, Effect.succeed)), Effect.runSync),
  )

export const of = leaf

/** Monad instance for `Tree<A>`. */
export const Monad: MD.Monad<TreeTypeLambda> = {flatMap, ...Covariant, of}
