# md2latex: Fast Academic Writing

Markdown is an efficient way to write documents, but is not usually appropriate
for generating academic-style documents. To fix this, `md2latex` is a simple
parser that transforms Markdown to IEEE-styled LaTeX. It is inspired by Pandoc.

## How to install

If you're using it from the command line for general purposes, you probably want
to install globally from npm:

    npm i -g md2latex

If you're using it to generate documentation for a specific project, you can
install it locally to the specific project:

    npm i md2latex --save-dev

To utilize the automatic LaTeX compilation and preview features, you will need
`latexmk` and `SumatraPDF` (if on Windows). If you utilize a different PDF
viewer, or a different LaTeX build tool, you can customize that in
`config.json`.

## How to use

If you installed globally, there should exist a command hook "md2latex" that
allows you to use it from the command line (i.e. on the PATH):

    md2latex docs/example.md

If it's installed locally, you will have to access the command wrapper file
manually:

    ./node_modules/md2latex/cmd.js docs/example.md

Your md file should have a copy of `IEEETrans.cls` beside it. A copy is provided
under `md2latex/lib/`.

For a simple example of syntax, see `example/test1.md`.

## Introduction

Markdown is typically used by the software development community for generating
code documentation and simple web content publishing (e.g. blogs). It is a
light-weight markup language designed to be human readable in its raw text
format, and is usually rendered as HTML.

On a number of fronts, Markdown is being used to drive literate programming
efforts. It has also been used for document generation by replacing the
"copy-and-paste workflow" in statistical analysis in order to improve
reproducibility in the sciences.

However, Markdown does not generate documents appropriate for traditional
academic publishing, such as publication to conference proceedings or research
journals. One promising solution is to convert Markdown to a format more
suitable for publication. One popular tool, Pandoc, is capable of
converting Markdown to LaTeX, but due to limitations in its internal document
representation, does not support many LaTeX features.

Pandoc can convert from and to many formats, and additional destination formats
can be specified using LUA scripts. However, one cannot specify custom input
formats without modifying Pandoc itself, which is intimidating as the Markdown
parser itself is over 2000 lines of sparsely commented Haskell code. This is a
problem, because there exist vital elements in LaTeX which do not exist in
vanilla Markdown, such as author sections, bibliographies, etc.

`md2latex` is a simple, extensible parser that transforms Markdown to
IEEE-styled LaTeX

## Markdown Parsing via Regular Expressions

To parse Markdown into an internal JSON object, we use regular expressions.
Since Markdown is ambiguous, parsing it using "regular" expressions (as in a
regular language) is not possible from a theoretical standpoint. In fact, any
context-free grammar for parsing Markdown (such as BNF) also becomes intractably
ambiguous.

However, JS-style regular expressions are not equivalent to what is
traditionally meant by a "regular expression". As well, certain structures
involving repeated find-replace operations are Turing complete. For this reason,
we approach parsing via repeated regular expression matching, with each element
type possessing a priority (order) in being matched.
