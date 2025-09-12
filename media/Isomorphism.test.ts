import {
  getNumberedArbitrary,
  getStringArbitrary,
  pruferEncodableArbitrary,
} from '#arbitrary/Tree'
import {getEquivalence} from '#tree'
import {Array, Number, pipe, String} from '#util'
import {buildIsomorphismLaws, type LawSet} from 'effect-ts-laws'
import {testLawSets} from 'effect-ts-laws/vitest'
import type {NonEmptyArray} from 'effect/Array'
import fc from 'fast-check'
import {describe} from 'vitest'
import {
  ArraysIsomorphism,
  EdgeListIsomorphism,
  IndentedIsomorphism,
  PruferIsomorphism,
} from './Isomorphism.js'
import {getEdgeListEquivalence} from './edges.js'

const stringTreeArbitrary = getStringArbitrary()
const stringTreeEquivalence = getEquivalence(String.Equivalence)

const numericTreeArbitrary = getNumberedArbitrary({
  maxDepth: 3,
  maxChildren: 2,
  branchBias: 1 / 4,
})

const numericTreeEquivalence = getEquivalence(Number.Equivalence)

const edgeListEquivalence = getEdgeListEquivalence(Number.Equivalence)

const indentedArbitrary: fc.Arbitrary<NonEmptyArray<string>> =
  getStringArbitrary().map(IndentedIsomorphism(2).to)

const pruferCodeArbitrary: fc.Arbitrary<number[]> =
  pruferEncodableArbitrary.map(PruferIsomorphism.to)

// Test all codecs can encode/decode and decode/encode to identity, then reverse
// the isomorphism and check the law still holds. The codecs:
//
// 1. Indented
// 2. Arrays
// 3. Edges
// 4. Prüfer code
// 5. Paths
//
describe('Isomorphism laws', () => {
  const laws: LawSet[] = [
    // Indented
    ...buildIsomorphismLaws({
      a: stringTreeArbitrary,
      equalsA: stringTreeEquivalence,
    })({
      indented: {
        F: IndentedIsomorphism(2),
        b: indentedArbitrary,
        equalsB: Array.getEquivalence(String.Equivalence),
      },
    }),

    // Arrays
    ...buildIsomorphismLaws({
      a: numericTreeArbitrary,
      equalsA: numericTreeEquivalence,
    })({
      arrays: {
        F: ArraysIsomorphism(Number.Order),
        b: getNumberedArbitrary().map(ArraysIsomorphism(Number.Order).to),
        equalsB: pipe(
          Number.Equivalence,
          Array.getEquivalence,
          Array.getEquivalence,
        ),
      },

      // Edges
      edgeList: {
        F: EdgeListIsomorphism<number>(),
        b: numericTreeArbitrary.map(EdgeListIsomorphism<number>().to),
        equalsB: edgeListEquivalence,
      },
    }),

    // Prüfer code
    ...buildIsomorphismLaws({
      a: pruferEncodableArbitrary,
      equalsA: (self, that) => numericTreeEquivalence(self, that),
    })({
      prufer: {
        F: PruferIsomorphism,
        b: pruferCodeArbitrary,
        equalsB: Array.getEquivalence(Number.Equivalence),
      },
    }),
  ]

  testLawSets({numRuns: 20})(...laws)
})
