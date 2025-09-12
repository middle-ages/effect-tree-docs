import {Tree} from '#arbitrary'
import type {ArbitraryOptions} from '#arbitrary/Tree'
import type {TreeTypeLambda} from '#tree'
import {monoEquivalence, monoOrder} from 'effect-ts-laws'
import {testTypeclassLaws} from 'effect-ts-laws/vitest'
import type fc from 'fast-check'
import {describe} from 'vitest'
import {Applicative} from './Applicative.js'
import {Covariant} from './Covariant.js'
import {getEquivalence} from './Equivalence.js'
import {Foldable} from './Foldable.js'
import {Monad} from './Monad.js'
import {getOrder} from './Order.js'
import {Traversable} from './Traversable.js'

describe('Tree typeclass laws', () => {
  const props = (options: Partial<ArbitraryOptions>) => ({
    getEquivalence,
    getArbitrary: <A>(a: fc.Arbitrary<A>) => Tree.getArbitrary(a, options),
  })

  testTypeclassLaws<TreeTypeLambda>(
    props({
      maxChildren: 4,
      maxDepth: 4,
      branchBias: 1 / 5,
    }),
  )(
    {
      Applicative,
      Covariant,
      Equivalence: getEquivalence(monoEquivalence),
      Order: getOrder(monoOrder),
      Foldable,
      Monad,
    },
    {numRuns: 100},
  )

  testTypeclassLaws<TreeTypeLambda>(
    props({maxChildren: 2, maxDepth: 2, branchBias: 1 / 7}),
  )({Traversable}, {numRuns: 10})
})
