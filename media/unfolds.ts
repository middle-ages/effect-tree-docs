import {Arrays, Edges, Indented, Paths} from '#codec'
import {
  annotateDepthUnfold,
  annotateLevelLabelsUnfold,
  cropDepthUnfold,
  levelTreeUnfold,
} from '#ops'
import {byParentUnfold} from '#tree'

export const unfolds = {
  annotateDepth: annotateDepthUnfold,
  annotateLevelLabels: annotateLevelLabelsUnfold,
  byParent: byParentUnfold,
  cropDepth: cropDepthUnfold,
  levelTree: levelTreeUnfold,
  paths: Paths.pathListUnfold,
  edges: Edges.decodeUnfold,
  arrays: Arrays.decodeUnfold,
  indented: Indented.decodeIndentedUnfold,
}
