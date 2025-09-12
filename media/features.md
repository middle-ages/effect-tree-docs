# Features

1. [Tree Operations](#tree-operations)
1. [Tree Codecs](#tree-codecs)
1. [Tree Instances](#tree-instances)
1. [Drawing Trees](#drawing-trees)
1. [Tree Generation](#tree-generation)

## Tree Operations

1. A generic tree data structure and all the basic functions required to manipulate immutable instances.
1. Versions of `map`/`flatMap`/`traverse` and similar functions that take _effectful_ functions. You can choose the traversal order when running these functions as pre-order (parents _before_ their children) or post-order (parents _after_ their children).
1. Measure node counts/heights/depth/degree, crop by depth, filter trees [unfold level trees](../src/ops/levels.ts#L132), select subtrees, zip/unzip trees, and traverse in any order.
1. Annotate nodes with their _level index_, for example `2.3.11.1`, encoding their _path from root_.
1. Numeric and boolean folds on nodes. For example _sum_ all nodes, find maximum node value for some given order, or check if all nodes are `true`. All operations [Short-circuit](../src/ops/counts.test.ts#L176) whenever possible.
1. Folds can operate on entire trees, _replace_ nodes, _annotate_ nodes, and are composable to tuples and structs. This allows you to _count nodes_, _annotate with depth_, and _crop depth_, for example, in a single fused iteration over the tree.

## Tree Codecs

Encode/decode losslessly to/from different tree encodings.

| Name           |     Codec Source Foldr         |
|----------------|--------------------------------|
| Nested arrays  | [source](../src/codec/arrays)  |
| Edge lists     | [source](../src/codec/edges)   |
| Path List      | [source](../src/codec/paths)   |
| Prüfer codes   | [source](../src/codec/prufer)  |
| Indented string| [source](../src/codec/indented)|

[Law tests](../src/codec/Isomorphism.test.ts) test encode/decode round-trip.

## Tree Instances

| Name        |            Instance                        |                           Typeclass                                                           |                                                             Law                                                   |
|-------------|--------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Applicative | [source](../src/instances/Applicative.ts)  | [source](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/src/Applicative.ts) | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/parameterized/Applicative.ts) |
| Covariant   | [source](../src/instances/Covariant.ts)    | [source](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/src/Covariant.ts)   | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/parameterized/Covariant.ts)   |
| Equivalence | [source](../src/instances/Equivalence.ts)  | [source](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Equivalence.ts)    | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/concrete/Equivalence.ts)      |
| Foldable    | [source](../src/instances/Foldable.ts)     | [source](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/src/Foldable.ts)    | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/parameterized/Foldable.ts)    |
| Monad       | [source](../src/instances/Monad.ts)        | [source](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/src/Monad.ts)       | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/parameterized/Monad.ts)       |
| Order       | [source](../src/instances/Order.ts)        | [source](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Order.ts)          | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/concrete/Order.ts)            |
| Traversable | [source](../src/instances/Traversable.ts)  | [source](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/src/Traversable.ts) | [source](https://github.com/middle-ages/effect-ts-laws/tree/main/src/laws/typeclass/parameterized/Traversable.ts) |

Laws are listed
_[in the book of laws](https://middle-ages.github.io/effect-ts-laws-docs/catalog-of-laws.html)_.

## Drawing Trees

Draw trees for terminal output. Customize layout, ANSI colors, and symbols.

## Tree Generation

1. A customizable arbitrary for trees with variants for branches, ordered numeric trees, and more.
1. Enumerate trees and go forwards and backwards in the list of possible labeled trees for better control of test data.
