#!/usr/bin/env node

const program = require("commander")
const { chalk } = require("@vue/cli-shared-utils")
const create = require("../lib/create")

program
  .version(`ghx-cli ${require("../package").version}`)
  .usage("<command> [options]")

program
  .command("create <app-name>")
  .description("创建项目")
  .action((name, options) => {
    console.log(chalk.bold.blue(`Ghx CLI V1.0.0`))
    create(name, options)
  })
program
  .command("pull [project-name]")
  .description("pull my origin project")
  .option("-f,--force", "overwrite target directory if it exists")
  .action((name, cmd) => {
    // 拉取远程项目
    require("../lib/pull/index")(name, cmd)
  })

program.on("--help", () => {
  console.log()
  console.log(
    `  Run ${chalk.yellow(
      `ghx-cli <command> --help`
    )} for detailed usage of given command.`
  )
  console.log()
})

program.parse(process.argv)
