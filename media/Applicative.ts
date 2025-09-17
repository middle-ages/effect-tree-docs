import {
  Applicative as AP,
  Monoid,
  SemiApplicative as SA,
  Semigroup,
  SemiProduct as SP,
} from '@effect/typeclass'
import {Array, Function, pipe} from 'effect'
import {leaf} from '../tree/index.js'
import {type Tree, type TreeTypeLambda} from '../tree/types.js'
import {Pair} from '../util.js'
import {imap, map} from './Covariant.js'
import {flatMap} from './Monad.js'

/**
 * Cartesian product of two trees.
 * @category instances
 */
export const product: SA.SemiApplicative<TreeTypeLambda>['product'] =
  Function.dual(
    2,
    <A, B>(self: Tree<A>, that: Tree<B>): Tree<readonly [A, B]> =>
      pipe(
        self,
        flatMap(self => pipe(that, map(Pair.pair.withFirst(self)))),
      ),
  )

/**
 * @category instances
 */
export const productMany = SP.productMany<TreeTypeLambda>(map, product)

/**
 * Compute the cartesian product of multiple trees into a single tree.
 * Returns a leaf node containing an empty array if the input is empty.
 * @param collection - Cartesian product will be computed on this iterable of
 * trees.
 * @returns The tree that is the cartesian product of all given trees.
 * @category instances
 */
export const productAll: AP.Applicative<TreeTypeLambda>['productAll'] = <A>(
  collection: Iterable<Tree<A>>,
) => {
  const [head, ...tail] = Array.fromIterable(collection)
  return head === undefined ? leaf<A[]>([]) : productMany(head, tail)
}

/**
 * Applicative instance for {@link Tree}.
 * @category instances
 */
export const Applicative: AP.Applicative<TreeTypeLambda> = {
  of: leaf,
  imap,
  map,
  product,
  productMany,
  productAll,
}

/**
 * Creates an `Semigroup` for a `Tree<A>` type, given a `Semigroup`
 * for the underlying type `A`.
 * @category instances
 */
export const getSemigroup: <A>(
  F: Semigroup.Semigroup<A>,
) => Semigroup.Semigroup<Tree<A>> = SA.getSemigroup(Applicative)

/**
 * Creates a `Monoid` for a `Tree<A>` type, given a `Monoid`
 * for the underlying type `A`. `empty` will be a `leaf(M.empty)`.
 * @category instances
 */
export const getMonoid: <A>(F: Monoid.Monoid<A>) => Monoid.Monoid<Tree<A>> =
  AP.getMonoid(Applicative)
