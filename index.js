#!/usr/bin/env node

// This script just watches files and chains a run of eslint (with fixes enabled) and then restarting nodemon
// However we fix 2 problems that are common with using these packages, especially together
// 1 - when eslint fixes files, we dont trigger an extra nodemon restart (we skip the first one by hooking into eslint and detecting fixes)
// 2 - if linting fails or starting the server fails, we still just watch the files and start/restart properly, rather than dying

const fs = require('fs');
const _ = require('lodash');
const nodemon = require('nodemon');
const chokidar = require('chokidar');
const { CLIEngine } = require('eslint');
const colors = require('colors');

const [node, script, ...args] = process.argv; // eslint-disable-line no-unused-vars

// try to load config from package.json - looking for `nodemonConfig` key
const packageJson = JSON.parse(fs.readFileSync(__dirname + '/../../package.json'));
const { nodemonConfig } = packageJson;

// you can pass in the script to run or it will default to the "main" in package.json
const mainScript = args[0] || packageJson.main;

const eslintCLI = new CLIEngine({
  fix: true,
  cache: true,
  ignorePath: '.gitignore',
});
const formatter = eslintCLI.getFormatter();

let appProcess;
function runLinter() {
  // run eslint w/ fixes
  const report = eslintCLI.executeOnFiles(nodemonConfig.watch);
  CLIEngine.outputFixes(report);

  // output Lint results
  console.log(formatter(report.results));

  // return info on whether any fixes were made
  return {
    fixes: _.some(report.results, 'output'),
    errors: _.some(report.results, (f) => f.errorCount > 0),
    fatal: _.some(report.results, (file) => _.some(file.messages, { fatal: true })),
  };
}
function startServer() {
  if (process.env.LINT_ONLY) return;
  if (appProcess) {
    console.log('>> Restarting server <<'.green);
    appProcess.restart();
  } else {
    console.log('>> Starting server <<'.green);

    const nodemonOptions = {
      script: mainScript,
      watch: false,
      inspect: true,
    };

    if (nodemonConfig.exec) nodemonOptions.exec = nodemonConfig.exec;

    appProcess = nodemon(nodemonOptions);
  }
}
function stopServer() {
  nodemon.emit('quit');
  appProcess = null;
}

let ignoreNextChange = false;

function lintAndRun() {
  if (ignoreNextChange) {
    ignoreNextChange = false;
    return;
  }

  const lintResults = runLinter();

  if (lintResults.fatal) {
    console.log('>> Fatal error detected by lint <<'.red);
    stopServer();
    console.log('>> FIX FATAL ERRORS TO START SERVER <<'.red);
    return;
  }

  if (lintResults.fixes) ignoreNextChange = true;

  if (lintResults.errors) {
    console.log('>> Errors detected, fix errors first to continue running code <<'.red);
    stopServer();
    return;
  }

  startServer();
}

// watch files for changes, run linter and restart server
chokidar
  .watch(nodemonConfig.watch, {
    ignored: [
      'node_modules', // ignore node_modules
      /(^|[/\\])\../, // ignore anything starting with .
      ...(nodemonConfig.ignore || []),
    ],
  })
  .on('change', (event, path) => {
    lintAndRun();
  });

lintAndRun();

//
// pass through exit to running app process
function exit() {
  console.log('>>> Shutting down dev server <<<'.red);
  nodemon.emit('quit');
  process.exit();
}
// explicitly exit on signal
process.on('SIGTERM', exit);
process.on('SIGINT', exit);
