/**
 * Tree Equivalence.
 * @packageDocumentation
 */
import {Array, Effect, Equivalence, flow, pipe} from 'effect'
import {constFalse, constTrue, tupled} from 'effect/Function'
import {destruct} from '../tree/index.js'
import type {Tree} from '../tree/types.js'

/**
 * Creates an `Equivalence` for a `Tree<A>` type, given an Equivalence for the
 * underlying type `A`.
 *
 * The equivalence will scan every node of both trees to make sure that are the
 * same, but will short-circuit on a mismatch.
 */
export const getEquivalence = <A>(
  equalsA: Equivalence.Equivalence<A>,
): Equivalence.Equivalence<Tree<A>> =>
  flow(
    getEquivalenceEffect(equalsA),
    Effect.match({
      onFailure: constFalse,
      onSuccess: constTrue,
    }),
    Effect.runSync,
  )

export const getEquivalenceEffect =
  <A>(equalsA: Equivalence.Equivalence<A>) =>
  (self: Tree<A>, that: Tree<A>): Effect.Effect<void, undefined> => {
    const equals = getEquivalenceEffect(equalsA)
    const [[selfValue, selfForest], [thatValue, thatForest]] = [
      destruct(self),
      destruct(that),
    ]

    return !equalsA(selfValue, thatValue) ||
      selfForest.length !== thatForest.length
      ? Effect.fail(void {})
      : Array.isNonEmptyReadonlyArray(selfForest)
        ? Effect.suspend(() =>
            pipe(
              Array.zip(selfForest, thatForest),
              Effect.forEach(tupled(equals)),
            ),
          )
        : Effect.succeed({})
  }
