const inquirer = require("inquirer")
const { defaults } = require("./util/preset")
const PromptModuleAPI = require("./PromptModuleAPI")
const { getPromptModules } = require("./util/prompt")
class Creator {
  // 构造函数，初始化
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

    const promptAPI = new PromptModuleAPI(this)

    const promptModules = getPromptModules()
    promptModules.forEach((m) => m(promptAPI))

    // 测试（仅为测试代码，用完需删除）
    inquirer.prompt(this.resolveFinalPrompts()).then((res) => {
      console.log("选择的选项：")
      console.log(res)
    })
  }

  async create(cliOptions = {}, preset = null) {
    // // 处理用户输入
    // const preset = await this.promptAndResolvePreset()
    // // 初始化安装环境
    // await this.initPackageManagerEnv(preset)
    // // 生成项目文件，生成配置文件
    // const generator = await this.generate(preset)
    // // 生成 readme 文件
    // await this.generateReadme(generator)
    // this.finished()
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
    console.log("presetChoices=>", presetChoices)
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
  resolveFinalPrompts() {
    const prompts = [this.presetPrompt, this.featurePrompt]
    return prompts
  }
}

module.exports = Creator
