import {leaf, type Branch, type Tree} from '#tree'
import {Function, Record} from '#util'
import type {Predicate} from 'effect'
import fc from 'fast-check'

/** Tree arbitrary generation options. */
export interface ArbitraryOptions {
  /**
   * If true no leaves will be generated so that all trees will always have at
   * least a height of `1`. Default is `false`.
   */
  onlyBranches: boolean

  /**
   * Maximum depth of trees generated. An error is thrown if
   * `onlyBranches` is true but `maxDepth` is `0`.
   */
  maxDepth: number

  /** Max child count per branch. Default is `5`. */
  maxChildren: number

  /**
   * Ratio of trees generated that will be branches and not leaves. Expects
   * a ratio in the inclusive range of 0…1. Default is `¼`.
   */
  branchBias: number
}

/**
 * Numbered arbitrary tree generation options. A numbered arbitrary
 * tree has unique node values, one per each number in the inclusive
 * range `initialize`…`initialize + nodeCount - 1` where the root node
 * value is `initialize`.
 */
export interface NumberedArbitraryOptions extends ArbitraryOptions {
  /** Start numbering of nodes at this number. Default is `1`.*/
  initialize: number
}

/** props threaded through the recursive arbitrary for Tree<A>. */
export interface RuntimeOptions extends ArbitraryOptions {
  /**
   * Current depth from top. The value will be `0` for the root note,
   * `1` for the 1st level nodes, and so on.
   */
  currentDepth: number
}

/**
 * Type of functions that build a tree arbitrary from the arbitrary runtime
 * options.
 */
export interface GetArbitrary<A> {
  (options: RuntimeOptions): fc.Arbitrary<Tree<A>>
}

export const defaultOptions: ArbitraryOptions = {
  maxChildren: 5,
  branchBias: 1 / 4,
  onlyBranches: false,
  maxDepth: 3,
}

export const defaultNumberedOptions: NumberedArbitraryOptions = {
  ...defaultOptions,
  initialize: 1,
}

export const normalizeOptions = ({
  onlyBranches,
  ...options
}: Partial<ArbitraryOptions> = defaultOptions): ArbitraryOptions => {
  const final = {
    ...defaultOptions,
    ...Record.filterDefined(options),
    ...Record.filterDefined({onlyBranches}),
  }

  const {maxDepth, branchBias, maxChildren} = final

  if (onlyBranches && maxDepth === 0) {
    throw new Error('Cannot create a branch at maxDepth=0')
  }

  if (branchBias < 0 || branchBias >= 1) {
    const range = `0 ≤ branchBias < 1`
    const explain = `“${branchBias.toString()}” not in range ${range}.`
    throw new Error(`Out-of-bounds branchBias (${explain}).`)
  }

  if (maxChildren <= 0) {
    const explain = `“${maxChildren.toString()}” <= 0`
    throw new Error(`Out-of-bounds maxChildren (${explain}).`)
  }

  return final
}

export const normalizeNumberedOptions = ({
  onlyBranches,
  ...options
}: Partial<NumberedArbitraryOptions> = defaultNumberedOptions): ArbitraryOptions => ({
  ...defaultNumberedOptions,
  ...Record.filterDefined(options),
  ...Record.filterDefined({onlyBranches}),
})

/** If true, this level will be all leaves. */
export const isAtMaxDepth: Predicate.Predicate<RuntimeOptions> = ({
  maxDepth,
  currentDepth,
}) => currentDepth >= maxDepth

/**
 * Choose one of the given leaf or branch arbitraries according to the branch
 * bias.
 */
export const biasedOneOf =
  <A>(a: fc.Arbitrary<A>, branch: fc.Arbitrary<Branch<A>>) =>
  ({branchBias}: ArbitraryOptions): fc.Arbitrary<Tree<A>> => {
    const bias = Math.round(100 * branchBias)
    return fc.oneof(
      {weight: 100 - bias, arbitrary: a.map(leaf)},
      {weight: bias, arbitrary: branch},
    )
  }

export const nextDepth: Function.EndoOf<RuntimeOptions> = ({
  currentDepth,
  ...options
}: RuntimeOptions) => ({
  ...options,
  currentDepth: currentDepth + 1,
})
