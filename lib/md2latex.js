const fs = require("fs");
const _ = require("lodash");

const regex = {
  title: /(?:^# )(.*)/m,
  authors: /## Authors\n\n((?:\n|.)*?)##/,
  authorSplit: /(?:.+(\n|$))+/g,
  authorName: /\*\*(.+)\*\*/,
  authorSubtitle: /.+(?:\n|$)((?:.|\n)*)/,
  abstractTitle: /(?:(?:.|\n)*?## ){2}(.*)/,
  abstractBody: /(?:(?:.|\n)*?## ){2}(?:.*)\n((?:.|\n)+?)##/,
  keywordsTitle: /(?:(?:.|\n)*?## ){3}(.*)/,
  keywordsBody: /(?:(?:.|\n)*?## ){3}(?:.*)\n((?:.|\n)+?)##/,
  sections: /(?:(?:.|\n)*?## ){3}(?:.*)\n(?:.|\n)+?(##(?:.|\n)*)##/,
  sectionSplit: /^##[^]+?(?=(?:(?:^## |$(?!\n))))/gm,
  sectionTitle: /^## (.+)/m,
  sectionContents: /^## .+([^]*)/,
  bibliographyTitle: /(?:.*)\n(?:.|\n)+?##(?:.|\n)*## (.*)/,
  bibliographyFilename: /(?:.*)\n(?:.|\n)+?##(?:.|\n)*## .*([^]*)/,
  subsection: /\n### (.*)\n([^]*?)(?=#|$)/,
  table: /(.+)\n?\[?(.*?)\]?\n\n((?:(?:\|.*)\n?)+)/,
  tableRows: /^\| [^-].*/gm,
  tableEntries: /[^\|]+/g,
  numberedList: /(?:\n\d+\. .*)+/,
  numberedListEntry: /(?<=\n\d+\. ).+/g,
  unorderedList: /(?:\n- .*)+/,
  unorderedListEntry: /(?<=\n- ).+/g,
  image: /^!\[(.*?)]\((.+?) "(.+)"\) ?(\d+.?\d*)?/m,
  mathBlock: /(.*):\n\n\$+([^]+?)\$+(?:\n\n|$)/,
  paragraph: /\S[^]+?(\n\n|$)/
};

module.exports = (data, latexCb, jsonCb = () => {}) => {
  let obj = {};

  const trim = s => {
    return s.replace(/^\s+|\s+$/g, "");
  };

  data = data.replace(/\r\n/g, "\n");

  // Read in title
  obj.title = data.match(regex.title)[1];

  // Read in authors
  let authors = data.match(regex.authors)[1];
  authors = authors.match(regex.authorSplit);
  obj.authors = [];
  for (author of authors) {
    obj.authors.push({
      authorName: trim(author.match(regex.authorName)[1]),
      authorSubtitle: trim(author.match(regex.authorSubtitle)[1])
    });
  }

  // Read in abstract
  obj.abstract = {
    abstractTitle: data.match(regex.abstractTitle)[1],
    abstractBody: trim(data.match(regex.abstractBody)[1])
  };

  // Read in keywords
  obj.keywords = {
    keywordsTitle: data.match(regex.keywordsTitle)[1],
    keywordsBody: trim(data.match(regex.keywordsBody)[1])
  };

  obj.markers = {
    image: [],
    table: [],
    mathBlock: [],
    section: [],
    subsection: []
  };

  // The main body of the document is divided into sections.  Each section is an array of images, text, lists, and/or subsections.
  let sections = data.match(regex.sections)[1];
  sections = sections.match(regex.sectionSplit);

  obj.sections = [];
  for (section of sections) {
    let sectionTitle = trim(section.match(regex.sectionTitle)[1]);
    let marker = sectionTitle.replace(" ", "").toLowerCase();
    obj.markers.section.push(marker);
    obj.sections.push({
      sectionTitle: sectionTitle,
      sectionMarker: marker,
      sectionContents: trim(section.match(regex.sectionContents)[1])
    });
  }

  // Read in bibliography title and filename first (do breadth-first parsing)
  obj.bibliography = {
    bibliographyTitle: data.match(regex.bibliographyTitle)[1],
    bibliographyFilename: trim(data.match(regex.bibliographyFilename)[1])
  };

  // Given a string, parse out all element types
  const readElements = search => {
    let elements = [];

    const matchSet = (expr, f) => {
      let seek;
      do {
        seek = search.match(expr);
        if (seek) {
          f(seek);
          search = search.replace(expr, "\n".repeat(seek[0].length));
        }
      } while (seek);
    };

    // Define element structure as correspondence between regular expressions
    // and functions to parse those regular expressions.
    structure = {
      subsection: seek => {
        let marker = seek[1].replace(" ", "").toLowerCase();
        obj.markers.subsection.push(marker);
        elements.push({
          type: "subsection",
          index: seek.index,
          subsectionTitle: seek[1],
          subsectionMarker: marker,
          subsectionContents: readElements(seek[2]).sort(sortByIndex)
        });
      },
      table: seek => {
        let rows = seek[3].match(regex.tableRows);
        let contents = [];
        let marker = seek[2];
        for (row of rows) {
          row = row.match(regex.tableEntries);
          let entries = [];
          for (entry of row) {
            entries.push(trim(entry));
          }
          contents.push(entries);
        }
        if (marker != "") {
          obj.markers.table.push(marker);
        }
        elements.push({
          type: "table",
          index: seek.index,
          tableCaption: seek[1],
          tableMarker: marker,
          tableContents: contents
        });
      },
      numberedList: seek => {
        let entries = seek[0].match(regex.numberedListEntry);
        elements.push({
          type: "numberedList",
          index: seek.index,
          entries: entries
        });
      },
      unorderedList: seek => {
        let entries = seek[0].match(regex.unorderedListEntry);
        elements.push({
          type: "unorderedList",
          index: seek.index,
          entries: entries
        });
      },
      image: seek => {
        let marker = seek[1];
        if (marker) {
          obj.markers.image.push(marker);
        }
        elements.push({
          type: "image",
          index: seek.index,
          imageCaption: seek[3],
          imageMarker: marker,
          imageFilename: seek[2],
          imageSize: seek[4] ? seek[4] : 2.5
        });
      },
      mathBlock: seek => {
        let marker = seek[1];
        if (marker) {
          obj.markers.mathBlock.push(marker);
        }
        elements.push({
          type: "mathBlock",
          index: seek.index,
          mathMarker: marker,
          mathContents: seek[2]
        });
      },
      paragraph: seek => {
        elements.push({
          type: "paragraph",
          index: seek.index,
          paragraphContents: trim(seek[0])
        });
      }
    };

    _.forEach(structure, (f, key) => {
      matchSet(regex[key], f);
    });

    return elements;
  };

  // Sections do not have a fixed structure, so we need to build a list of
  // elements, then sort them by what index they occur.  Once an element is
  // found, remove it from the section search-text.
  const sortByIndex = (a, b) => a.index - b.index;
  for (section of obj.sections) {
    section.sectionContents = readElements(section.sectionContents).sort(
      sortByIndex
    );
  }

  // Read in template
  fs.readFile(__dirname + "/latexStrings.json", (err, data) => {
    // Replace newlines with spaces
    const dl = s => {
      return s.replace(/\n/g, " ");
    };

    // Replace newlines with LaTeX-style newlines
    const nl = s => {
      return s.replace(/\n/g, "\\\\");
    };

    const tex = JSON.parse(data);
    let out = tex.header + tex.titleBegin + obj.title + tex.titleEnd;

    out += tex.authorSectionBegin;
    for (author of obj.authors) {
      out += tex.authorNameBegin + author.authorName + tex.authorNameEnd;
      out +=
        tex.authorSubtitleBegin +
        nl(author.authorSubtitle) +
        tex.authorSubtitleEnd;
      if (author != _.last(obj.authors)) {
        out += tex.authorConnective;
      }
    }
    out += tex.authorSectionEnd;

    out += tex.abstractBegin + obj.abstract.abstractBody + tex.abstractEnd;
    out += tex.keywordsBegin + nl(obj.keywords.keywordsBody) + tex.keywordsEnd;

    // Given a set of elements, return their serialized versions.  In the case
    // of subsection, utilize recursion.
    const writeElements = elements => {
      // Replace instances of [foob] with LaTeX-style citations (bib) or
      // references (figures), depending on what markers exist.
      let cite = s => {
        ref = /\[+(.+?)\]+/;
        let seek;
        do {
          seek = s.match(ref);
          if (seek) {
            let citation = true;
            _.forEach(obj.markers, (markers, type) => {
              if (markers.includes(seek[1])) {
                citation = false;
                s = s.replace(
                  ref,
                  tex.markers[type].begin +
                    tex.referenceBegin +
                    "$1" +
                    tex.referenceEnd +
                    tex.markers[type].end
                );
                return false;
              }
            });
            if (citation) {
              s = s.replace(ref, tex.citationBegin + "$1" + tex.citationEnd);
            }
          }
        } while (seek);
        return s;
      };

      let italicize = s => {
        return s.replace(/_(.+)_/g, "\\textit{$1}");
      };

      out = "";

      // We define a correspondence between elements and their LaTeX
      // serialization functions
      let structure = {
        paragraph: element => {
          out +=
            tex.paragraphBegin +
            italicize(cite(element.paragraphContents)) +
            tex.paragraphEnd;
        },
        unorderedList: element => {
          out += tex.unorderedListBegin;
          for (entry of element.entries) {
            out += tex.listEntryBegin + entry + tex.listEntryEnd;
          }
          out += tex.unorderedListEnd;
        },
        numberedList: element => {
          out += tex.numberedListBegin;
          for (entry of element.entries) {
            out += tex.listEntryBegin + entry + tex.listEntryEnd;
          }
          out += tex.numberedListEnd;
        },
        table: element => {
          out +=
            tex.tableCaptionBegin + element.tableCaption + tex.tableCaptionEnd;
          out += tex.tableLabelBegin + element.tableMarker + tex.tableLabelEnd;
          out += tex.tableBegin;
          let header = _.first(element.tableContents);
          for (entry of header) {
            out += tex.tableHeaderBegin + entry + tex.tableHeaderEnd;
            if (entry != _.last(header)) {
              out += tex.tableConnective;
            }
          }
          out += tex.tableHeaderFinal;
          for (row of element.tableContents) {
            if (row != _.first(element.tableContents)) {
              for (entry of row) {
                out += entry;
                if (entry != _.last(row)) {
                  out += tex.tableConnective;
                }
              }
              out += tex.tableRowEnd;
            }
          }
          out += tex.tableEnd;
        },
        image: element => {
          out += tex.imageBegin + element.imageSize + tex.imageWidthEnd;
          out += element.imageFilename + tex.imageEnd;
          out +=
            tex.imageCaptionBegin + element.imageCaption + tex.imageCaptionEnd;
          out += tex.imageLabelBegin + element.imageMarker + tex.imageLabelEnd;
          out += tex.imageFinal;
        },
        subsection: element => {
          out +=
            tex.subsectionNameBegin +
            element.subsectionTitle +
            tex.subsectionNameEnd;
          out +=
            tex.subsectionLabelBegin +
            element.subsectionMarker +
            tex.subsectionLabelEnd;
          out += writeElements(element.subsectionContents);
        },
        mathBlock: element => {
          out += tex.mathBlockBegin;
          if (element.mathMarker != "") {
            out += tex.mathLabelBegin + element.mathMarker + tex.mathLabelEnd;
          }
          out += trim(element.mathContents) + tex.mathBlockEnd;
        }
      };

      for (element of elements) {
        structure[element.type](element);
      }

      return out;
    };

    // Begin generating the major sections of the document
    for (section of obj.sections) {
      out += tex.sectionNameBegin + section.sectionTitle + tex.sectionNameEnd;
      out +=
        tex.sectionLabelBegin + section.sectionMarker + tex.sectionLabelEnd;
      out += writeElements(section.sectionContents);
    }

    // Generate the bibliography
    out +=
      tex.bibliographyBegin +
      obj.bibliography.bibliographyFilename +
      tex.bibliographyEnd;

    out += tex.footer;

    // Return generated LaTeX
    latexCb(out);
  });

  // Optionally, return the internal object for debugging purposes
  jsonCb(obj);
};
