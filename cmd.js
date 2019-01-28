#!/usr/bin/env node

const fs = require("fs");
const args = require("minimist")(process.argv.slice(2));
const md2latex = require("./lib/md2latex");
const exec = require("child_process").execSync;

const path = args._[0];
const ext = /(?<=\.)[^.]*?$/;
const dir = /(?<=\/)[^\/]*?$/;
const config = require("./config.json");

if (!path) {
  console.log("Usage: ./cmd.js [filename]");
  return;
}

fs.readFile(path, "utf8", (err, data) => {
  if (err) {
    throw err;
  }
  md2latex(
    data,
    latex => {
      console.log("LaTeX successfully generated!");
      let fullTexPath = path.replace(ext, "tex");
      let outDirectory = path.replace(dir, "");
      fs.writeFile(fullTexPath, latex, err => {
        if (err) throw err;

        let cmdFill = s => {
          let ext = /(?<=\.)[^.]*?$/;
          let file = /(?<=\/)[^\/]*?$/;
          let fullTexPath = path.replace(ext, "tex");
          let fullOutPath = path.replace(ext, "pdf");
          let outDirectory = path.replace(file, "");
          s = s.replace(/\$FILE/g, '"' + fullTexPath + '"');
          s = s.replace(/\$OUTFILE/g, '"' + fullOutPath + '"');
          s = s.replace(/\$PATH/g, '"' + outDirectory + '"');
          return s;
        };

        if (config.compile) {
          for (cmd of config.compileCommands) {
            exec(cmdFill(cmd));
          }
          console.log("PDF successfully generated!");

          if (config.display) {
            for (cmd of config.displayCommands) {
              exec(cmdFill(cmd));
            }
          }
        }
      });
    },
    json => {
      console.log("JSON successfully generated!");
      fs.writeFile(
        path.replace(ext, "json"),
        JSON.stringify(json, null, 2),
        err => {
          if (err) throw err;
        }
      );
    }
  );
});
