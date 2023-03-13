const inquirer = require("inquirer")
const {
  chalk,
  log,
  hasGit,
  hasProjectGit,
  execa,
  loadModule,
} = require("@vue/cli-shared-utils")
const PromptModuleAPI = require("./PromptModuleAPI")
const PackageManager = require("./PackageManager")
const Generator = require("./Generator.js")
const { defaults } = require("./util/preset")
const { vuePresets } = require("./util/preset")
const { getPromptModules } = require("./util/prompt")
const { writeFileTree, sortObject, generateReadme } = require("./util/util.js")

class Creator {
  constructor(name, context) {
    // 项目名称
    this.name = name
    // 项目路径，含名称
    this.context = process.env.VUE_CLI_CONTEXT = context
    // package.json 数据
    this.pkg = {}
    // 包管理工具
    this.pm = null
    // 预设提示选项
    this.presetPrompt = this.resolvePresetPrompts()
    // 自定义特性提示选项（复选框）
    this.featurePrompt = this.resolveFeaturePrompts()
    // 保存相关提示选项
    this.outroPrompts = this.resolveOutroPrompts()
    // 其他提示选项
    this.injectedPrompts = []
    // 回调
    this.promptCompleteCbs = []
    //获取预设 返回的是函数
    const promptModules = getPromptModules()
    debugger
    const promptAPI = new PromptModuleAPI(this)

    promptModules.forEach((m) => m(promptAPI))

    // 测试（仅为测试代码，用完需删除）
    // inquirer.prompt(this.resolveFinalPrompts()).then(res => {
    //   console.log('选择的选项：')
    //   console.log(res)
    // })
  }

  async create() {
    //处理用户输入
    const preset = await this.promptAndResolvePreset()
    // 初始化安装环境
    await this.initPackageManagerEnv(preset)
    //  生成项目文件，生成配置文件
    const generator = await this.generate(preset)
    // 生成 readme 文件
    await this.generateReadme(generator)
    this.finished()

    // 测试（仅为测试代码，用完需删除）
    // console.log('preset 值：')
    // console.log(preset);
  }

  // 获得预设的选项
  resolvePresetPrompts() {
    const presetChoices = Object.entries(defaults.presets).map(
      ([name, preset]) => {
        return {
          name: `${name}(${Object.keys(preset.plugins).join(",")})`, // 将预设的插件放到提示
          value: name,
        }
      }
    )

    return {
      name: "preset", // preset 记录用户选择的选项值。
      type: "list", // list 表单选
      message: `Please pick a preset:`,
      choices: [
        ...presetChoices, // Vue2 默认配置，Vue3 默认配置
        {
          name: "Manually select features", // 手动选择配置，自定义特性配置
          value: "__manual__",
        },
      ],
    }
  }

  resolveFinalPrompts() {
    const prompts = [
      this.presetPrompt,
      this.featurePrompt,
      ...this.outroPrompts,
      ...this.injectedPrompts,
    ]
    return prompts
  }

  // 自定义特性复选框
  resolveFeaturePrompts() {
    return {
      name: "features", // features 记录用户选择的选项值。
      when: (answers) => answers.preset === "__manual__", // 当选择"Manually select features"时，该提示显示
      type: "checkbox",
      message: "Check the features needed for your project:",
      choices: [], // 复选框值，待补充
      pageSize: 10,
    }
  }

  // 保存相关提示选项
  resolveOutroPrompts() {
    const outroPrompts = [
      // useConfigFiles 是单选框提示选项。
      {
        name: "useConfigFiles",
        when: (answers) => answers.preset === "__manual__",
        type: "list",
        message: "Where do you prefer placing config for Babel, ESLint, etc.?",
        choices: [
          {
            name: "In dedicated config files",
            value: "files",
          },
          {
            name: "In package.json",
            value: "pkg",
          },
        ],
      },
      // 确认提示选项
      {
        name: "save",
        when: (answers) => answers.preset === "__manual__",
        type: "confirm",
        message: "Save this as a preset for future projects?",
        default: false,
      },
      // 输入提示选项
      {
        name: "saveName",
        when: (answers) => answers.save,
        type: "input",
        message: "Save preset as:",
      },
    ]
    return outroPrompts
  }

  async promptAndResolvePreset() {
    try {
      let preset
      const { name } = this
      const answers = await inquirer.prompt(this.resolveFinalPrompts())

      // answers 得到的值为 { preset: 'Default (Vue 2)' }

      if (answers.preset && answers.preset === "Default (Vue 2)") {
        if (answers.preset in vuePresets) {
          preset = vuePresets[answers.preset]
        }
      } else if (answers.preset && answers.preset === "__manual__") {
        preset = {
          //如果是手工选项的
          plugins: {}, //默认没有任何插件
        }
        answers.features = answers.features || []
        this.promptCompleteCbs.forEach((cb) => cb(answers, preset))
      } else {
        // 暂不支持 Vue3、自定义特性配置情况
        throw new Error("哎呀，出错了，暂不支持 Vue3、自定义特性配置情况")
      }

      // 添加 projectName 属性
      preset.plugins["@vue/cli-service"] = Object.assign(
        {
          projectName: name,
        },
        preset
      )

      return preset
    } catch (err) {
      console.log(chalk.red(err))
      process.exit(1)
    }
  }

  async initPackageManagerEnv(preset) {
    const { name, context } = this
    this.pm = new PackageManager({ context })

    // 打印提示
    log(`✨ 创建项目：${chalk.yellow(context)}`)

    // 用于生成 package.json 文件
    const pkg = {
      name,
      version: "0.1.0",
      private: true,
      devDependencies: {},
    }

    // 给 npm 包指定版本，简单做，使用最新的版本
    const deps = Object.keys(preset.plugins)
    deps.forEach((dep) => {
      let { version } = preset.plugins[dep]
      if (!version) {
        version = "latest"
      }
      pkg.devDependencies[dep] = version
    })

    this.pkg = pkg

    // 写 package.json 文件
    await writeFileTree(context, {
      "package.json": JSON.stringify(pkg, null, 2),
    })

    // 初始化 git 仓库，以至于 vue-cli-service 可以设置 git hooks
    const shouldInitGit = this.shouldInitGit()
    if (shouldInitGit) {
      log(`🗃 初始化 Git 仓库...`)
      await this.run("git init")
    }

    // 安装插件 plugins
    log(`⚙ 正在安装 CLI plugins. 请稍候...`)

    await this.pm.install()
  }

  run(command, args) {
    if (!args) {
      ;[command, ...args] = command.split(/\s+/)
    }
    return execa(command, args, { cwd: this.context })
  }

  // 判断是否可以初始化 git 仓库：系统安装了 git 且目录下未初始化过，则初始化
  shouldInitGit() {
    if (!hasGit()) {
      // 系统未安装 git
      return false
    }

    // 项目未初始化 Git
    return !hasProjectGit(this.context)
  }

  async generate(preset) {
    // 打印
    log(`🚀 准备相关文件...`)
    const { pkg, context } = this

    const plugins = await this.resolvePlugins(preset.plugins, pkg)

    const generator = new Generator(context, {
      pkg,
      plugins,
    })

    // 赋值模板 start
    await generator.generate({
      extractConfigFiles: preset.useConfigFiles, // false
    })
    log(`🚀 相关文件已写入磁盘！`)

    await this.pm.install()

    return generator
  }

  async resolvePlugins(rawPlugins) {
    // 插件排序，@vue/cli-service 排第1个
    rawPlugins = sortObject(rawPlugins, ["@vue/cli-service"], true)
    const plugins = []

    for (const id of Object.keys(rawPlugins)) {
      // require('@vue/cli-service/generator')
      // require('@vue/cli-plugin-babel/generator')
      // require('@vue/cli-plugin-eslint/generator')
      const apply = loadModule(`${id}/generator`, this.context) || (() => {})
      let options = rawPlugins[id] || {}
      plugins.push({ id, apply, options })
    }

    return plugins
  }

  async generateReadme(generator) {
    log()
    log("📄 正在生成 README.md...")
    const { context } = this
    await writeFileTree(context, {
      "README.md": generateReadme(generator.pkg),
    })
  }

  finished() {
    const { name } = this
    log(`🎉 成功创建项目 ${chalk.yellow(name)}.`)
    log(
      `👉 用以下命令启动项目 :\n\n` +
        chalk.cyan(`cd ${name}\n`) +
        chalk.cyan(`npm run serve`)
    )
  }
}

module.exports = Creator
