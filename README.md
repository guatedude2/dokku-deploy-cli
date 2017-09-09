# Dokku Deploy CLI

A deployment tool for dokku.

## Installation

```bash
npm install -g dokku-deploy
```

## Usage

By default `dokku-deploy` enters interactive mode:

```bash
$ dokku-deploy
Dokku Deploy CLI - 0.0.1
Project: my-node-project - 1.2.3

? What would you like to do?
❯ Bump, Tag & Deploy
  Bump & Tag
  Deploy Tag
```

You can also specify arguments to automate it with scripts:

```bash
$ dokku-deploy -h

  Usage: dokku-deploy [options]


  Options:

    -V, --version                      output the version number
    -b, --bump-tag-deploy [bump-type]  Bump the version, create tag and deploy [patch])
    -t, --bump-tag [bump-type]         Bump the version and create a tag [patch])
    -d, --deploy <tag>                 Deploy an existing tag
    --setup                            Run setup on current the git repository
    -h, --help                         output usage information
```

## Setup

`dokku-deploy` relies on `git remote dokku` to be setup before using the tool. If the remote `dokku`, does not exist it will automatically run setup. This is required in order to use the CLI tool.

```bash
$ dokku-deploy
Dokku Deploy CLI - 0.0.1
Project: my-node-project - 1.2.3

Looks like this repo isn't setup to deploy to dokku.
? Would you like to set it up now? Yes
? Enter your dokku URL (e.g ssh://dokku@example.com/chat-challenge): ssh://dokku@example.com/chat-challenge
Setting up dokku remote URL...
done! You can now re-run your command
```

## Bump Tag & Deploy

Running bump, tag and deploy will prompt for the type of bump to perform before tagging and deploying it to your dokku server.

```bash
$ dokku-deploy
Dokku Deploy CLI - 0.0.1
Project: my-node-project - 1.2.3

? What would you like to do? Bump, Tag & Deploy
? Select the type of bump to perform: Patch
Bumping to the next patch version...
pushing to remote...
Bumped and tagged version 1.2.4
Deploying tag v1.2.4...
-----> Cleaning up...
-----> Building my-project from herokuish...
-----> Adding BUILD_ENV to build environment...
-----> Node.js app detected
...

Tag v1.2.4 deployed!
```

This command can also be ran using the arguments `-b`
or `--bump-tag-deploy` followed by the bump type:

```bash
$ dokku-deploy --bump-tag-deploy major
```

## Bump & Tag

Bump and tag will prompt for the type of bump to perform and create a tag. This is the same as running `npm version <bump-type>` and pushing to your `git` repository.

**This will NOT deploy to your dokku server.**

```bash
$ dokku-deploy
Dokku Deploy CLI - 0.0.1
Project: my-node-project - 1.2.3

? What would you like to do? Bump & Tag
? Select the type of bump to perform: Patch
Bumping to the next patch version...
pushing to remote...
Bumped and tagged version 1.2.4
```

This command can also be ran using the arguments `-t`
or `--bump-tag` followed by the bump type:

```bash
$ dokku-deploy --bump-tag minor
```


## Deploy Tag

Deploy tag lets you deploy any existing tag to your dokku server. It's very useful when you want to roll back to an existing version. Tags will be sorted and  selectable using the arrow keys.

```bash
$ dokku-deploy
Dokku Deploy CLI - 0.0.1
Project: my-node-project - 1.2.3

? What would you like to do? Deploy Tag
? Select a tag to deploy: (Use arrow keys)
❯ v1.2.4
  v1.2.3
  v1.2.2
  v1.2.1
```

This command can also be ran using the arguments `-d`
or `--deploy` followed by the tag name:

```bash
$ dokku-deploy --deploy v1.2.4
```

## Contribution and Bug Reports

If you have any issues please [submit a bug](https://github.com/guatedude2/dokku-deploy-cli/issues/new) or feel free to fork the repo and [create a PR](https://github.com/guatedude2/dokku-deploy-cli/pulls).