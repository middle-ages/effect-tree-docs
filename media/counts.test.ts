import {assertDrawTree, numericTree} from '#test'
import {
  annotateFolder,
  leaf,
  map,
  treeCata,
  treeCataEffect,
  withForest,
  type Tree,
  type TreeEffectFolderOf,
} from '#tree'
import {Array, Effect, Function, pipe} from 'effect'
import {describe, expect, test} from 'vitest'
import {
  countOf,
  degreeFold,
  descendantCountFold,
  maximumDegreeFold,
  maximumHeightFold,
  maximumNodeDegree,
  maximumNodeHeight,
  nodeCount,
  nodeCountAtLeast,
  nodeCountAtLeastFold,
} from './counts.js'

describe('counting', () => {
  test('nodeCount', () => {
    expect(nodeCount(numericTree)).toBe(11)
  })

  test('maximumNodeHeight', () => {
    expect(maximumNodeHeight(numericTree)).toBe(4)
  })

  test('maximumNodeDegree', () => {
    expect(maximumNodeDegree(numericTree)).toBe(3)
  })

  describe('countOf', () => {
    const iut = (m: number) =>
      pipe(
        numericTree,
        countOf((n: number) => n >= m),
      )

    test('none', () => {
      expect(iut(42)).toBe(0)
    })

    test('all', () => {
      expect(iut(-42)).toBe(11)
    })

    test('some', () => {
      expect(iut(9)).toBe(3)
    })
  })

  describe('annotating with counts', () => {
    const assertAnnotated =
      (expected: string) => (actual: Tree<[number, number]>) => {
        pipe(
          actual,
          map(
            ([node, annotation]) =>
              `${node.toString()}:${annotation.toString()}`,
          ),
          assertDrawTree(expected),
        )
      }

    test('withDescendantCount', () => {
      pipe(
        numericTree,
        treeCata(annotateFolder(descendantCountFold)),
        assertAnnotated(`
┬1:11
├┬2:4
│├─3:1
│├─4:1
│└─5:1
├┬6:5
│├─7:1
│├─8:1
│└┬11:2
│ └─9:1
└─10:1`),
      )
    })

    test('withMaximumHeight', () => {
      pipe(
        numericTree,
        treeCata(annotateFolder(maximumHeightFold)),
        assertAnnotated(`
┬1:4
├┬2:2
│├─3:1
│├─4:1
│└─5:1
├┬6:3
│├─7:1
│├─8:1
│└┬11:2
│ └─9:1
└─10:1`),
      )
    })

    test('withDegree', () => {
      pipe(
        numericTree,
        treeCata(annotateFolder(degreeFold)),
        assertAnnotated(`
┬1:3
├┬2:3
│├─3:0
│├─4:0
│└─5:0
├┬6:3
│├─7:0
│├─8:0
│└┬11:1
│ └─9:0
└─10:0`),
      )
    })

    test('withMaximumDegree', () => {
      pipe(
        numericTree,
        treeCata(annotateFolder(maximumDegreeFold)),
        assertAnnotated(`
┬1:3
├┬2:3
│├─3:0
│├─4:0
│└─5:0
├┬6:3
│├─7:0
│├─8:0
│└┬11:1
│ └─9:0
└─10:0`),
      )
    })
  })

  describe('nodeCountAtLeast', () => {
    describe('true', () => {
      test('1 node', () => {
        expect(pipe('foo', leaf, nodeCountAtLeast(1))).toBe(true)
      })

      test('2 nodes', () => {
        expect(
          pipe('bar', leaf, Array.of, withForest('bar'), nodeCountAtLeast(2)),
        ).toBe(true)
      })
    })

    describe('true', () => {
      test('1 node', () => {
        expect(pipe('foo', leaf, nodeCountAtLeast(2))).toBe(false)
      })

      test('2 nodes', () => {
        expect(
          pipe('bar', leaf, Array.of, withForest('bar'), nodeCountAtLeast(3)),
        ).toBe(false)
      })
    })
  })

  describe('short-circuits', () => {
    let called = 0
    const fold = nodeCountAtLeastFold(4)
    const traceFold: TreeEffectFolderOf<number, void> = self => {
      called++
      return fold(self)
    }
    const isAtLeast = pipe(
      numericTree,
      treeCataEffect(traceFold),
      Effect.match({
        onFailure: Function.constTrue,
        onSuccess: Function.constFalse,
      }),
      Effect.runSync,
    )

    test('short-circuit', () => {
      expect(called).toBeLessThan(nodeCount(numericTree))
    })

    test('result', () => {
      expect(isAtLeast).toBe(true)
    })
  })
})
