import {fixTree, getValue, leaf, match, tree, type Tree, treeCata} from '#tree'
import * as TreeF from '#treeF'
import {Array, Effect, Function, pipe} from 'effect'

/**
 * Unzip a tree of `[A, B]` into a pair of congruent trees of types `A` and `B`.
 *
 * ```ts
 * const zippedTree: Tree<[string, number]> = tree(
 *   ['a', 1],
 *   [leaf(['b', 2])],
 * )
 *
 * const [left, right] = unzip(zippedTree)
 * //  left = branch('a', [leaf('b')])
 * // right = branch( 1 , [leaf( 2 )])
 * ```
 * @category ops
 */
export const unzip: <A, B>(t: Tree<[A, B]>) => [Tree<A>, Tree<B>] = tree =>
  pipe(tree, treeCata(unzipFold))

/**
 * Unzip a single level in a tree of `[A, B]` into a pair of trees of types `A`
 * and `B`.
 * @category fold
 */
export const unzipFold = <A, B>(
  t: TreeF.TreeF<[A, B], [Tree<A>, Tree<B>]>,
): [Tree<A>, Tree<B>] =>
  pipe(
    t,
    TreeF.match({
      onLeaf: ([a, b]): [Tree<A>, Tree<B>] => [
        fixTree<A>(TreeF.leafF<A>(a)),
        fixTree<B>(TreeF.leafF<B>(b)),
      ],
      onBranch: ([a, b], nodes) => {
        const [nodesA, nodesB] = Array.unzip(nodes)
        return [
          fixTree(TreeF.branchF(a, nodesA)),
          fixTree(TreeF.branchF(b, nodesB)),
        ]
      },
    }),
  )

/**
 * Just like {@link zipWith} except the given function returns its result in an
 * `Effect`.
 * @category ops
 */
export const zipWithEffect =
  <A, B, C>(f: (self: A, that: B) => C) =>
  (self: Tree<A>, that: Tree<B>): Effect.Effect<Tree<C>> => {
    const zip = Function.tupled(zipWithEffect(f)),
      value = f(getValue(self), getValue(that)),
      onLeaf = () => pipe(value, leaf, Effect.succeed)

    return pipe(
      self,
      match({
        onLeaf,
        onBranch: (_, selfForest) =>
          pipe(
            that,
            match({
              onLeaf,
              onBranch: (_, thatForest) =>
                Effect.suspend(() =>
                  pipe(
                    selfForest,
                    Array.zip(thatForest),
                    Effect.forEach(zip),
                    Effect.map(tree.flipped(value)),
                  ),
                ),
            }),
          ),
      }),
    )
  }

/**
 * Zip a pair of trees cropping to the smallest degree and depth, and apply the
 * given function.
 *
 * Returns the smallest matching tree of pairs, one taken from each tree at the
 * same position, and run the given function on this pair, returning a tree of
 * its results.
 * @category ops
 */
export const zipWith = <A, B, C>(
  self: Tree<A>,
  that: Tree<B>,
  f: (a: A, b: B) => C,
): Tree<C> => Effect.runSync(zipWithEffect(f)(self, that))

/**
 * Zip a pair of trees of types `A` and `B` into a single tree of `[A, B]`.
 * 
 * If their shapes do not match, the result will include only the intersection.
 * Any nodes not on the shape of the intersection of the two trees will  be
 * discarded.
 * 
 * See {@link zipThese} for a zip that does not crop and is therefore pleasantly
 * associative.
 *
 * ```ts
 * // Zip two trees of identical shape
 * const left: Tree<string> = branch('a', [branch('b', [of('c')])]),
        right: Tree<number> = branch( 1 , [branch( 2 , [of( 3 )])])

 * const zippedTree: Tree<[string, number]> = zip(left, right) 
 * // zippedTree = branch(
 * //   ['a', 1],
 * //   [branch(['b', 2], [of(['c', 3])])],
 * // )
 * 
 * // Zipping trees of different shapes crops to intersection
 * const left: Tree<string> = branch('a', [branch('b', [of('c')])]),
        right: Tree<number> = leaf( 1 )
 * const zippedTree: Tree<[string, number]> = pipe(right, zip(left))
 * // zippedTree = leaf(['a', 1])
 * ```
 * @category ops
 */
export const zip: {
  <A, B>(self: Tree<A>, that: Tree<B>): Tree<[A, B]>
  <B>(that: Tree<B>): <A>(self: Tree<A>) => Tree<[A, B]>
} = Function.dual(
  2,
  <A, B>(self: Tree<A>, that: Tree<B>): Tree<[A, B]> =>
    zipWith(self, that, (a, b) => [a, b]),
)
