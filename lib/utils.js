const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      resolve(stdout);
    });
  });
};

const spawnPromise = (command, dataCallback) => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args);

    if (typeof dataCallback === 'function') {
      proc.stdout.on('data', dataCallback);
      proc.stderr.on('data', dataCallback);
    }

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        accept();
      }
    });
  });
};

const wait = (delay, tick) => {
  return new Promise((resolve) => {
    let count = delay;
    const counter = () => {
      if (typeof tick === 'function') {
        tick(count);
      }
      if (count > 0) {
        count--;
        return setTimeout(counter, 800);
      }
      resolve();
    };
    counter()
  });
};

const readPackageJSON = (basePath) => {
  return new Promise((resolve, reject) => {
    if (!basePath){
      return reject(new Error('No package.json found'));
    }
    fs.readFile(`${basePath}/package.json`, {encoding: 'utf8'}, (err, data) => {
      if (err) {
        if (basePath.lastIndexOf('/') > 0) {
          return resolve(readPackageJSON(path.dirname(basePath)));
        }
        return reject(err);
      }
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = {
  execPromise,
  spawnPromise,
  wait,
  readPackageJSON
}
