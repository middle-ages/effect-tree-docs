import {branch, of} from '#tree'
import {describe, expect, test} from 'vitest'
import {pipe} from 'effect'
import {assertDrawTree, drawTree} from '#test'
import {getTheme} from '#draw'

test('leaf', () => {
  pipe('a', of, assertDrawTree('\n─a'))
})

test('One branch one leaf', () => {
  pipe(branch('a', [of('b')]), assertDrawTree('\n┬a\n└─b'))
})

describe(`multiline labels`, () => {
  test(`leaf`, () => {
    const tree = branch('a', [
      of('b1\nb2\nb3'),
      branch('c', [of('d'), of('e1\ne2\ne3'), of('f')]),
      of('g1\ng2\ng3'),
    ])

    pipe(
      tree,
      assertDrawTree(`
┬a
├─b1
│ b2
│ b3
├┬c
│├─d
│├─e1
││ e2
││ e3
│└─f
└─g1
  g2
  g3`),
    )
  })

  test(`branch`, () => {
    const tree = branch('a', [
      of('b'),
      branch('c1\nc2\nc3', [of('d'), of('e'), of('f')]),
      of('g'),
    ])

    pipe(
      tree,
      assertDrawTree(`
┬a
├─b
├┬c1
││c2
││c3
│├─d
│├─e
│└─f
└─g`),
    )
  })

  test(`both`, () => {
    const tree = branch('a1\na2', [
      of('b1\nb2'),
      branch('c1\nc2', [of('d1\nd2'), of('e1\ne2')]),
      branch('f1\nf2', [of('g1\ng2')]),
    ])

    pipe(
      tree,
      assertDrawTree(`
┬a1
│a2
├─b1
│ b2
├┬c1
││c2
│├─d1
││ d2
│└─e1
│  e2
└┬f1
 │f2
 └─g1
   g2`),
    )
  })
})

describe('nodeCount≔11', () => {
  const tree = branch('a', [
    of('b'),
    branch('c', [of('d'), of('e')]),
    branch('f', [of('g'), branch('h', [of('i'), of('j')]), of('k')]),
  ])

  test('theme≔“thin”', () => {
    pipe(
      tree,
      assertDrawTree(`
┬a
├─b
├┬c
│├─d
│└─e
└┬f
 ├─g
 ├┬h
 │├─i
 │└─j
 └─k`),
    )
  })

  test('theme≔“doubleSpaceThin”', () => {
    expect(drawTree(tree, getTheme('doubleSpaceThin'))).toBe(`
┬a
│
├──b
│
├─┬c
│ │
│ ├──d
│ │
│ └──e
│
└─┬f
  │
  ├──g
  │
  ├─┬h
  │ │
  │ ├──i
  │ │
  │ └──j
  │
  └──k
`)
  })

  test('theme≔“rounded”', () => {
    expect(drawTree(tree, getTheme('rounded'))).toBe(`
┬a
├─b
├┬c
│├─d
│╰─e
╰┬f
 ├─g
 ├┬h
 │├─i
 │╰─j
 ╰─k`)
  })

  describe('theme≔“unix”', () => {
    test('single line nodes', () => {
      expect(drawTree(tree, getTheme('unix'))).toBe(`
─a
 ├─b
 ├─c
 │ ├─d
 │ └─e
 └─f
   ├─g
   ├─h
   │ ├─i
   │ └─j
   └─k`)
    })

    test('multi line nodes', () => {
      const tree = branch('a1\na2', [
        of('b'),
        branch('c1\nc2', [of('d'), of('e1\ne2')]),
        branch('f', [of('g1\ng2')]),
      ])

      expect(drawTree(tree, getTheme('unix'))).toBe(`
─a1
 │a2
 ├─b
 ├─c1
 │ │c2
 │ ├─d
 │ └─e1
 │    e2
 └─f
   └─g1
      g2`)
    })
  })

  test('theme≔“unixRounded”', () => {
    expect(drawTree(tree, getTheme('unixRounded'))).toBe(`
─a
 ├─b
 ├─c
 │ ├─d
 │ ╰─e
 ╰─f
   ├─g
   ├─h
   │ ├─i
   │ ╰─j
   ╰─k`)
  })

  test('theme≔“thick”', () => {
    expect(drawTree(tree, getTheme('thick'))).toBe(`
┳a
┣━b
┣┳c
┃┣━d
┃┗━e
┗┳f
 ┣━g
 ┣┳h
 ┃┣━i
 ┃┗━j
 ┗━k`)
  })

  test('theme≔“space”', () => {
    expect(drawTree(tree, getTheme('space'))).toBe(`
 a
   b
   c
     d
     e
   f
     g
     h
       i
       j
     k`)
  })

  test('theme≔“bullets”', () => {
    expect(drawTree(tree, getTheme('bullets'))).toBe(`
 ∘a
   ∙b
   ∘c
     ∙d
     ∙e
   ∘f
     ∙g
     ∘h
       ∙i
       ∙j
     ∙k`)
  })

  test('theme≔“ascii”', () => {
    expect(drawTree(tree, getTheme('ascii'))).toBe(`
+a
+--b
+-+c
| +--d
| '--e
'-+f
  +--g
  +-+h
  | +--i
  | '--j
  '--k`)
  })
})
