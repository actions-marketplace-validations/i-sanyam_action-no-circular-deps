import * as core from '@actions/core';
import {
  detectNewCircularDependencies,
  generateCircularDependenciesLogFile,
} from './validate-circular-deps.js';
import { logInfo, logError, CLI_COLOR } from './log.js';

async function run() {
  try {
    const baseFilePath = core.getInput('baseFilePath');
    if (!baseFilePath) {
      core.info('baseFilePath not specified, will default to ./');
    } else {
      core.info(`baseFilePath:: ${baseFilePath}`);
    }
    const baseFilePathToUse = baseFilePath || './';
    const baseCircularDeps = [];

    const { newCircularDependencies, branchCircularDeps } = await detectNewCircularDependencies({
      baseCircularDependencies: baseCircularDeps,
      path: baseFilePathToUse,
    });
    const newCircularDepsFilePath = await generateCircularDependenciesLogFile(newCircularDependencies, 'new')
      .catch((e) => {
        process.exitCode = 1;
        logError(CLI_COLOR.FgYellow, 'Unable to write new circular dependencies file');
        logError(e && e.message);
      });
    const branchCircularDepsFilePath = await generateCircularDependenciesLogFile(branchCircularDeps, 'branch')
      .catch((e) => {
        process.exitCode = 1;
        logError(CLI_COLOR.FgYellow, 'Unable to write new circular dependencies file');
        logError(e && e.message);
      });

    const isCircularDependencyCountReduced = branchCircularDeps.length < baseCircularDeps.length;
    const isNewCircularDependencyIntroduced = newCircularDependencies.length > 0;
    const isCircularDependencyPresent = branchCircularDeps.length > 0;

    core.setOutput('newCircularDepsFilePath', newCircularDepsFilePath);
    core.setOutput('branchCircularDepsFilePath', branchCircularDepsFilePath);
    core.setOutput('isCircularDependencyCountReduced', isCircularDependencyCountReduced);
    core.setOutput('isNewCircularDependencyIntroduced', isNewCircularDependencyIntroduced);
    core.setOutput('isCircularDependencyPresent', isCircularDependencyPresent);

    // success cases
    if (isCircularDependencyCountReduced && !isNewCircularDependencyIntroduced) {
      // circular dependency count is reduced and no new circular dependency introduced
      logInfo(CLI_COLOR.FgGreen, '\nGood Job!');
      logInfo(`  You reduced Circular Dependencies from ${baseCircularDeps.length} to ${branchCircularDeps.length}.`);
      logInfo(CLI_COLOR.Bright, CLI_COLOR.FgYellow, 'Please update circular dependencies in baseFilePath');
      return;
    }

    if (!isNewCircularDependencyIntroduced) {
      return;
    }

    // error cases;

    if (branchCircularDeps.length > baseCircularDeps.length) {
      logError(CLI_COLOR.FgRed, `Expected ${baseCircularDeps.length} Circular Dependencies. Got ${branchCircularDeps.length}`);
    }
    if (isNewCircularDependencyIntroduced) {
      logError(CLI_COLOR.FgRed, `${newCircularDependencies.length} New circular dependencies detected.`);
    }
    core.setFailed('??? Failed!');
    process.exitCode = 2;
    return;
  } catch (error) {
    core.setFailed(error.message);
    core.setFailed('??? Failed due to an expected error!');
    process.exitCode = 3;
  }
}

run();
