# lint-fix-nodemon

> Watch your files and run ESLint + fix + nodemon on save

**WHY DO YOU NEED THIS?**

1. Avoid a double restart when eslint fixes your files (nodemon would normally detect the initial change and then the fix change)
2. Don't get stuck if linting or starting the server fails - we just keep watching and trying again on each save

### Installation
`npm install lint-fix-nodemon --save-dev` or `yarn add lint-fix-nodemon -D`

### Setup
You can run it with `npx lint-fix-nodemon` or normally you should just add a script to your package.json file.

_I usually name it "dev" (`"dev": "lint-fix-nodemon"`) so you can run `npm run dev`_

### Configuration

By default, it will assume nodemon should run the script specified as your "main" in your package.json file.
Otherwise you can also pass it in as an argument -- for example: `lint-fix-nodemon ./api/start.js`

Other configuration in terms of what files to watch and lint will be read from the [nodemonConfig](https://github.com/remy/nodemon#packagejson) entry in your package.json file

It will automatically ignore your node_modules folder and any files/folders that start with "."


### An example package.json file
```
{
  ...
  "scripts": {
    "dev": "lint-fix-nodemon api/start.js",
    ...
  },
  "nodemonConfig": {
    watch: ["api/"],
    ignore: ["api/scripts"],
    // optional execute script, for example to use babel-node    
    "exec": "babel-node api/start.js"
  },
  ...
}
```