const inquirer = require('inquirer');
const readline = require('readline');
const semver = require('semver');
const chalk = require('chalk');
const {wait, execPromise, spawnPromise, readPackageJSON} = require('./utils');

class DokkuDeploy {
  init() {
    // prechecks
    this.cwd = process.cwd();
    return Promise.resolve().then(() => {
      return execPromise('[ -d .git ] || git rev-parse --git-dir').catch((err) => {
        throw new Error('Not a git repository (or any of the parent directories)');
      });
    }).then(() => {
      return readPackageJSON(this.cwd).catch(() => {
        throw new Error('Not a Node.js project');
      });
    }).then((app) => {
      console.log(chalk.magenta('Dokku Deploy CLI'));
      console.log(chalk.yellow('Project:'), app.name, '-', chalk.cyan(app.version), '\n');
      return this.mainMenu();
    });
  }

  mainMenu() {
    return inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: 'What would you like to do?',
      choices: [
        { name: 'Bump, Tag & Deploy', value: 'bump-tag-deploy' },
        { name: 'Bump & Tag', value: 'bump-tag' },
        { name: 'Deploy Tag', value: 'deploy' }
      ]
    }).then((answers) => {
      switch (answers.choice) {
        case 'bump-tag-deploy':
          return this.bumpTagAndDeployMenu();
          break;
        case 'bump-tag':
          return this.bumpAndTagMenu();
          break;
        case 'deploy':
          return this.selectTagAndDeploy();
          break;
      }
    });
  }
  bumpTagAndDeployMenu() {
    return this.bumpAndTagMenu().then((version) => {
      this.deployTag(version);
    })
  }

  bumpAndTagMenu() {
    return inquirer.prompt({
      type: 'list',
      name: 'bump',
      message: 'Select the type of bump to perform:',
      default: 'patch',
      choices: [
        { name: 'Major', value: 'major' },
        { name: 'Minor', value: 'minor' },
        { name: 'Patch', value: 'patch' },
        { name: 'Pre-Major', value: 'pre-major' },
        { name: 'Pre-Minor', value: 'pre-minor' },
        { name: 'Pre-Patch', value: 'pre-patch' },
        { name: 'Pre-Release', value: 'prerelease' }
      ]
    }).then((answers) => {
      return this.bumpAndTag(answers.bump);
    });
  }

  selectTagAndDeploy() {
    return execPromise('git tag -l --sort="-version:refname"').then((raw) => {
      const tags = raw.trim().split('\n');
      return inquirer.prompt({
        type: 'list',
        name: 'tag',
        message: 'Select a tag to deploy:',
        choices: tags
      }).then((answers) => {
        return this.deployTag(answers.tag);
      });
    });
  }

  bumpAndTag(type) {
    return execPromise(`git rev-parse --abbrev-ref HEAD`).then((result) => {
      const branch = result.trim()
      if (branch !== 'master') {
        console.log(chalk.yellowBright(`WARNING: You\'re tagging off "${branch}" not "master".`));
        return wait(3, (count) => {
          process.stdout.write(chalk.gray(`Press Ctrl+C to cancel. Resuming in ${count}...`));
          readline.cursorTo(process.stdout, 0);
        }).then(() => {
          readline.clearLine(process.stdout, 0);
        });
      }
    }).then(() => {
      return execPromise(`git status -s`).then((result) => {
        if (result) {
          throw new Error(`Git working directory not clean.\n${result}`);
        }
      });
    }).then(() => {
      return readPackageJSON(this.cwd);
    }).then((app) => {
      return semver.inc(app.version, type);
    }).then((nextVersion) => {
      return execPromise(`git tag -l v${nextVersion}`).then((result) => {
        if (result) {
          throw new Error(`tag 'v${nextVersion}' already exists`);
        }
        return nextVersion;
      });
    }).then((nextVersion) => {
      console.log(chalk.gray(`Bumping to the next ${type} version...`));
      return execPromise(`npm version ${type}`).then(() => {
        return nextVersion;
      });
    }).then((nextVersion) => {
      console.log(chalk.gray(`Pushing to remote...`));
      return execPromise(`git push && git push --tags`).then(() => {
        return nextVersion;
      });
    }).then((nextVersion) => {
      console.log(chalk.whiteBright(`Bumped and tagged version ${chalk.green(nextVersion)}`));
      return `v${nextVersion}`;
    });
  }

  deployTag(tag) {
    console.log(chalk.gray(`Verifying tag...`));
    return execPromise('git ls-remote dokku master').then((result) => {
      const [remoteHash] = result.split(/\s+/);
      return execPromise(`git rev-parse ${tag}~0`).then((result) => {
        const tagHash = result.trim();
        if (remoteHash === tagHash) {
          console.log(chalk.whiteBright(`Tag ${chalk.green(tag)} is already deployed!`));
          process.exit(0);
        }
      });
    }).then(() => {
      return wait(3, (count) => {
        process.stdout.write(chalk.gray(`Deploying tag ${chalk.green(tag)} in ${count}...`));
        readline.cursorTo(process.stdout, 0);
      });
    }).then(() => {
      readline.clearLine(process.stdout, 0);
      console.log(chalk.gray(`Deploying tag ${chalk.green(tag)}...`));

      return spawnPromise(`git push -f dokku ${tag}~0:master`, (data) => {
        process.stdout.write(chalk.gray(data));
      }).catch(() => {
        throw new new Error(`Failed deploying ${tag}`);
      });
    }).then(() => {
      console.log(chalk.whiteBright(`Tag ${chalk.green(tag)} deployed!`));
    });
  }
}

module.exports = DokkuDeploy;
