const chalk = require('chalk');
const DokkuDeploy = require('./lib/dokku-deploy');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');

const notifier = updateNotifier({pkg}).notify();

if (notifier.update) {
  message.push('Update available: ' + chalk.green.bold(notifier.update.latest) + chalk.gray(' (current: ' + notifier.update.current + ')'));
  message.push('Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.');
  console.log(yosay(message.join(' '), {maxLength: stringLength(message[0])}));
}

(new DokkuDeploy()).init().then(() => {
  process.exit(0);
}).catch((err) => {
  console.log('');
  console.error(chalk.red('ERROR:'), err.message);
  return process.exit(1);
});
