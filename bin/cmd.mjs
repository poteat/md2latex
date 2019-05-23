#!/usr/bin/env node

import fs from "fs";
import minimist from "minimist";
import { execSync } from "child_process";
import md2latex from "../src/md2latex.mjs";
import config from "../config.json";

const path = minimist(process.argv.slice(2))._[0];
const ext = /(?<=\.)[^.]*?$/;
const dir = /(?<=\/)[^\/]*?$/;

if (!path) {
  console.log("Usage: ./cmd.js [filename]");
} else {
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
            for (let cmd of config.compileCommands) {
              execSync(cmdFill(cmd));
            }
            console.log("PDF successfully generated!");

            if (config.display) {
              for (let cmd of config.displayCommands) {
                execSync(cmdFill(cmd));
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
}
