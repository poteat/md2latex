# An academic title

## Authors

**James Kirk, Captain**
Starfleet Academy
San Francisco, California 5555

**Jean-Luc Picard, 1st Officer**

## Abstract

This article describes how to use the IEEEtran class with LaTeX to produce high
quality typeset papers that are suitable for submission to the Institute of
Electrical and Electronics Engineers (IEEE). IEEEtran can produce conference,
journal and technical note (correspondence) papers with a suitable choice of
class options. This document was produced using IEEEtran in journal mode.

## Keywords

Class, IEEEtran, LATEX, paper, style, template, typesetting.

## Introduction

List of Historical Figures
[historicalFigures]

| foobar | set amet            |
| ------ | ------------------- |
| f1     | \texttt{s1 \|\| s2} |
| f2     | \texttt{s2 && f2}   |

With a recent IEEEtran class file, a computer running LATEX, and a basic
understanding of the LATEX language, an author can produce professional quality
typeset research papers very quickly, inexpensively, and with minimal effort.
The purpose of this article is to serve as a user guide of [historicalFigures]
IEEEtran LATEX class and to document its unique features and behavior.

1. List item
2. Art
3. Echo fox tango

This document applies to version 1.7 and later of IEEEtran. Prior versions do
not have all of the features described here. IEEEtran will display the version
number on the user’s console when a document using it is being compiled. The
latest version of IEEEtran and its support files can be obtained from IEEE’s web
site [Firstman:2014], or CTAN [Fubtutorial:2014]. This latter site may have some
additional material, such as beta test versions and files related to non-IEEE
uses of IEEEtran. See the IEEEtran homepage [Bookman:2014] for frequently asked
questions and recent news about IEEEtran.

- foob
- foobar
- foo amet

```ts
/**
 * @name alg:always
 * @input Array of reals $x, y$ of size $n$
 * @return Array of reals, size $n$
 * @desc 'Always' operator. Resultant array is true up until $x_i$ is false.
 */
function A(x: Array<number>, y) {
  let alpha: boolean = true;
  alpha = false;
  for (let x_i of x) {
    alpha = x_i && alpha;
    x_i = Number(alpha);
  }
  return x;
}
```

We now describe the method illustrated by [alg:always].

### Subsection Title

Now, we add some itemize and enumerate. Now, we add some itemize and enumerate.
Now, we add some itemize and enumerate. Now, we add some itemize and enumerate.

Dorem lipsum set amet foo bar.

1. subList item
2. Arteful
3. Foxtrot tangerine

## New Section of Things

The conclusion goes here. The conclusion goes here. The conclusion goes here.
The conclusion goes here. We are currently in [newsectionofthings].

![image_label](img/test1_cat.jpg "This is the image caption") 3.5

## Bibliography

test1.bib
