const fs = require("fs");
const \_ = require("lodash");

const regex = {
title: /(?:^# )(._)/m,
authors: /## Authors\n\n((?:\n|.)_?)##/,
authorSplit: /(?:.+(\n|$))+/g,
  authorName: /\*\*(.+)\*\*/,
  authorSubtitle: /.+(?:\n|$)((?:.|\n)_)/,
abstractTitle: /(?:(?:.|\n)_?## ){2}(._)/,
abstractBody: /(?:(?:.|\n)_?## ){2}(?:._)\n((?:.|\n)+?)##/,
keywordsTitle: /(?:(?:.|\n)_?## ){3}(._)/,
keywordsBody: /(?:(?:.|\n)_?## ){3}(?:._)\n((?:.|\n)+?)##/,
sections: /(?:(?:.|\n)_?## ){3}(?:._)\n(?:.|\n)+?(##(?:.|\n)_)##/,
sectionSplit: /^##[^]+?(?=(?:(?:^## |$(?!\n))))/gm,
  sectionTitle: /^## (.+)/m,
  sectionContents: /^## .+([^]*)/,
  bibliographyTitle: /(?:.*)\n(?:.|\n)+?##(?:.|\n)*## (.*)/,
  bibliographyFilename: /(?:.*)\n(?:.|\n)+?##(?:.|\n)*## .*([^]*)/,
  subsection: /\n### (.*)\n([^]*?)(?=#|$)/,
table: /(.+)\n?\[?(._?)\]?\n\n((?:(?:\|._)\n)+)/,
tableRows: /^\| [^-]._/gm,
tableEntries: /[^\|]+/g,
numberedList: /(?:\n\d+\. ._)+/,
numberedListEntry: /(?<=\n\d+\. ).+/g,
unorderedList: /(?:\n- ._)+/,
unorderedListEntry: /(?<=\n- ).+/g,
image: /^!\[(._?)]\((.+?) "(.+)"\)/m,
paragraph: /[^]+?(\n\n|\$)/
};

const trim = s => {
return s.replace(/^\s+|\s+\$/g, "");
};

let obj = {};

fs.readFile("./tests/test1.md", "utf8", (err, data) => {
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

// The main body of the document is divided into sections. Each section is an array of images, text, lists, and/or subsections.
let sections = data.match(regex.sections)[1];
sections = sections.match(regex.sectionSplit);

obj.sections = [];
for (section of sections) {
obj.sections.push({
sectionName: trim(section.match(regex.sectionTitle)[1]),
sectionContents: trim(section.match(regex.sectionContents)[1])
});
}

// Read in bibliography title and filename first (do breadth-first parsing)
obj.bibliography = {
bibliographyTitle: data.match(regex.bibliographyTitle)[1],
bibliographyFilename: trim(data.match(regex.bibliographyFilename)[1])
};

// Given a string, parse out all "terminal" element types (all but subsection)
const parseElements = search => {
let elements = [];
let seek;
let removed = 0;

    // Read in tables
    do {
      seek = search.match(regex.table);
      if (seek) {
        let rows = seek[3].match(regex.tableRows);
        let contents = [];
        for (row of rows) {
          row = row.match(regex.tableEntries);
          let entries = [];
          for (entry of row) {
            entries.push(trim(entry));
          }
          contents.push(entries);
        }
        elements.push({
          type: "table",
          index: seek.index + removed,
          tableCaption: seek[1],
          tableMarker: seek[2],
          tableContents: contents
        });
        removed += seek[0].length;
      }
      search = search.replace(regex.table, "");
    } while (seek);

    // Read in numbered lists
    do {
      seek = search.match(regex.numberedList);
      if (seek) {
        let entries = seek[0].match(regex.numberedListEntry);
        elements.push({
          type: "numberedList",
          index: seek.index + removed,
          entries: entries
        });
        removed += seek[0].length;
      }
      search = search.replace(regex.numberedList, "");
    } while (seek);

    // Read in unordered lists
    do {
      seek = search.match(regex.unorderedList);
      if (seek) {
        let entries = seek[0].match(regex.unorderedListEntry);
        elements.push({
          type: "unorderedList",
          index: seek.index + removed,
          entries: entries
        });
        removed += seek[0].length;
      }
      search = search.replace(regex.unorderedList, "");
    } while (seek);

    // Read in images
    do {
      seek = search.match(regex.image);
      if (seek) {
        elements.push({
          type: "image",
          index: seek.index + removed,
          imageCaption: seek[3],
          imageMarker: seek[1],
          imageFilename: seek[2]
        });
        removed += seek[0].length;
      }
      search = search.replace(regex.image, "");
    } while (seek);

    // Read in paragraphs
    do {
      seek = search.match(regex.paragraph);
      if (seek) {
        elements.push({
          type: "paragraph",
          index: seek.index + removed,
          paragraphContents: trim(seek[0])
        });
        removed += seek[0].length;
      }
      search = search.replace(regex.paragraph, "");
    } while (seek);

    return elements;

};

// Sections do not have a fixed structure, so we need to build a list of
// elements, then sort them by what index they occur. Once an element is
// found, remove it from the section search-text.
const sortByIndex = (a, b) => a.index - b.index;
for (section of obj.sections) {
let elements = [];
let search = section.sectionContents;
let seek;

    // Read in subsections
    do {
      seek = search.match(regex.subsection);
      if (seek) {
        elements.push({
          type: "subsection",
          index: seek.index,
          subsectionTitle: seek[1],
          subsectionContents: parseElements(seek[2]).sort(sortByIndex)
        });
      }
      search = search.replace(regex.subsection, "");
    } while (seek);

    elements = elements.concat(parseElements(search));
    elements.sort(sortByIndex);

    section.sectionContents = elements;

}

// Pre-build a list of markers for bibliography / reference processing later
obj.markers = {
imageMarkers: [],
tableMarkers: []
};
const addMarker = element => {
if (element.type == "image") {
obj.markers.imageMarkers.push(element.imageMarker);
} else if (element.type == "table") {
obj.markers.tableMarkers.push(element.tableMarker);
}
};
for (section of obj.sections) {
for (element of section.sectionContents) {
addMarker(element);
if (element.type == "subsection") {
for (subsectionElement of element.subsectionContents) {
addMarker(subsectionElement);
}
}
}
}

// Read in template
fs.readFile("latexStrings.json", (err, data) => {
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

    // Given a terminal element, return a tex string representation
    const elementToTex = element => {
      // Replace instances of [foob] with LaTeX-style citations (bib) or references (figures)
      const cite = s => {
        ref = /\[+(.+?)\]+/;
        let seek;
        do {
          seek = s.match(ref);
          if (seek) {
            if (obj.markers.imageMarkers.includes(seek[1])) {
              s = s.replace(
                ref,
                tex.imageReferenceBegin + "$1" + tex.imageReferenceEnd
              );
            } else if (obj.markers.tableMarkers.includes(seek[1])) {
              s = s.replace(
                ref,
                tex.tableReferenceBegin + "$1" + tex.tableReferenceEnd
              );
            } else {
              s = s.replace(ref, tex.citationBegin + "$1" + tex.citationEnd);
            }
          }
        } while (seek);
        return s;
      };

      out = "";

      if (element.type == "paragraph") {
        out +=
          tex.paragraphBegin +
          cite(element.paragraphContents) +
          tex.paragraphEnd;
      } else if (element.type == "unorderedList") {
        out += tex.unorderedListBegin;
        for (entry of element.entries) {
          out += tex.listEntryBegin + entry + tex.listEntryEnd;
        }
        out += tex.unorderedListEnd;
      } else if (element.type == "numberedList") {
        out += tex.numberedListBegin;
        for (entry of element.entries) {
          out += tex.listEntryBegin + entry + tex.listEntryEnd;
        }
        out += tex.numberedListEnd;
      } else if (element.type == "table") {
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
      } else if (element.type == "image") {
        out += tex.imageBegin + element.imageFilename + tex.imageEnd;
        out +=
          tex.imageCaptionBegin + element.imageCaption + tex.imageCaptionEnd;
        out += tex.imageLabelBegin + element.imageMarker + tex.imageLabelEnd;
        out += tex.imageFinal;
      }

      return out;
    };

    // Begin generating the major sections of the document
    for (section of obj.sections) {
      out += tex.sectionNameBegin + section.sectionName + tex.sectionNameEnd;

      for (element of section.sectionContents) {
        if (element.type == "subsection") {
          out +=
            tex.subsectionNameBegin +
            element.subsectionTitle +
            tex.subsectionNameEnd;

          for (subsectionElement of element.subsectionContents) {
            out += elementToTex(subsectionElement);
          }
        } else {
          out += elementToTex(element);
        }
      }
    }

    // Generate the bibliography
    out +=
      tex.bibliographyBegin +
      obj.bibliography.bibliographyFilename +
      tex.bibliographyEnd;

    out += tex.footer;

    // Write generated LaTeX to file
    fs.writeFile("./tests/test1.tex", out, err => {
      if (!err) console.log("LaTeX generation success!");
    });

});

// Write to JSON object file for verification/testing purposes
fs.writeFile("./tests/test1.json", JSON.stringify(obj, null, 2), err => {
if (!err) console.log("JSON generation success!");
});
});
