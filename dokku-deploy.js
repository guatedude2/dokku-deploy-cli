const inquirer = require('inquirer');
const readline = require('readline');
const semver = require('semver');
const chalk = require('chalk');
const pkg = require('./package.json');
const {wait, execPromise, spawnPromise, readPackageJSON} = require('./lib/utils');

class DokkuDeploy {
  constructor() {
    this.cwd = process.cwd();
    this.checksPass = false;
  }

  precheck() {
    if (this.checksPass) {
      return Promise.resolve();
    }
    return Promise.resolve().then(() => {
      return execPromise('[ -d .git ] || git rev-parse --git-dir').catch((err) => {
        throw new Error('Not a git repository (or any of the parent directories)');
      });
    }).then(() => {
      return readPackageJSON(this.cwd).catch(() => {
        throw new Error('Not a Node.js project');
      });
    }).then((app) => {
      this.project = app;
      console.log(chalk.magenta('Dokku Deploy CLI'), chalk.gray(`- ${pkg.version}`));
      console.log(chalk.yellow('Project:'), app.name, '-', chalk.cyan(app.version), '\n');
      this.checksPass = true;
    }).then(() => {
      return execPromise('git remote get-url dokku').catch((err) => {
        return this.setup();
      });
    });
  }

  setup(choice) {
    return Promise.resolve().then(() => {
      if (!choice) {
        console.log(chalk.whiteBright('Looks like this repo isn\'t setup to deploy to dokku.'));
        return inquirer.prompt({
          type: 'confirm',
          name: 'choice',
          message: 'Would you like to set it up now?',
          default: true
        });
      }
      return {choice};
    }).then((answer) => {
      if (!answer.choice) {
        process.exit(1);
      }
      const example = chalk.gray(`(e.g ssh://dokku@example.com/${this.project.name || 'my-project'})`);
      return inquirer.prompt({
        type: 'input',
        name: 'url',
        message: `Enter your dokku URL ${example}:`,
      });
    }).then((answer) => {
      console.log(chalk.gray('Setting up dokku remote URL...'));
      return execPromise(`git remote add dokku ${answer.url}`);
    }).then(() => {
      console.log(chalk.whiteBright('done! You can now re-run your command'));
      process.exit(1);
    })
  }

  interactive() {
    return this.precheck().then(() => {
      return inquirer.prompt({
        type: 'list',
        name: 'choice',
        message: 'What would you like to do?',
        choices: [
          { name: 'Bump, Tag & Deploy', value: 'bump-tag-deploy' },
          { name: 'Bump & Tag', value: 'bump-tag' },
          { name: 'Deploy Tag', value: 'deploy' }
        ]
      });
    }).then((answer) => {
      switch (answer.choice) {
        case 'bump-tag-deploy':
          return this.menuBumpTagAndDeploy();
          break;
        case 'bump-tag':
          return this.menuBumpAndTag();
          break;
        case 'deploy':
          return this.menuTagAndDeploy();
          break;
      }
    });
  }

  menuBumpTagAndDeploy() {
    return this.menuBumpAndTag().then((version) => {
      this.deployTag(version);
    })
  }

  menuBumpAndTag() {
    return this.precheck().then(() => {
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
      });
    }).then((answer) => {
      return this.bumpAndTag(answer.bump);
    });
  }

  menuTagAndDeploy() {
    return this.precheck().then(() => {
      return execPromise('git tag -l --sort="-version:refname"').then((raw) => {
        const tags = raw.trim().split('\n');
        return inquirer.prompt({
          type: 'list',
          name: 'tag',
          message: 'Select a tag to deploy:',
          choices: tags
        }).then((answer) => {
          return this.deployTag(answer.tag);
        });
      });
    });
  }

  bumpAndTag(type) {
    return this.precheck().then(() => {
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
      });
    }).then(() => {
      return execPromise(`git status -s`).then((result) => {
        if (result) {
          throw new Error(`Git working directory not clean.\n${result}`);
        }
      });
    }).then(() => {
      return semver.inc(this.project.version, type);
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
      }).catch(() => {
        throw new Error(`"bump-type" argument should be one of ${chalk.bold.whiteBright('<newversion>, major, minor, patch, premajor, preminor, prepatch, prerelease, from-git')}`);
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
    return this.precheck().then(() => {
      return execPromise(`git rev-parse ${tag}~0`).then((result) => {
        return result.trim();
      }).catch(() => {
        throw new Error(`Tag "${tag}" not found`);
      })
    }).then((tagHash) => {
      console.log(chalk.gray(`Verifying tag...`));
      return execPromise('git ls-remote dokku master').then((result) => {
        const [remoteHash] = result.split(/\s+/);
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
