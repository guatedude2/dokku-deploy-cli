#!/usr/bin/env node
const chalk = require('chalk');
const DokkuDeploy = require('./dokku-deploy');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');
const program = require('commander');
const notifier = updateNotifier({pkg}).notify();

const cmd = new DokkuDeploy();

if (notifier.update) {
  message.push('Update available: ' + chalk.green.bold(notifier.update.latest) + chalk.gray(' (current: ' + notifier.update.current + ')'));
  message.push('Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.');
  console.log(yosay(message.join(' '), {maxLength: stringLength(message[0])}));
}

program
  .version(pkg.version)
  .option('-b, --bump-tag-deploy [bump-type]', 'Bump the version, create tag and deploy [patch])')
  .option('-t, --bump-tag [bump-type]', 'Bump the version and create a tag [patch])')
  .option('-d, --deploy <tag>', 'Deploy an existing tag')
  .option('--setup', 'Run setup on current the git repository');

program.parse(process.argv);

Promise.resolve().then(() => {
  if (program.setup) {
    return cmd.setup(true);
  } else if (program.deploy) {
    return cmd.deployTag(program.deploy);
  } else if (program.bumpTag) {
    return cmd.bumpAndTag(program.bumpTag !== true ? program.bumpTag : 'patch');
  } else if (program.bumpTagDeploy) {
    return cmd.bumpAndTag(program.bumpTagDeploy !== true ? program.bumpTagDeploy : 'patch')
      .then((version) => cmd.deployTag(version));
  } else {
    return cmd.interactive();
  }
}).then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(chalk.red('ERROR:'), err.message || err || 'An unknown error occured' );
  return process.exit(1);
});